import base64
import csv
import http.cookiejar
import json
import os
import tempfile
import threading
import unittest
from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from unittest.mock import patch

import server
from pypdf import PdfReader


class AgencyApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = server.DB_PATH
        self.original_send_email = server.send_lesson_email
        self.original_send_credentials = server.send_tutor_credentials_email
        self.original_send_password_reset = server.send_password_reset_email
        server.DB_PATH = Path(self.temp_dir.name) / "agency.sqlite3"
        server.init_db()
        self.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"
        self.opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        server.DB_PATH = self.original_db_path
        server.send_lesson_email = self.original_send_email
        server.send_tutor_credentials_email = self.original_send_credentials
        server.send_password_reset_email = self.original_send_password_reset
        self.temp_dir.cleanup()

    def api(self, path, method="GET", body=None, opener=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        with (opener or self.opener).open(request) as response:
            return response.status, json.loads(response.read().decode("utf-8"))

    def login_as_master(self):
        self.api(
            "/api/setup",
            "POST",
            {"name": "Agency Owner", "email": "owner@example.com", "password": "password123"},
        )
        status, result = self.api(
            "/api/login",
            "POST",
            {"email": "owner@example.com", "password": "password123"},
        )
        self.assertEqual(status, 200)
        return result["user"]

    def test_health_and_authentication(self):
        _, business = self.api("/api/business")
        self.assertEqual(business["business_name"], "SWL Education Ltd")
        self.assertEqual(set(business), {"business_name", "app_name", "workspace_name", "personal_workspace"})
        status, health = self.api("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(health["status"], "ok")
        self.assertEqual(health["database"], "sqlite")
        user = self.login_as_master()
        self.assertEqual(user["role"], "Master")
        _, session = self.api("/api/session")
        self.assertEqual(session["user"]["email"], "owner@example.com")

    def test_tutor_documents_are_master_only_and_support_record_only_dbs(self):
        self.login_as_master()
        server.send_tutor_credentials_email = lambda *_args, **_kwargs: "message-id"
        _, created = self.api(
            "/api/users",
            "POST",
            {"name": "Secure Tutor", "email": "secure@example.com", "hourly_rate": 45},
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["email"] == "secure@example.com")

        pdf_content = b"%PDF-1.4\n% tutor terms\n%%EOF"
        _, uploaded = self.api(
            "/api/tutor-documents",
            "POST",
            {
                "tutor_id": tutor["user_id"],
                "document_type": "Signed terms",
                "reference": "TERMS-2026",
                "filename": "signed-terms.pdf",
                "content_type": "application/pdf",
                "file_data": base64.b64encode(pdf_content).decode("ascii"),
                "expires_on": "2027-08-25",
                "notes": "Signed electronically",
            },
        )
        self.assertTrue(uploaded["ok"])
        self.api(
            "/api/tutor-documents",
            "POST",
            {
                "tutor_id": tutor["user_id"],
                "document_type": "DBS check record",
                "reference": "DBS-REFERENCE-ONLY",
                "notes": "Enhanced check reviewed; recruitment approved.",
            },
        )
        with self.assertRaises(HTTPError) as dbs_upload_error:
            self.api(
                "/api/tutor-documents",
                "POST",
                {
                    "tutor_id": tutor["user_id"],
                    "document_type": "DBS check record",
                    "filename": "dbs-certificate.pdf",
                    "content_type": "application/pdf",
                    "file_data": base64.b64encode(pdf_content).decode("ascii"),
                },
            )
        self.assertEqual(dbs_upload_error.exception.code, 400)

        _, register = self.api(f"/api/tutor-documents?tutor_id={tutor['user_id']}")
        self.assertEqual(len(register["documents"]), 2)
        terms = next(item for item in register["documents"] if item["document_type"] == "Signed terms")
        dbs_record = next(item for item in register["documents"] if item["document_type"] == "DBS check record")
        self.assertTrue(terms["has_file"])
        self.assertFalse(dbs_record["has_file"])
        self.assertNotIn("file_data", terms)

        download = Request(self.base_url + f"/api/tutor-documents/{terms['document_id']}/download")
        with self.opener.open(download) as response:
            self.assertEqual(response.read(), pdf_content)
            self.assertEqual(response.headers.get_content_type(), "application/pdf")
            self.assertIn("signed-terms.pdf", response.headers["Content-Disposition"])

        tutor_opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.api(
            "/api/login",
            "POST",
            {"email": "secure@example.com", "password": created["temporary_password"]},
            opener=tutor_opener,
        )
        with self.assertRaises(HTTPError) as list_error:
            self.api(f"/api/tutor-documents?tutor_id={tutor['user_id']}", opener=tutor_opener)
        self.assertEqual(list_error.exception.code, 403)
        with self.assertRaises(HTTPError) as download_error:
            tutor_opener.open(Request(self.base_url + f"/api/tutor-documents/{terms['document_id']}/download"))
        self.assertEqual(download_error.exception.code, 403)

        self.api(f"/api/tutor-documents/{terms['document_id']}/delete", "POST", {})
        _, after_delete = self.api(f"/api/tutor-documents?tutor_id={tutor['user_id']}")
        self.assertEqual(len(after_delete["documents"]), 1)

    def test_completing_a_lesson_sends_postmark_email(self):
        user = self.login_as_master()
        self.api(
            "/api/students",
            "POST",
            {
                "student_name": "Ada Student",
                "parent_name": "Pat Parent",
                "parent_email": "parent@example.com; second@example.com",
            },
        )
        _, students = self.api("/api/students")
        student_id = students["students"][0]["student_id"]
        start_at = datetime.now().replace(day=15, hour=16, minute=0, second=0, microsecond=0).isoformat()
        self.api(
            "/api/bookings",
            "POST",
            {
                "student_id": student_id,
                "tutor_id": user["user_id"],
                "start_at": start_at,
                "duration_minutes": 60,
            },
        )
        _, bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        booking_id = bookings["bookings"][0]["booking_id"]
        calls = []

        def fake_send(recipient, student_name, summary, reply_to=""):
            calls.append((recipient, student_name, summary, reply_to))
            return "postmark-message-id"

        server.send_lesson_email = fake_send
        _, result = self.api(
            f"/api/bookings/{booking_id}/complete",
            "POST",
            {
                "attendance_status": "Completed",
                "parent_summary": "Excellent progress today.",
                "emailed_to_parent": True,
            },
        )
        self.assertTrue(result["email_sent"])
        self.assertEqual(result["postmark_message_id"], "postmark-message-id")
        self.assertEqual(calls[0][0], "parent@example.com, second@example.com")
        with server.db() as connection:
            lesson = connection.execute(
                "SELECT emailed_to_parent FROM lesson_records WHERE booking_id = ?", (booking_id,)
            ).fetchone()
        self.assertEqual(lesson["emailed_to_parent"], 1)
        _, updated_bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        updated = updated_bookings["bookings"][0]
        self.assertEqual(updated["parent_summary"], "Excellent progress today.")
        self.assertEqual(updated["attendance_status"], "Completed")

    def test_timesheet_can_order_lessons_by_date_or_group_by_student(self):
        user = self.login_as_master()
        for student_name in ("Zulu Student", "Alpha Student"):
            self.api(
                "/api/students",
                "POST",
                {
                    "student_name": student_name,
                    "parent_email": f"{student_name.split()[0].lower()}@example.com",
                    "hourly_rate": 60,
                    "tutor_hourly_rate": 40,
                },
            )
        _, students = self.api("/api/students")
        student_ids = {student["student_name"]: student["student_id"] for student in students["students"]}
        month = datetime.now().strftime("%Y-%m")
        lesson_specs = (
            ("Zulu Student", f"{month}-02T16:00:00"),
            ("Alpha Student", f"{month}-01T16:00:00"),
            ("Alpha Student", f"{month}-03T16:00:00"),
        )
        for student_name, start_at in lesson_specs:
            self.api(
                "/api/bookings",
                "POST",
                {
                    "student_id": student_ids[student_name],
                    "tutor_id": user["user_id"],
                    "start_at": start_at,
                    "duration_minutes": 60,
                },
            )
        _, bookings = self.api(f"/api/bookings?month={month}")
        for booking in bookings["bookings"]:
            self.api(
                f"/api/bookings/{booking['booking_id']}/complete",
                "POST",
                {"attendance_status": "Completed", "parent_summary": "", "emailed_to_parent": False},
            )

        _, by_date = self.api(f"/api/timesheet?month={month}&order=date")
        self.assertEqual(
            [lesson["student_name"] for lesson in by_date["lessons"]],
            ["Alpha Student", "Zulu Student", "Alpha Student"],
        )
        _, by_student = self.api(f"/api/timesheet?month={month}&order=student")
        self.assertEqual(
            [lesson["student_name"] for lesson in by_student["lessons"]],
            ["Alpha Student", "Alpha Student", "Zulu Student"],
        )
        self.assertLess(by_student["lessons"][0]["start_at"], by_student["lessons"][1]["start_at"])

        csv_request = Request(self.base_url + f"/api/timesheet?month={month}&order=student&format=csv")
        with self.opener.open(csv_request) as response:
            self.assertIn(f"timesheet-{month}-agency-owner.csv", response.headers["Content-Disposition"])
            spreadsheet_rows = list(csv.DictReader(StringIO(response.read().decode("utf-8-sig"))))
        self.assertEqual(
            list(spreadsheet_rows[0]),
            ["Date", "Student", "Lesson length", "Time", "Amount (£)"],
        )
        self.assertEqual(
            [row["Student"] for row in spreadsheet_rows],
            ["Alpha Student", "Alpha Student", "Zulu Student"],
        )
        self.assertEqual(spreadsheet_rows[0]["Date"], f"01/{month[5:7]}/{month[:4]}")
        self.assertEqual(spreadsheet_rows[0]["Time"], "16:00")
        self.assertEqual(spreadsheet_rows[0]["Lesson length"], "60 minutes")
        self.assertEqual(spreadsheet_rows[0]["Amount (£)"], "40.00")

        pdf_request = Request(self.base_url + f"/api/timesheet?month={month}&order=student&format=pdf")
        with self.opener.open(pdf_request) as response:
            pdf_text = "\n".join(
                page.extract_text() or "" for page in PdfReader(BytesIO(response.read())).pages
            )
        self.assertLess(pdf_text.find("Alpha Student"), pdf_text.find("Zulu Student"))

        with self.assertRaises(HTTPError) as invalid_order:
            self.api(f"/api/timesheet?month={month}&order=unknown")
        self.assertEqual(invalid_order.exception.code, 400)

    def test_personal_owner_teaches_without_duplicate_tutor_cost(self):
        user = self.login_as_master()
        payload = {"student_name": "Personal Student", "parent_email": "parent@example.com",
                   "assigned_tutor_id": user["user_id"], "hourly_rate": 100, "tutor_hourly_rate": 80}
        # The agency must not gain the personal assignment behaviour.
        with self.assertRaises(HTTPError) as error:
            self.api("/api/students", "POST", payload)
        self.assertEqual(error.exception.code, 400)
        with patch.object(server, "PERSONAL_WORKSPACE", True):
            with self.assertRaises(HTTPError) as tutor_error:
                self.api("/api/users", "POST", {"name": "Not Allowed", "email": "other@example.com"})
            self.assertEqual(tutor_error.exception.code, 404)
            self.api("/api/students", "POST", payload)
            _, result = self.api("/api/students")
            student_id = result["students"][0]["student_id"]
            self.api(f"/api/students/{student_id}/update", "POST", payload)
            start_at = datetime.now().replace(day=15, hour=16, minute=0, second=0, microsecond=0).isoformat()
            self.api("/api/bookings", "POST", {"student_id": student_id, "tutor_id": user["user_id"],
                     "start_at": start_at, "duration_minutes": 60})
            _, result = self.api(f"/api/bookings?month={start_at[:7]}")
            booking_id = result["bookings"][0]["booking_id"]
            self.api(f"/api/bookings/{booking_id}/complete", "POST",
                     {"attendance_status": "Completed", "parent_summary": "Personal lesson", "emailed_to_parent": False})
            with server.db() as conn:
                record = conn.execute("SELECT * FROM lesson_records WHERE booking_id = ?", (booking_id,)).fetchone()
            self.assertEqual(record["client_hourly_rate"], 100)
            self.assertEqual(record["tutor_hourly_rate"], 0)
            _, result = self.api(f"/api/finance/summary?period=month&anchor={start_at[:10]}")
            self.assertEqual(result["summary"]["gross_income"], 100)
            self.assertEqual(result["summary"]["tutor_costs"], 0)
            _, timesheet = self.api(f"/api/timesheet?month={start_at[:7]}&tutor_id=999999")
            self.assertEqual(len(timesheet["lessons"]), 1)
            self.assertEqual(timesheet["lessons"][0]["tutor_rate"], 100)
            for path, request_payload in (
                (f"/api/students/{student_id}/remove", {"mode": "unassign"}),
                ("/api/timesheet/submit", {"month": start_at[:7]}),
                ("/api/timesheet/status", {"month": start_at[:7], "tutor_id": user["user_id"], "status": "Approved"}),
            ):
                with self.assertRaises(HTTPError) as unavailable:
                    self.api(path, "POST", request_payload)
                self.assertIn(unavailable.exception.code, {400, 404})


    def test_tutor_creation_and_password_reset_send_credentials(self):
        self.login_as_master()
        calls = []

        def fake_send(recipient, tutor_name, temporary_password, reply_to="", reset=False):
            calls.append(
                {
                    "recipient": recipient,
                    "tutor_name": tutor_name,
                    "temporary_password": temporary_password,
                    "reply_to": reply_to,
                    "reset": reset,
                }
            )
            return "credentials-message-id"

        server.send_tutor_credentials_email = fake_send
        _, created = self.api(
            "/api/users",
            "POST",
            {"name": "Test Tutor", "email": "tutor@example.com", "hourly_rate": 40},
        )
        self.assertTrue(created["email_sent"])
        self.assertEqual(calls[0]["recipient"], "tutor@example.com")
        self.assertFalse(calls[0]["reset"])

        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["role"] == "Tutor")
        _, reset = self.api(f"/api/users/{tutor['user_id']}/reset-password", "POST", {})
        self.assertTrue(reset["email_sent"])
        self.assertTrue(calls[1]["reset"])
        self.assertNotEqual(calls[0]["temporary_password"], calls[1]["temporary_password"])

        _, inactive = self.api(
            f"/api/users/{tutor['user_id']}/status", "POST", {"active": False}
        )
        self.assertFalse(inactive["active"])
        _, active = self.api(
            f"/api/users/{tutor['user_id']}/status", "POST", {"active": True}
        )
        self.assertTrue(active["active"])

        self.api(
            "/api/students",
            "POST",
            {
                "student_name": "Assigned Student",
                "parent_name": "Parent",
                "parent_email": "parent@example.com",
                "assigned_tutor_id": tutor["user_id"],
            },
        )
        _, removed = self.api(f"/api/users/{tutor['user_id']}/delete", "POST", {})
        self.assertEqual(removed["unassigned_students"], 1)
        _, students = self.api("/api/students")
        self.assertIsNone(students["students"][0]["assigned_tutor_id"])

    def test_tutor_can_reset_a_forgotten_password_by_emailed_link(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users",
            "POST",
            {"name": "Reset Link Tutor", "email": "reset-link@example.com", "hourly_rate": 40},
        )
        reset_messages = []

        def fake_reset_email(recipient, account_name, reset_token):
            reset_messages.append((recipient, account_name, reset_token))
            return "reset-message-id"

        server.send_password_reset_email = fake_reset_email
        _, requested = self.api(
            "/api/password-reset/request",
            "POST",
            {"email": "reset-link@example.com"},
        )
        self.assertTrue(requested["ok"])
        self.assertEqual(reset_messages[0][0], "reset-link@example.com")
        reset_token = reset_messages[0][2]

        self.api(
            "/api/password-reset/complete",
            "POST",
            {"token": reset_token, "new_password": "new-password-123"},
        )
        tutor_opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, login = self.api(
            "/api/login",
            "POST",
            {"email": "reset-link@example.com", "password": "new-password-123"},
            opener=tutor_opener,
        )
        self.assertEqual(status, 200)
        self.assertEqual(login["user"]["role"], "Tutor")
        with self.assertRaises(HTTPError) as reused:
            self.api(
                "/api/password-reset/complete",
                "POST",
                {"token": reset_token, "new_password": "another-password-123"},
            )
        self.assertEqual(reused.exception.code, 400)

        _, unknown = self.api(
            "/api/password-reset/request",
            "POST",
            {"email": "unknown@example.com"},
        )
        self.assertEqual(unknown["message"], requested["message"])
        self.assertEqual(len(reset_messages), 1)

    def test_tutor_with_booking_history_cannot_be_removed(self):
        self.login_as_master()
        self.api(
            "/api/users",
            "POST",
            {"name": "Historic Tutor", "email": "historic@example.com", "hourly_rate": 45},
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["role"] == "Tutor")
        self.api(
            "/api/students",
            "POST",
            {"student_name": "Historic Student", "assigned_tutor_id": tutor["user_id"]},
        )
        _, students = self.api("/api/students")
        start_at = datetime.now().replace(day=16, hour=16, minute=0, second=0, microsecond=0).isoformat()
        self.api(
            "/api/bookings",
            "POST",
            {
                "student_id": students["students"][0]["student_id"],
                "tutor_id": tutor["user_id"],
                "start_at": start_at,
                "duration_minutes": 60,
            },
        )
        with self.assertRaises(HTTPError) as raised:
            self.api(f"/api/users/{tutor['user_id']}/delete", "POST", {})
        self.assertEqual(raised.exception.code, 409)
        error = json.loads(raised.exception.read().decode("utf-8"))
        self.assertIn("cannot be removed", error["error"])

    def test_tutor_only_receives_own_pay_rate(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users",
            "POST",
            {"name": "Private Rate Tutor", "email": "private@example.com", "hourly_rate": 40},
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["role"] == "Tutor")
        self.api(
            "/api/students",
            "POST",
            {
                "student_name": "Private Rate Student",
                "parent_email": "parent@example.com",
                "hourly_rate": 80,
                "tutor_hourly_rate": 50,
                "assigned_tutor_id": tutor["user_id"],
            },
        )
        _, students = self.api("/api/students")
        student_id = students["students"][0]["student_id"]
        start_at = datetime.now().replace(day=17, hour=16, minute=0, second=0, microsecond=0).isoformat()
        self.api(
            "/api/bookings",
            "POST",
            {
                "student_id": student_id,
                "tutor_id": tutor["user_id"],
                "start_at": start_at,
                "duration_minutes": 60,
            },
        )
        _, bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        booking_id = bookings["bookings"][0]["booking_id"]
        self.api(
            f"/api/bookings/{booking_id}/complete",
            "POST",
            {"parent_summary": "A saved lesson note.", "emailed_to_parent": False},
        )

        tutor_opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.api(
            "/api/login",
            "POST",
            {"email": "private@example.com", "password": created["temporary_password"]},
            opener=tutor_opener,
        )
        _, tutor_students = self.api("/api/students", opener=tutor_opener)
        self.assertNotIn("hourly_rate", tutor_students["students"][0])
        self.assertNotIn("tutor_hourly_rate", tutor_students["students"][0])
        self.assertEqual(tutor_students["students"][0]["tutor_rate"], 50)
        _, timesheet = self.api(
            f"/api/timesheet?month={start_at[:7]}", opener=tutor_opener
        )
        self.assertEqual(timesheet["lessons"][0]["tutor_rate"], 50)
        self.assertNotIn("student_rate", timesheet["lessons"][0])
        pdf_request = Request(
            self.base_url + f"/api/timesheet?month={start_at[:7]}&format=pdf",
            method="GET",
        )
        with tutor_opener.open(pdf_request) as response:
            pdf = response.read()
            self.assertEqual(response.headers.get_content_type(), "application/pdf")
        pdf_text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf)).pages)
        self.assertIn("SWL EDUCATION LTD", pdf_text)
        self.assertIn("Private Rate Tutor", pdf_text)
        self.assertIn("GBP 50.00", pdf_text)
        self.assertNotIn("GBP 80.00", pdf_text)
        _, tutor_report = self.api(
            f"/api/reports/lessons?month={start_at[:7]}", opener=tutor_opener
        )
        self.assertEqual(tutor_report["lessons"][0]["tutor_rate"], 50)
        self.assertNotIn("student_rate", tutor_report["lessons"][0])

        _, master_report = self.api(f"/api/reports/lessons?month={start_at[:7]}")
        self.assertEqual(master_report["lessons"][0]["student_rate"], 80)
        self.assertEqual(master_report["lessons"][0]["tutor_rate"], 50)
        _, filtered_report = self.api(
            f"/api/reports/lessons?start={start_at[:10]}&end={start_at[:10]}&tutor_id={tutor['user_id']}&student_id={student_id}"
        )
        self.assertEqual(len(filtered_report["lessons"]), 1)
        _, empty_filtered_report = self.api(
            f"/api/reports/lessons?start={start_at[:10]}&end={start_at[:10]}&tutor_id=999999"
        )
        self.assertEqual(empty_filtered_report["lessons"], [])

        master_csv_request = Request(
            self.base_url + f"/api/reports/lessons?month={start_at[:7]}&format=csv",
            method="GET",
        )
        with self.opener.open(master_csv_request) as response:
            master_csv = response.read().decode("utf-8-sig")
            self.assertEqual(response.headers.get_content_type(), "text/csv")
        self.assertIn("Client Hourly Rate,Amount Charged,Tutor Hourly Rate,Tutor Pay,Agency Gross Margin", master_csv)
        self.assertIn("80.0,80.0,50.0,50.0,30.0", master_csv)
        self.assertIn("MONTH TOTAL,,,,,80.0,,50.0,30.0", master_csv)

        tutor_csv_request = Request(
            self.base_url + f"/api/reports/lessons?month={start_at[:7]}&format=csv",
            method="GET",
        )
        with tutor_opener.open(tutor_csv_request) as response:
            tutor_csv = response.read().decode("utf-8-sig")
        self.assertNotIn("Client Hourly Rate", tutor_csv)
        self.assertNotIn("Amount Charged", tutor_csv)

    def test_student_can_be_unassigned_archived_or_permanently_deleted(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users", "POST", {"name": "Removal Tutor", "email": "remove@example.com", "hourly_rate": 35}
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["role"] == "Tutor")
        self.api(
            "/api/students",
            "POST",
            {"student_name": "Removal Student", "assigned_tutor_id": tutor["user_id"]},
        )
        _, student_data = self.api("/api/students")
        student_id = student_data["students"][0]["student_id"]

        self.api(f"/api/students/{student_id}/remove", "POST", {"mode": "unassign"})
        _, student_data = self.api("/api/students")
        self.assertIsNone(student_data["students"][0]["assigned_tutor_id"])
        self.assertEqual(student_data["students"][0]["active"], 1)

        self.api(
            f"/api/students/{student_id}/update",
            "POST",
            {
                "student_name": "Removal Student",
                "assigned_tutor_id": tutor["user_id"],
                "tutor_hourly_rate": 47,
                "active": True,
            },
        )
        _, reassigned = self.api("/api/students")
        self.assertEqual(reassigned["students"][0]["assigned_tutor_id"], tutor["user_id"])
        self.assertEqual(reassigned["students"][0]["tutor_hourly_rate"], 47)
        start_at = datetime.now().replace(day=18, hour=16, minute=0, second=0, microsecond=0).isoformat()
        self.api(
            "/api/bookings",
            "POST",
            {"student_id": student_id, "tutor_id": tutor["user_id"], "start_at": start_at, "duration_minutes": 60},
        )
        _, bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        self.api(
            f"/api/bookings/{bookings['bookings'][0]['booking_id']}/complete",
            "POST",
            {"parent_summary": "Retained note", "emailed_to_parent": False},
        )

        self.api(f"/api/students/{student_id}/remove", "POST", {"mode": "archive"})
        _, archived = self.api("/api/students")
        self.assertEqual(archived["students"][0]["active"], 0)
        self.assertIsNone(archived["students"][0]["assigned_tutor_id"])
        with server.db() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) AS count FROM bookings").fetchone()["count"], 1)
            self.assertEqual(connection.execute("SELECT COUNT(*) AS count FROM lesson_records").fetchone()["count"], 1)

        _, deleted = self.api(f"/api/students/{student_id}/remove", "POST", {"mode": "delete"})
        self.assertEqual(deleted["deleted_bookings"], 1)
        self.assertEqual(deleted["deleted_lesson_records"], 1)
        _, remaining = self.api("/api/students")
        self.assertEqual(remaining["students"], [])

    def test_master_finance_reports_expenses_snapshots_and_vat_are_private(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users", "POST", {"name": "Finance Tutor", "email": "finance@example.com", "hourly_rate": 40}
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["role"] == "Tutor")
        self.api(
            "/api/students",
            "POST",
            {
                "student_name": "Finance Student",
                "parent_email": "one@example.com, two@example.com",
                "hourly_rate": 80,
                "assigned_tutor_id": tutor["user_id"],
            },
        )
        _, student_data = self.api("/api/students")
        student = student_data["students"][0]
        start_at = datetime.now().replace(day=19, hour=16, minute=0, second=0, microsecond=0).isoformat()
        self.api(
            "/api/bookings",
            "POST",
            {"student_id": student["student_id"], "tutor_id": tutor["user_id"], "start_at": start_at, "duration_minutes": 90},
        )
        _, bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        self.api(
            f"/api/bookings/{bookings['bookings'][0]['booking_id']}/complete",
            "POST",
            {"parent_summary": "Finance note", "emailed_to_parent": False},
        )

        self.api(
            f"/api/users/{tutor['user_id']}/update",
            "POST",
            {"name": tutor["name"], "email": tutor["email"], "hourly_rate": 55},
        )
        self.api(
            f"/api/students/{student['student_id']}/update",
            "POST",
            {
                "student_name": student["student_name"],
                "parent_email": student["parent_email"],
                "hourly_rate": 100,
                "assigned_tutor_id": tutor["user_id"],
                "active": True,
            },
        )
        self.api(
            "/api/expenses",
            "POST",
            {"expense_date": start_at[:10], "category": "Software", "description": "Monthly software", "amount": 10},
        )
        _, finance = self.api(f"/api/finance/summary?period=month&anchor={start_at[:10]}")
        self.assertEqual(finance["summary"]["gross_income"], 120)
        self.assertEqual(finance["summary"]["tutor_costs"], 60)
        self.assertEqual(finance["summary"]["gross_margin"], 60)
        self.assertEqual(finance["summary"]["expenses"], 10)
        self.assertEqual(finance["summary"]["net_income"], 50)
        self.assertEqual(finance["vat"]["turnover"], 120)
        self.assertEqual(finance["vat"]["threshold"], 90000)
        self.assertEqual(len(finance["vat"]["series"]), 12)
        finance_csv_request = Request(
            self.base_url + f"/api/finance/summary?period=month&anchor={start_at[:10]}&format=csv",
            method="GET",
        )
        with self.opener.open(finance_csv_request) as response:
            finance_csv = response.read().decode("utf-8-sig")
        self.assertIn("Gross income,120.0", finance_csv)
        self.assertIn("Tutor costs,60.0", finance_csv)
        self.assertIn("Net income,50.0", finance_csv)

        expense_id = finance["expenses"][0]["expense_id"]
        self.api(f"/api/expenses/{expense_id}/delete", "POST", {})
        _, after_delete = self.api(f"/api/finance/summary?period=month&anchor={start_at[:10]}")
        self.assertEqual(after_delete["summary"]["expenses"], 0)
        self.assertEqual(after_delete["summary"]["net_income"], 60)

        tutor_opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.api(
            "/api/login",
            "POST",
            {"email": "finance@example.com", "password": created["temporary_password"]},
            opener=tutor_opener,
        )
        with self.assertRaises(HTTPError) as finance_error:
            self.api(f"/api/finance/summary?period=month&anchor={start_at[:10]}", opener=tutor_opener)
        self.assertEqual(finance_error.exception.code, 403)
        with self.assertRaises(HTTPError) as expense_error:
            self.api(
                "/api/expenses",
                "POST",
                {"expense_date": start_at[:10], "description": "Private", "amount": 1},
                opener=tutor_opener,
            )
        self.assertEqual(expense_error.exception.code, 403)


    def test_tutor_can_delete_mistaken_booking_but_month_lock_prevents_changes(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users",
            "POST",
            {"name": "Calendar Tutor", "email": "calendar@example.com", "hourly_rate": 40},
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["email"] == "calendar@example.com")
        self.api(
            "/api/students",
            "POST",
            {"student_name": "Calendar Student", "assigned_tutor_id": tutor["user_id"]},
        )
        _, student_data = self.api("/api/students")
        student_id = student_data["students"][0]["student_id"]
        start_at = "2026-09-10T16:00:00"

        self.api(
            "/api/bookings",
            "POST",
            {"student_id": student_id, "tutor_id": tutor["user_id"], "start_at": start_at},
        )
        _, booking_data = self.api("/api/bookings?month=2026-09")
        first_booking_id = booking_data["bookings"][0]["booking_id"]

        tutor_opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.api(
            "/api/login",
            "POST",
            {"email": "calendar@example.com", "password": created["temporary_password"]},
            opener=tutor_opener,
        )
        with self.assertRaises(HTTPError) as series_delete_error:
            self.api(
                f"/api/bookings/{first_booking_id}/delete",
                "POST",
                {"scope": "following"},
                opener=tutor_opener,
            )
        self.assertEqual(series_delete_error.exception.code, 403)
        self.api(f"/api/bookings/{first_booking_id}/delete", "POST", {}, opener=tutor_opener)
        _, after_tutor_delete = self.api("/api/bookings?month=2026-09")
        self.assertEqual(after_tutor_delete["bookings"], [])

        self.api(
            "/api/bookings",
            "POST",
            {"student_id": student_id, "tutor_id": tutor["user_id"], "start_at": start_at},
        )
        _, booking_data = self.api("/api/bookings?month=2026-09")
        booking_id = booking_data["bookings"][0]["booking_id"]

        with self.assertRaises(HTTPError) as tutor_lock_error:
            self.api(
                "/api/month-locks",
                "POST",
                {"month": "2026-09", "locked": True},
                opener=tutor_opener,
            )
        self.assertEqual(tutor_lock_error.exception.code, 403)

        self.api("/api/month-locks", "POST", {"month": "2026-09", "locked": True})
        _, locked_calendar = self.api("/api/bookings?month=2026-09")
        self.assertTrue(locked_calendar["month_locked"])
        self.assertTrue(locked_calendar["bookings"][0]["month_locked"])

        locked_requests = [
            (f"/api/bookings/{booking_id}/delete", {}),
            (f"/api/bookings/{booking_id}/cancel", {}),
            (f"/api/bookings/{booking_id}/complete", {"parent_summary": "Locked", "emailed_to_parent": False}),
            (
                f"/api/bookings/{booking_id}/update",
                {
                    "student_id": student_id,
                    "tutor_id": tutor["user_id"],
                    "start_at": "2026-09-11T16:00:00",
                    "duration_minutes": 60,
                },
            ),
            (
                "/api/bookings",
                {"student_id": student_id, "tutor_id": tutor["user_id"], "start_at": "2026-09-12T16:00:00"},
            ),
            (
                "/api/bookings",
                {
                    "student_id": student_id,
                    "tutor_id": tutor["user_id"],
                    "start_at": "2026-08-31T16:00:00",
                    "repeat_weeks": 4,
                },
            ),
            ("/api/timesheet/submit", {"month": "2026-09"}),
        ]
        for path, payload in locked_requests:
            with self.subTest(path=path), self.assertRaises(HTTPError) as locked_error:
                self.api(path, "POST", payload, opener=tutor_opener)
            self.assertEqual(locked_error.exception.code, 423)

        with self.assertRaises(HTTPError) as master_delete_error:
            self.api(f"/api/bookings/{booking_id}/delete", "POST", {})
        self.assertEqual(master_delete_error.exception.code, 423)
        with self.assertRaises(HTTPError) as timesheet_status_error:
            self.api(
                "/api/timesheet/status",
                "POST",
                {"month": "2026-09", "tutor_id": tutor["user_id"], "status": "Approved"},
            )
        self.assertEqual(timesheet_status_error.exception.code, 423)
        with self.assertRaises(HTTPError) as student_delete_error:
            self.api(f"/api/students/{student_id}/remove", "POST", {"mode": "delete"})
        self.assertEqual(student_delete_error.exception.code, 423)

        self.api("/api/month-locks", "POST", {"month": "2026-09", "locked": False})
        self.api(
            f"/api/bookings/{booking_id}/complete",
            "POST",
            {"parent_summary": "Completed lesson", "emailed_to_parent": False},
            opener=tutor_opener,
        )
        with self.assertRaises(HTTPError) as completed_delete_error:
            self.api(f"/api/bookings/{booking_id}/delete", "POST", {}, opener=tutor_opener)
        self.assertEqual(completed_delete_error.exception.code, 409)

    def test_delete_this_and_remaining_series_including_legacy_courses(self):
        self.login_as_master()
        _, created = self.api(
            "/api/users", "POST", {"name": "Series Tutor", "email": "series@example.com", "hourly_rate": 40}
        )
        _, users = self.api("/api/users")
        tutor = next(item for item in users["users"] if item["email"] == "series@example.com")
        self.api(
            "/api/students", "POST", {"student_name": "Series Student", "assigned_tutor_id": tutor["user_id"]}
        )
        _, student_data = self.api("/api/students")
        student_id = student_data["students"][0]["student_id"]
        self.api(
            "/api/bookings",
            "POST",
            {
                "student_id": student_id,
                "tutor_id": tutor["user_id"],
                "start_at": "2026-09-03T16:00:00",
                "repeat_weeks": 4,
            },
        )
        _, booking_data = self.api("/api/bookings?month=2026-09")
        self.assertEqual(len(booking_data["bookings"]), 4)
        self.assertEqual(len({item["series_id"] for item in booking_data["bookings"]}), 1)
        second_booking_id = booking_data["bookings"][1]["booking_id"]

        # Existing courses created before series IDs were added must remain removable.
        with server.db() as connection:
            connection.execute("UPDATE bookings SET series_id = NULL")

        _, preview = self.api(
            f"/api/bookings/{second_booking_id}/delete",
            "POST",
            {"scope": "following", "preview": True},
        )
        self.assertEqual(preview["count"], 3)
        _, deleted = self.api(
            f"/api/bookings/{second_booking_id}/delete", "POST", {"scope": "following"}
        )
        self.assertEqual(deleted["deleted_bookings"], 3)
        _, remaining = self.api("/api/bookings?month=2026-09")
        self.assertEqual(len(remaining["bookings"]), 1)
        self.assertEqual(remaining["bookings"][0]["start_at"], "2026-09-03T16:00:00")

    def test_lesson_overlap_protection_for_students_tutors_and_repeating_courses(self):
        self.login_as_master()
        for name, email in (("First Tutor", "first@example.com"), ("Second Tutor", "second@example.com")):
            self.api("/api/users", "POST", {"name": name, "email": email, "hourly_rate": 40})
        _, users = self.api("/api/users")
        first_tutor = next(item for item in users["users"] if item["email"] == "first@example.com")
        second_tutor = next(item for item in users["users"] if item["email"] == "second@example.com")
        self.api("/api/students", "POST", {"student_name": "First Student", "assigned_tutor_id": first_tutor["user_id"]})
        self.api("/api/students", "POST", {"student_name": "Second Student", "assigned_tutor_id": first_tutor["user_id"]})
        _, student_data = self.api("/api/students")
        first_student = next(item for item in student_data["students"] if item["student_name"] == "First Student")
        second_student = next(item for item in student_data["students"] if item["student_name"] == "Second Student")

        self.api(
            "/api/bookings", "POST",
            {"student_id": first_student["student_id"], "tutor_id": first_tutor["user_id"],
             "start_at": "2026-09-10T16:00:00", "duration_minutes": 60},
        )
        conflicting_bookings = (
            {"student_id": second_student["student_id"], "tutor_id": first_tutor["user_id"],
             "start_at": "2026-09-10T16:30:00", "duration_minutes": 45},
            {"student_id": first_student["student_id"], "tutor_id": second_tutor["user_id"],
             "start_at": "2026-09-10T16:45:00", "duration_minutes": 30},
        )
        for booking in conflicting_bookings:
            with self.subTest(booking=booking), self.assertRaises(HTTPError) as overlap_error:
                self.api("/api/bookings", "POST", booking)
            self.assertEqual(overlap_error.exception.code, 409)
            error = json.loads(overlap_error.exception.read().decode("utf-8"))
            self.assertIn("overlaps with First Student", error["error"])

        # Different students with different tutors may legitimately run at the same time.
        self.api(
            "/api/bookings", "POST",
            {"student_id": second_student["student_id"], "tutor_id": second_tutor["user_id"],
             "start_at": "2026-09-10T16:30:00", "duration_minutes": 45},
        )
        # A lesson beginning exactly when another ends is not an overlap.
        self.api(
            "/api/bookings", "POST",
            {"student_id": second_student["student_id"], "tutor_id": first_tutor["user_id"],
             "start_at": "2026-09-10T17:15:00", "duration_minutes": 45},
        )

        self.api(
            "/api/bookings", "POST",
            {"student_id": first_student["student_id"], "tutor_id": first_tutor["user_id"],
             "start_at": "2026-10-15T18:00:00", "duration_minutes": 60},
        )
        with self.assertRaises(HTTPError) as repeating_overlap:
            self.api(
                "/api/bookings", "POST",
                {"student_id": first_student["student_id"], "tutor_id": first_tutor["user_id"],
                 "start_at": "2026-10-01T18:00:00", "duration_minutes": 60, "repeat_weeks": 4},
            )
        self.assertEqual(repeating_overlap.exception.code, 409)
        _, october = self.api("/api/bookings?month=2026-10")
        self.assertEqual(len(october["bookings"]), 1, "a conflicting recurring course must not be partly created")


class TimesheetPdfTests(unittest.TestCase):
    def test_personal_business_branding_and_zero_owner_cost(self):
        with patch.object(server, "BUSINESS_NAME", "Scott Linger"), patch.object(
            server, "APP_NAME", "Scott Linger - TutorFlow"
        ), patch.object(server, "PERSONAL_WORKSPACE", True), patch.object(
            server, "send_postmark_email", return_value="test"
        ) as send:
            server.send_lesson_email("parent@example.com", "Example Student", "Good progress")
            self.assertIn("Scott Linger", send.call_args.args[2])
            self.assertNotIn("SWL Education", send.call_args.args[2])
            server.send_tutor_credentials_email("tutor@example.com", "Scott", "not-a-real-password")
            self.assertIn("Scott Linger - TutorFlow", send.call_args.args[1])
            server.send_password_reset_email("tutor@example.com", "Scott", "test-token")
            self.assertIn("Scott Linger", send.call_args.args[2])
            pdf = server.build_timesheet_pdf([], {"name": "Scott", "email": "scott@example.com", "hourly_rate": 0}, "2026-09")
            reader = PdfReader(BytesIO(pdf))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            self.assertIn("SCOTT LINGER", text)
            self.assertNotIn("SWL EDUCATION", text)
            self.assertIn("Monthly Teaching Record", text)
            self.assertNotIn("Monthly Tutor Timesheet", text)
            self.assertEqual(reader.metadata.author, "Scott Linger")
            summary = server.calculate_finances([{"duration_minutes": 60, "student_rate": 100, "tutor_rate": 0}], [])
            self.assertEqual(summary["net_income"], 100)
            self.assertEqual(summary["tutor_costs"], 0)
            self.assertIn("Scott Linger - Internal Finance Report", server.finance_csv(summary, [], "September"))

    def test_pdf_is_branded_and_excludes_school_year(self):
        pdf = server.build_timesheet_pdf(
            [{
                "start_at": "2026-08-17T16:00:00",
                "completed_at": "2026-08-17T17:00:00",
                "duration_minutes": 60,
                "student_name": "Ada Student",
                "year_group": "Year 8",
                "tutor_rate": 40,
                "attendance_status": "Attended",
                "timesheet_status": "Approved",
            }],
            {"name": "Grace Tutor", "email": "grace@example.com", "hourly_rate": 40},
            "2026-08",
        )

        self.assertTrue(pdf.startswith(b"%PDF"))
        text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf)).pages)
        self.assertIn("SWL EDUCATION LTD", text)
        self.assertIn("Monthly Tutor Timesheet", text)
        self.assertIn("Grace Tutor", text)
        self.assertIn("Ada Student", text)
        self.assertNotIn("Year 8", text)
        self.assertNotIn("school year", text.lower())


class PostmarkTests(unittest.TestCase):
    def test_postmark_request_uses_configured_sender_and_token(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return None

            def read(self):
                return b'{"ErrorCode":0,"Message":"OK","MessageID":"message-123"}'

        environment = {
            "POSTMARK_SERVER_TOKEN": "test-token",
            "POSTMARK_FROM_EMAIL": "sender@example.com",
            "POSTMARK_FROM_NAME": "TutorFlow Agency",
            "POSTMARK_MESSAGE_STREAM": "outbound",
        }
        with patch.dict(os.environ, environment, clear=False), patch.object(
            server, "urlopen", return_value=FakeResponse()
        ) as mocked_urlopen:
            message_id = server.send_lesson_email(
                "parent@example.com", "Ada Student", "Great work.", "tutor@example.com"
            )

        self.assertEqual(message_id, "message-123")
        request = mocked_urlopen.call_args.args[0]
        message = json.loads(request.data.decode("utf-8"))
        self.assertEqual(request.get_header("X-postmark-server-token"), "test-token")
        self.assertEqual(message["From"], "SWL Education - TutorFlow <sender@example.com>")
        self.assertEqual(message["To"], "parent@example.com")
        self.assertEqual(message["ReplyTo"], "tutor@example.com")
        self.assertEqual(message["Subject"], "Lesson Notes - Ada Student")
        self.assertTrue(message["TextBody"].startswith("Student: Ada Student"))
        self.assertNotIn("LESSON NOTES", message["TextBody"])
        self.assertIn("Great work.", message["TextBody"])
        self.assertTrue(message["TextBody"].rstrip().endswith("SWL Education Ltd"))


if __name__ == "__main__":
    unittest.main()

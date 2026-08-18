import http.cookiejar
import json
import os
import tempfile
import threading
import unittest
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from unittest.mock import patch

import server


class AgencyApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = server.DB_PATH
        self.original_send_email = server.send_lesson_email
        self.original_send_credentials = server.send_tutor_credentials_email
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
        self.temp_dir.cleanup()

    def api(self, path, method="GET", body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        with self.opener.open(request) as response:
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
        status, health = self.api("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(health["status"], "ok")
        self.assertEqual(health["database"], "sqlite")
        user = self.login_as_master()
        self.assertEqual(user["role"], "Master")
        _, session = self.api("/api/session")
        self.assertEqual(session["user"]["email"], "owner@example.com")

    def test_completing_a_lesson_sends_postmark_email(self):
        user = self.login_as_master()
        self.api(
            "/api/students",
            "POST",
            {
                "student_name": "Ada Student",
                "parent_name": "Pat Parent",
                "parent_email": "parent@example.com",
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
        self.assertEqual(calls[0][0], "parent@example.com")
        with server.db() as connection:
            lesson = connection.execute(
                "SELECT emailed_to_parent FROM lesson_records WHERE booking_id = ?", (booking_id,)
            ).fetchone()
        self.assertEqual(lesson["emailed_to_parent"], 1)
        _, updated_bookings = self.api(f"/api/bookings?month={start_at[:7]}")
        updated = updated_bookings["bookings"][0]
        self.assertEqual(updated["parent_summary"], "Excellent progress today.")
        self.assertEqual(updated["attendance_status"], "Completed")

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
            "POSTMARK_FROM_NAME": "TutorFlow",
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
        self.assertEqual(message["From"], "TutorFlow <sender@example.com>")
        self.assertEqual(message["To"], "parent@example.com")
        self.assertEqual(message["ReplyTo"], "tutor@example.com")


if __name__ == "__main__":
    unittest.main()

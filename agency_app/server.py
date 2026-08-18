from __future__ import annotations

import csv
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import zipfile
from datetime import datetime, timedelta
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
DATA = ROOT / "data"
DB_PATH = DATA / "agency.sqlite3"
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8010"))
SESSION_COOKIE = "tutorflow_agency_session"


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 180_000)
    return f"{salt}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    if "$" not in stored:
        return False
    salt, expected = stored.split("$", 1)
    return hmac.compare_digest(hash_password(password, salt), stored)


class DatabaseConnection:
    """Small compatibility layer for SQLite locally and PostgreSQL on Railway."""

    def __init__(self):
        self.postgres = bool(DATABASE_URL)
        if self.postgres:
            try:
                import psycopg
                from psycopg.rows import dict_row
            except ImportError as error:
                raise RuntimeError("PostgreSQL requires the psycopg package from requirements.txt") from error
            self.connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        else:
            DATA.mkdir(exist_ok=True)
            self.connection = sqlite3.connect(DB_PATH)
            self.connection.row_factory = sqlite3.Row
            self.connection.execute("PRAGMA foreign_keys = ON")

    def execute(self, query, params=()):
        if self.postgres:
            query = query.replace("?", "%s")
        return self.connection.execute(query, params)

    def executescript(self, script):
        if self.postgres:
            for statement in script.split(";"):
                if statement.strip():
                    self.connection.execute(statement)
        else:
            self.connection.executescript(script)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            if exc_type:
                self.connection.rollback()
            else:
                self.connection.commit()
        finally:
            self.connection.close()


def db() -> DatabaseConnection:
    return DatabaseConnection()


def rows(items):
    return [dict(item) for item in items]


def ensure_column(conn, table: str, column: str, definition: str) -> None:
    if conn.postgres:
        existing = {
            row["column_name"]
            for row in conn.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?",
                (table,),
            )
        }
    else:
        existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db() -> None:
    primary_key = "SERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT"
    with db() as conn:
        conn.executescript(
            f"""
            CREATE TABLE IF NOT EXISTS users (
                user_id {primary_key},
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Master', 'Tutor')),
                hourly_rate REAL NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS students (
                student_id {primary_key},
                student_name TEXT NOT NULL,
                parent_name TEXT NOT NULL DEFAULT '',
                parent_email TEXT NOT NULL DEFAULT '',
                year_group TEXT NOT NULL DEFAULT '',
                target_school TEXT NOT NULL DEFAULT '',
                assigned_tutor_id INTEGER,
                hourly_rate REAL NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY(assigned_tutor_id) REFERENCES users(user_id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS bookings (
                booking_id {primary_key},
                student_id INTEGER NOT NULL,
                tutor_id INTEGER NOT NULL,
                start_at TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL DEFAULT 60,
                status TEXT NOT NULL DEFAULT 'Booked',
                notes TEXT NOT NULL DEFAULT '',
                created_by INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY(tutor_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY(created_by) REFERENCES users(user_id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS lesson_records (
                lesson_record_id {primary_key},
                booking_id INTEGER UNIQUE,
                student_id INTEGER NOT NULL,
                tutor_id INTEGER NOT NULL,
                completed_at TEXT NOT NULL,
                attendance_status TEXT NOT NULL DEFAULT 'Completed',
                parent_summary TEXT NOT NULL DEFAULT '',
                emailed_to_parent INTEGER NOT NULL DEFAULT 0,
                timesheet_submitted INTEGER NOT NULL DEFAULT 0,
                timesheet_status TEXT NOT NULL DEFAULT 'Draft',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
                FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY(tutor_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
            """
        )
        ensure_column(conn, "lesson_records", "timesheet_status", "TEXT NOT NULL DEFAULT 'Draft'")


def postmark_configured() -> bool:
    return bool(os.environ.get("POSTMARK_SERVER_TOKEN") and os.environ.get("POSTMARK_FROM_EMAIL"))


def send_postmark_email(recipient: str, subject: str, body: str, reply_to: str = "") -> str:
    token = os.environ.get("POSTMARK_SERVER_TOKEN", "").strip()
    from_email = os.environ.get("POSTMARK_FROM_EMAIL", "").strip()
    from_name = os.environ.get("POSTMARK_FROM_NAME", "SWL Education - TutorFlow").strip()
    if not token or not from_email:
        raise RuntimeError("Postmark is not configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL.")
    if not recipient:
        raise ValueError("A recipient email address is required.")

    message = {
        "From": f"{from_name} <{from_email}>" if from_name else from_email,
        "To": recipient,
        "Subject": subject,
        "TextBody": body,
        "MessageStream": os.environ.get("POSTMARK_MESSAGE_STREAM", "outbound"),
    }
    if reply_to:
        message["ReplyTo"] = reply_to
    request = Request(
        "https://api.postmarkapp.com/email",
        data=json.dumps(message).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": token,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(details).get("Message", details)
        except json.JSONDecodeError:
            pass
        raise RuntimeError(f"Postmark rejected the email: {details}") from error
    except (URLError, TimeoutError) as error:
        reason = getattr(error, "reason", str(error))
        raise RuntimeError(f"Could not reach Postmark: {reason}") from error
    if result.get("ErrorCode"):
        raise RuntimeError(f"Postmark rejected the email: {result.get('Message', 'Unknown error')}")
    return result.get("MessageID", "")


def send_lesson_email(recipient: str, student_name: str, summary: str, reply_to: str = "") -> str:
    if not recipient:
        raise ValueError("The student does not have a parent email address.")
    body = f"""LESSON NOTES

Student: {student_name}

{summary}

Kind regards,
SWL Education Ltd
"""
    return send_postmark_email(
        recipient,
        f"Lesson Notes - {student_name}",
        body,
        reply_to,
    )


def app_url() -> str:
    configured = os.environ.get("APP_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured
    railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "").strip()
    return f"https://{railway_domain}" if railway_domain else "the TutorFlow Agency website"


def send_tutor_credentials_email(
    recipient: str,
    tutor_name: str,
    temporary_password: str,
    reply_to: str = "",
    reset: bool = False,
) -> str:
    action = "reset" if reset else "created"
    subject = "Your TutorFlow Agency password was reset" if reset else "Your TutorFlow Agency account"
    body = f"""Hello {tutor_name},

Your TutorFlow Agency account has been {action}.

Sign in: {app_url()}
Email: {recipient}
Temporary password: {temporary_password}

Please sign in and change this temporary password from Settings as soon as possible.
If you were not expecting this email, contact your agency administrator.
"""
    return send_postmark_email(recipient, subject, body, reply_to)


def query_period(query):
    month = query.get("month", [""])[0]
    start = query.get("start", [""])[0]
    end = query.get("end", [""])[0]
    if month:
        year, month_num = [int(part) for part in month.split("-")]
        start_dt = datetime(year, month_num, 1)
        end_dt = datetime(year + (month_num == 12), 1 if month_num == 12 else month_num + 1, 1)
        return start_dt.isoformat(), end_dt.isoformat()
    if start and end:
        return f"{start}T00:00:00", f"{end}T23:59:59"
    today = datetime.now()
    start_dt = datetime(today.year, today.month, 1)
    end_dt = datetime(today.year + (today.month == 12), 1 if today.month == 12 else today.month + 1, 1)
    return start_dt.isoformat(), end_dt.isoformat()


def build_timesheet_pdf(lessons, tutor, month: str) -> bytes:
    """Build the official SWL Education Ltd tutor timesheet."""
    from xml.sax.saxutils import escape

    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    deep_green = colors.HexColor("#123F42")
    teal = colors.HexColor("#16877C")
    gold = colors.HexColor("#D8B164")
    paper = colors.HexColor("#FBF7EF")
    ink = colors.HexColor("#203238")
    muted = colors.HexColor("#617278")
    line = colors.HexColor("#D8DED9")

    try:
        period_label = datetime.strptime(month, "%Y-%m").strftime("%B %Y")
    except (TypeError, ValueError):
        period_label = str(month or "Selected period")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TimesheetTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=23,
        textColor=deep_green,
        spaceAfter=2 * mm,
    )
    company_style = ParagraphStyle(
        "Company",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=teal,
        spaceAfter=1 * mm,
    )
    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=muted,
        spaceAfter=1,
    )
    meta_value = ParagraphStyle(
        "MetaValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=ink,
    )
    cell_style = ParagraphStyle(
        "Cell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=ink,
    )
    cell_right = ParagraphStyle("CellRight", parent=cell_style, alignment=TA_RIGHT)
    cell_center = ParagraphStyle("CellCenter", parent=cell_style, alignment=TA_CENTER)
    header_style = ParagraphStyle(
        "TableHeader",
        parent=cell_style,
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=9,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=muted,
    )

    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=13 * mm,
        bottomMargin=15 * mm,
        title=f"SWL Education Ltd - {period_label} Tutor Timesheet",
        author="SWL Education Ltd",
        subject="Monthly tutor timesheet",
    )

    def add_footer(canvas, doc):
        canvas.saveState()
        width, _height = landscape(A4)
        canvas.setStrokeColor(line)
        canvas.line(doc.leftMargin, 10 * mm, width - doc.rightMargin, 10 * mm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(muted)
        canvas.drawString(doc.leftMargin, 6.5 * mm, "SWL Education Ltd | Tutor timesheet")
        canvas.drawRightString(width - doc.rightMargin, 6.5 * mm, f"Page {doc.page}")
        canvas.restoreState()

    story = [
        Table(
            [[
                Paragraph("SWL EDUCATION LTD", company_style),
                Paragraph("OFFICIAL TUTOR RECORD", ParagraphStyle("Record", parent=company_style, alignment=TA_RIGHT, textColor=gold)),
            ]],
            colWidths=[125 * mm, 132 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), paper),
                ("LINEBELOW", (0, 0), (-1, -1), 2.5, gold),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]),
        ),
        Spacer(1, 6 * mm),
        Paragraph("Monthly Tutor Timesheet", title_style),
        Spacer(1, 2 * mm),
    ]

    tutor_name = escape(str(tutor.get("name") or "Tutor"))
    tutor_email = escape(str(tutor.get("email") or ""))
    prepared = datetime.now().strftime("%d %B %Y")
    metadata = Table(
        [[
            Paragraph("TUTOR", meta_label),
            Paragraph("EMAIL", meta_label),
            Paragraph("PERIOD", meta_label),
            Paragraph("PREPARED", meta_label),
        ], [
            Paragraph(tutor_name, meta_value),
            Paragraph(tutor_email, meta_value),
            Paragraph(escape(period_label), meta_value),
            Paragraph(prepared, meta_value),
        ]],
        colWidths=[64 * mm, 82 * mm, 58 * mm, 53 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), paper),
            ("BOX", (0, 0), (-1, -1), 0.7, line),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, line),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, 0), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
            ("TOPPADDING", (0, 1), (-1, 1), 0),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 3 * mm),
        ]),
    )
    story.extend([metadata, Spacer(1, 6 * mm)])

    table_rows = [[
        Paragraph("DATE", header_style),
        Paragraph("STUDENT", header_style),
        Paragraph("DURATION", header_style),
        Paragraph("HOURLY FEE", header_style),
        Paragraph("AMOUNT", header_style),
        Paragraph("ATTENDANCE", header_style),
        Paragraph("TIMESHEET STATUS", header_style),
    ]]
    total_minutes = 0
    total_amount = 0.0
    for lesson in lessons:
        minutes = int(lesson.get("duration_minutes") or 0)
        rate = float(lesson.get("tutor_rate") or 0)
        amount = (minutes / 60) * rate
        total_minutes += minutes
        total_amount += amount
        raw_date = lesson.get("start_at") or lesson.get("completed_at") or ""
        try:
            lesson_date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00")).strftime("%d %b %Y")
        except ValueError:
            lesson_date = str(raw_date)[:10]
        timesheet_status = lesson.get("timesheet_status") or ("Submitted" if lesson.get("timesheet_submitted") else "Draft")
        table_rows.append([
            Paragraph(escape(lesson_date), cell_center),
            Paragraph(escape(str(lesson.get("student_name") or "")), cell_style),
            Paragraph(f"{minutes} min", cell_center),
            Paragraph(f"GBP {rate:,.2f}", cell_right),
            Paragraph(f"GBP {amount:,.2f}", cell_right),
            Paragraph(escape(str(lesson.get("attendance_status") or "Completed")), cell_center),
            Paragraph(escape(str(timesheet_status)), cell_center),
        ])

    if lessons:
        table_rows.append([
            Paragraph("TOTAL", ParagraphStyle("TotalLabel", parent=header_style, alignment=TA_RIGHT)),
            "",
            Paragraph(f"{total_minutes / 60:.2f} hours", ParagraphStyle("TotalHours", parent=header_style, alignment=TA_CENTER)),
            "",
            Paragraph(f"GBP {total_amount:,.2f}", ParagraphStyle("TotalAmount", parent=header_style, alignment=TA_RIGHT)),
            "",
            "",
        ])
    else:
        table_rows.append([Paragraph("No completed lessons recorded for this period.", cell_style), "", "", "", "", "", ""])

    lesson_table = Table(
        table_rows,
        colWidths=[27 * mm, 57 * mm, 27 * mm, 31 * mm, 31 * mm, 39 * mm, 45 * mm],
        repeatRows=1,
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), deep_green),
            ("GRID", (0, 0), (-1, -2 if lessons else -1), 0.45, line),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2 if lessons else -1), [colors.white, paper]),
            ("SPAN", (0, -1), (1, -1)) if lessons else ("SPAN", (0, 1), (-1, 1)),
            ("BACKGROUND", (0, -1), (-1, -1), teal if lessons else paper),
            ("TEXTCOLOR", (0, -1), (-1, -1), colors.white if lessons else ink),
            ("LINEABOVE", (0, -1), (-1, -1), 1, gold if lessons else line),
        ]),
    )
    story.extend([lesson_table, Spacer(1, 6 * mm)])

    summary = Table(
        [[
            Paragraph(f"<b>{len(lessons)}</b><br/><font size='7'>LESSONS</font>", ParagraphStyle("Summary", parent=meta_value, alignment=TA_CENTER)),
            Paragraph(f"<b>{total_minutes / 60:.2f}</b><br/><font size='7'>TOTAL HOURS</font>", ParagraphStyle("Summary2", parent=meta_value, alignment=TA_CENTER)),
            Paragraph(f"<b>GBP {total_amount:,.2f}</b><br/><font size='7'>TOTAL PAYABLE</font>", ParagraphStyle("Summary3", parent=meta_value, alignment=TA_CENTER)),
            Paragraph("I confirm that the lessons listed above are a true and accurate record.", small_style),
        ]],
        colWidths=[38 * mm, 45 * mm, 52 * mm, 122 * mm],
        style=TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, line),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, line),
            ("BACKGROUND", (0, 0), (2, 0), paper),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ]),
    )
    story.extend([summary, Spacer(1, 8 * mm)])

    signatures = Table(
        [[
            Paragraph("Tutor signature: ____________________________________", small_style),
            Paragraph("Approved by: ____________________________________", small_style),
            Paragraph("Date: ____________________", small_style),
        ]],
        colWidths=[96 * mm, 96 * mm, 65 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ]),
    )
    story.append(signatures)
    document.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return output.getvalue()


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        rel = unquote(urlparse(path).path).lstrip("/") or "index.html"
        requested = (PUBLIC / rel).resolve()
        try:
            requested.relative_to(PUBLIC.resolve())
        except ValueError:
            return str(PUBLIC / "__not_found__")
        return str(requested)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def send_json(self, data, status=200):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_csv(self, filename: str, content: str):
        payload = content.encode("utf-8-sig")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_file(self, path: Path, filename: str, content_type: str):
        payload = path.read_bytes()
        return self.send_bytes(payload, filename, content_type)

    def send_bytes(self, payload: bytes, filename: str, content_type: str):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def current_user(self):
        raw = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie(raw)
        morsel = jar.get(SESSION_COOKIE)
        if not morsel:
            return None
        with db() as conn:
            row = conn.execute(
                """
                SELECT u.user_id, u.name, u.email, u.role, u.hourly_rate
                FROM sessions s
                JOIN users u ON u.user_id = s.user_id
                WHERE s.token = ? AND u.active = 1
                """,
                (morsel.value,),
            ).fetchone()
        return dict(row) if row else None

    def require_user(self):
        user = self.current_user()
        if not user:
            self.send_json({"error": "Please sign in."}, 401)
            return None
        return user

    def require_master(self):
        user = self.require_user()
        if not user:
            return None
        if user["role"] != "Master":
            self.send_json({"error": "Master access required."}, 403)
            return None
        return user

    def visible_student_filter(self, user):
        if user["role"] == "Master":
            return "", []
        return "WHERE s.assigned_tutor_id = ?", [user["user_id"]]

    def visible_booking_filter(self, user, prefix="WHERE"):
        if user["role"] == "Master":
            return "", []
        return f"{prefix} b.tutor_id = ?", [user["user_id"]]

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        if path.startswith("/api/"):
            return self.route_get(path, query)
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            return self.route_post(parsed.path)
        return self.send_json({"error": "Not found"}, 404)

    def route_get(self, path, query):
        if path == "/api/health":
            try:
                with db() as conn:
                    conn.execute("SELECT 1").fetchone()
                return self.send_json(
                    {
                        "status": "ok",
                        "database": "postgresql" if DATABASE_URL else "sqlite",
                        "postmark": postmark_configured(),
                    }
                )
            except Exception as error:
                print(f"Health check database error: {error}", flush=True)
                return self.send_json({"status": "error", "database": "unavailable"}, 503)

        if path == "/api/setup-status":
            with db() as conn:
                has_master = bool(conn.execute("SELECT 1 FROM users WHERE role = 'Master' LIMIT 1").fetchone())
            return self.send_json({"has_master": has_master})

        if path == "/api/session":
            return self.send_json({"user": self.current_user()})

        user = self.require_user()
        if not user:
            return

        if path == "/api/users":
            if not self.require_master():
                return
            with db() as conn:
                tutors = rows(conn.execute("SELECT user_id, name, email, role, hourly_rate, active FROM users ORDER BY role, name"))
            return self.send_json({"users": tutors})

        if path == "/api/students":
            where, params = self.visible_student_filter(user)
            student_columns = (
                "s.*"
                if user["role"] == "Master"
                else """s.student_id, s.student_name, s.parent_name, s.parent_email,
                        s.year_group, s.target_school, s.assigned_tutor_id,
                        s.active, s.created_at"""
            )
            with db() as conn:
                students = rows(conn.execute(
                    f"""
                    SELECT {student_columns}, u.name AS tutor_name
                    FROM students s
                    LEFT JOIN users u ON u.user_id = s.assigned_tutor_id
                    {where}
                    ORDER BY s.active DESC, s.student_name
                    """,
                    params,
                ))
            return self.send_json({"students": students})

        if path == "/api/bookings":
            month = query.get("month", [datetime.now().strftime("%Y-%m")])[0]
            start, end = query_period({"month": [month]})
            where, params = self.visible_booking_filter(user, "AND")
            with db() as conn:
                bookings = rows(conn.execute(
                    f"""
                    SELECT b.*, s.student_name, s.parent_email, u.name AS tutor_name,
                           lr.parent_summary, lr.attendance_status, lr.emailed_to_parent
                    FROM bookings b
                    JOIN students s ON s.student_id = b.student_id
                    JOIN users u ON u.user_id = b.tutor_id
                    LEFT JOIN lesson_records lr ON lr.booking_id = b.booking_id
                    WHERE b.start_at >= ? AND b.start_at < ? {where}
                    ORDER BY b.start_at
                    """,
                    [start, end, *params],
                ))
            return self.send_json({"bookings": bookings})

        if path == "/api/reports/lessons":
            start, end = query_period(query)
            clauses = ["lr.completed_at >= ?", "lr.completed_at < ?"]
            params = [start, end]
            if user["role"] != "Master":
                clauses.append("lr.tutor_id = ?")
                params.append(user["user_id"])
            elif query.get("tutor_id", [""])[0]:
                clauses.append("lr.tutor_id = ?")
                params.append(query["tutor_id"][0])
            if query.get("student_id", [""])[0]:
                clauses.append("lr.student_id = ?")
                params.append(query["student_id"][0])
            rate_columns = (
                "s.hourly_rate AS student_rate, u.hourly_rate AS tutor_rate"
                if user["role"] == "Master"
                else "u.hourly_rate AS tutor_rate"
            )
            with db() as conn:
                lessons = rows(conn.execute(
                    f"""
                    SELECT lr.*, b.start_at, b.duration_minutes, s.student_name, s.parent_email,
                           {rate_columns}, u.name AS tutor_name
                    FROM lesson_records lr
                    LEFT JOIN bookings b ON b.booking_id = lr.booking_id
                    JOIN students s ON s.student_id = lr.student_id
                    JOIN users u ON u.user_id = lr.tutor_id
                    WHERE {' AND '.join(clauses)}
                    ORDER BY lr.completed_at DESC
                    """,
                    params,
                ))
            if query.get("format", [""])[0] == "csv":
                rate_key = "student_rate" if user["role"] == "Master" else "tutor_rate"
                return self.export_lessons_csv(lessons, rate_key)
            return self.send_json({"lessons": lessons})

        if path == "/api/timesheet":
            start, end = query_period(query)
            month = query.get("month", [datetime.now().strftime("%Y-%m")])[0]
            tutor_id = user["user_id"] if user["role"] != "Master" else int(query.get("tutor_id", [user["user_id"]])[0] or user["user_id"])
            with db() as conn:
                tutor_record = conn.execute(
                    "SELECT user_id, name, email, hourly_rate FROM users WHERE user_id = ?",
                    (tutor_id,),
                ).fetchone()
                tutor = dict(tutor_record) if tutor_record else None
                lessons = rows(conn.execute(
                    """
                    SELECT lr.*, b.start_at, b.duration_minutes, s.student_name,
                           u.hourly_rate AS tutor_rate, u.name AS tutor_name
                    FROM lesson_records lr
                    LEFT JOIN bookings b ON b.booking_id = lr.booking_id
                    JOIN students s ON s.student_id = lr.student_id
                    JOIN users u ON u.user_id = lr.tutor_id
                    WHERE lr.tutor_id = ? AND lr.completed_at >= ? AND lr.completed_at < ?
                    ORDER BY lr.completed_at
                    """,
                    (tutor_id, start, end),
                ))
            if not tutor:
                return self.send_json({"error": "Tutor not found"}, 404)
            download_format = query.get("format", [""])[0].lower()
            if download_format == "csv":
                return self.export_timesheet_csv(lessons)
            if download_format == "pdf":
                filename_name = re.sub(r"[^a-z0-9]+", "-", tutor["name"].lower()).strip("-") or "tutor"
                filename_month = re.sub(r"[^0-9-]+", "", month) or datetime.now().strftime("%Y-%m")
                return self.send_bytes(
                    build_timesheet_pdf(lessons, tutor, month),
                    f"swl-education-timesheet-{filename_month}-{filename_name}.pdf",
                    "application/pdf",
                )
            return self.send_json({"lessons": lessons})

        if path == "/api/backup":
            if not self.require_master():
                return
            filename = f"tutorflow-agency-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.zip"
            payload = BytesIO()
            with zipfile.ZipFile(payload, "w", zipfile.ZIP_DEFLATED) as archive:
                if not DATABASE_URL and DB_PATH.exists():
                    archive.write(DB_PATH, "agency.sqlite3")
                with db() as conn:
                    for table in ("users", "students", "bookings", "lesson_records"):
                        archive.writestr(
                            f"{table}.json",
                            json.dumps(rows(conn.execute(f"SELECT * FROM {table}")), indent=2),
                        )
                archive.writestr("created_at.txt", now_iso())
            return self.send_bytes(payload.getvalue(), filename, "application/zip")

        return self.send_json({"error": "Not found"}, 404)

    def route_post(self, path):
        payload = self.read_json()

        if path == "/api/setup":
            with db() as conn:
                if conn.execute("SELECT 1 FROM users WHERE role = 'Master' LIMIT 1").fetchone():
                    return self.send_json({"error": "Master account already exists."}, 400)
                conn.execute(
                    "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'Master', ?)",
                    (payload["name"], payload["email"].lower(), hash_password(payload["password"]), now_iso()),
                )
            return self.send_json({"ok": True})

        if path == "/api/login":
            with db() as conn:
                row = conn.execute("SELECT * FROM users WHERE email = ? AND active = 1", (payload["email"].lower(),)).fetchone()
                if not row or not check_password(payload["password"], row["password_hash"]):
                    return self.send_json({"error": "Invalid login details."}, 401)
                token = secrets.token_urlsafe(32)
                conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, row["user_id"], now_iso()))
                user = {"user_id": row["user_id"], "name": row["name"], "email": row["email"], "role": row["role"], "hourly_rate": row["hourly_rate"]}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            secure = "; Secure" if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("COOKIE_SECURE") == "1" else ""
            self.send_header("Set-Cookie", f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax{secure}")
            self.end_headers()
            self.wfile.write(json.dumps({"user": user}).encode("utf-8"))
            return

        user = self.require_user()
        if not user:
            return

        if path == "/api/logout":
            raw = self.headers.get("Cookie", "")
            jar = cookies.SimpleCookie(raw)
            token = jar.get(SESSION_COOKIE)
            if token:
                with db() as conn:
                    conn.execute("DELETE FROM sessions WHERE token = ?", (token.value,))
            self.send_response(200)
            secure = "; Secure" if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("COOKIE_SECURE") == "1" else ""
            self.send_header("Set-Cookie", f"{SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax{secure}")
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return

        if path == "/api/account/password":
            if not payload.get("new_password"):
                return self.send_json({"error": "Enter a new password."}, 400)
            with db() as conn:
                row = conn.execute("SELECT password_hash FROM users WHERE user_id = ?", (user["user_id"],)).fetchone()
                if not row or not check_password(payload.get("current_password", ""), row["password_hash"]):
                    return self.send_json({"error": "Current password is incorrect."}, 400)
                conn.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (hash_password(payload["new_password"]), user["user_id"]))
            return self.send_json({"ok": True})

        if path == "/api/users":
            if not self.require_master():
                return
            temp_password = payload.get("password") or f"Tutor-{secrets.token_urlsafe(5)}"
            tutor_email = payload["email"].strip().lower()
            with db() as conn:
                conn.execute(
                    """
                    INSERT INTO users (name, email, password_hash, role, hourly_rate, active, created_at)
                    VALUES (?, ?, ?, 'Tutor', ?, 1, ?)
                    """,
                    (payload["name"], tutor_email, hash_password(temp_password), float(payload.get("hourly_rate") or 0), now_iso()),
                )
            email_sent = False
            email_error = ""
            try:
                send_tutor_credentials_email(
                    tutor_email,
                    payload["name"],
                    temp_password,
                    user.get("email", ""),
                )
                email_sent = True
            except (RuntimeError, ValueError) as error:
                email_error = str(error)
            return self.send_json(
                {
                    "ok": True,
                    "temporary_password": temp_password,
                    "email": tutor_email,
                    "email_sent": email_sent,
                    "email_error": email_error,
                }
            )

        if path.startswith("/api/users/") and path.endswith("/reset-password"):
            if not self.require_master():
                return
            tutor_id = int(path.split("/")[3])
            temp_password = f"Tutor-{secrets.token_urlsafe(5)}"
            with db() as conn:
                tutor = conn.execute(
                    "SELECT name, email FROM users WHERE user_id = ? AND role = 'Tutor'",
                    (tutor_id,),
                ).fetchone()
                if not tutor:
                    return self.send_json({"error": "Tutor not found."}, 404)
                conn.execute("UPDATE users SET password_hash = ? WHERE user_id = ? AND role = 'Tutor'", (hash_password(temp_password), tutor_id))
            email_sent = False
            email_error = ""
            try:
                send_tutor_credentials_email(
                    tutor["email"],
                    tutor["name"],
                    temp_password,
                    user.get("email", ""),
                    reset=True,
                )
                email_sent = True
            except (RuntimeError, ValueError) as error:
                email_error = str(error)
            return self.send_json(
                {
                    "ok": True,
                    "temporary_password": temp_password,
                    "email": tutor["email"],
                    "email_sent": email_sent,
                    "email_error": email_error,
                }
            )

        if path.startswith("/api/users/") and path.endswith("/update"):
            if not self.require_master():
                return
            tutor_id = int(path.split("/")[3])
            with db() as conn:
                conn.execute(
                    """
                    UPDATE users
                    SET name = ?, email = ?, hourly_rate = ?
                    WHERE user_id = ? AND role = 'Tutor'
                    """,
                    (
                        payload["name"],
                        payload["email"].lower(),
                        float(payload.get("hourly_rate") or 0),
                        tutor_id,
                    ),
                )
            return self.send_json({"ok": True})

        if path.startswith("/api/users/") and path.endswith("/status"):
            if not self.require_master():
                return
            tutor_id = int(path.split("/")[3])
            active = 1 if payload.get("active") else 0
            with db() as conn:
                tutor = conn.execute(
                    "SELECT user_id FROM users WHERE user_id = ? AND role = 'Tutor'",
                    (tutor_id,),
                ).fetchone()
                if not tutor:
                    return self.send_json({"error": "Tutor not found."}, 404)
                conn.execute("UPDATE users SET active = ? WHERE user_id = ?", (active, tutor_id))
                if not active:
                    conn.execute("DELETE FROM sessions WHERE user_id = ?", (tutor_id,))
            return self.send_json({"ok": True, "active": bool(active)})

        if path.startswith("/api/users/") and path.endswith("/delete"):
            if not self.require_master():
                return
            tutor_id = int(path.split("/")[3])
            with db() as conn:
                tutor = conn.execute(
                    "SELECT name FROM users WHERE user_id = ? AND role = 'Tutor'",
                    (tutor_id,),
                ).fetchone()
                if not tutor:
                    return self.send_json({"error": "Tutor not found."}, 404)
                usage = conn.execute(
                    """
                    SELECT
                      (SELECT COUNT(*) FROM bookings WHERE tutor_id = ?) AS booking_count,
                      (SELECT COUNT(*) FROM lesson_records WHERE tutor_id = ?) AS lesson_count,
                      (SELECT COUNT(*) FROM students WHERE assigned_tutor_id = ?) AS student_count
                    """,
                    (tutor_id, tutor_id, tutor_id),
                ).fetchone()
                if usage["booking_count"] or usage["lesson_count"]:
                    return self.send_json(
                        {
                            "error": "This tutor has booking or lesson history and cannot be removed. Make the account inactive instead."
                        },
                        409,
                    )
                conn.execute("DELETE FROM users WHERE user_id = ?", (tutor_id,))
            return self.send_json(
                {"ok": True, "unassigned_students": usage["student_count"]}
            )

        if path == "/api/students":
            if not self.require_master():
                return
            with db() as conn:
                conn.execute(
                    """
                    INSERT INTO students
                      (student_name, parent_name, parent_email, year_group, target_school,
                       assigned_tutor_id, hourly_rate, active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        payload["student_name"],
                        payload.get("parent_name", ""),
                        payload.get("parent_email", ""),
                        payload.get("year_group", ""),
                        payload.get("target_school", ""),
                        int(payload["assigned_tutor_id"]) if payload.get("assigned_tutor_id") else None,
                        float(payload.get("hourly_rate") or 0),
                        now_iso(),
                    ),
                )
            return self.send_json({"ok": True})

        if path.startswith("/api/students/") and path.endswith("/assign"):
            if not self.require_master():
                return
            student_id = int(path.split("/")[3])
            with db() as conn:
                conn.execute("UPDATE students SET assigned_tutor_id = ? WHERE student_id = ?", (payload.get("assigned_tutor_id") or None, student_id))
            return self.send_json({"ok": True})

        if path.startswith("/api/students/") and path.endswith("/update"):
            if not self.require_master():
                return
            student_id = int(path.split("/")[3])
            with db() as conn:
                conn.execute(
                    """
                    UPDATE students
                    SET student_name = ?, parent_name = ?, parent_email = ?, year_group = ?,
                        target_school = ?, assigned_tutor_id = ?, hourly_rate = ?, active = ?
                    WHERE student_id = ?
                    """,
                    (
                        payload["student_name"],
                        payload.get("parent_name", ""),
                        payload.get("parent_email", ""),
                        payload.get("year_group", ""),
                        payload.get("target_school", ""),
                        int(payload["assigned_tutor_id"]) if payload.get("assigned_tutor_id") else None,
                        float(payload.get("hourly_rate") or 0),
                        1 if payload.get("active", True) else 0,
                        student_id,
                    ),
                )
            return self.send_json({"ok": True})

        if path == "/api/bookings":
            tutor_id = int(payload.get("tutor_id") or user["user_id"])
            if user["role"] != "Master" and tutor_id != user["user_id"]:
                return self.send_json({"error": "Tutors can only book their own lessons."}, 403)
            repeat = int(payload.get("repeat_weeks") or 1)
            if repeat not in {1, 4, 8, 12, 24}:
                return self.send_json({"error": "Choose one-off, 4, 8, 12, or 24 weeks."}, 400)
            start = datetime.fromisoformat(payload["start_at"])
            with db() as conn:
                tutor = conn.execute(
                    "SELECT user_id FROM users WHERE user_id = ? AND role IN ('Master', 'Tutor') AND active = 1",
                    (tutor_id,),
                ).fetchone()
                if not tutor:
                    return self.send_json({"error": "Choose an active tutor for this booking."}, 400)
                for week in range(max(1, repeat)):
                    item_start = start + timedelta(days=7 * week)
                    conn.execute(
                        """
                        INSERT INTO bookings
                          (student_id, tutor_id, start_at, duration_minutes, notes, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            int(payload["student_id"]),
                            tutor_id,
                            item_start.replace(microsecond=0).isoformat(),
                            int(payload.get("duration_minutes") or 60),
                            payload.get("notes", ""),
                            user["user_id"],
                            now_iso(),
                        ),
                    )
            return self.send_json({"ok": True})

        if path.startswith("/api/bookings/") and path.endswith("/complete"):
            booking_id = int(path.split("/")[3])
            wants_email = bool(payload.get("emailed_to_parent"))
            with db() as conn:
                booking = conn.execute("SELECT * FROM bookings WHERE booking_id = ?", (booking_id,)).fetchone()
                if not booking:
                    return self.send_json({"error": "Booking not found."}, 404)
                if user["role"] != "Master" and booking["tutor_id"] != user["user_id"]:
                    return self.send_json({"error": "You can only complete your own lessons."}, 403)
                conn.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", (booking_id,))
                conn.execute(
                    """
                    INSERT INTO lesson_records
                      (booking_id, student_id, tutor_id, completed_at, attendance_status, parent_summary,
                       emailed_to_parent, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(booking_id) DO UPDATE SET
                      completed_at = excluded.completed_at,
                      attendance_status = excluded.attendance_status,
                      parent_summary = excluded.parent_summary,
                      emailed_to_parent = excluded.emailed_to_parent,
                      updated_at = excluded.updated_at
                    """,
                    (
                        booking_id,
                        booking["student_id"],
                        booking["tutor_id"],
                        booking["start_at"],
                        payload.get("attendance_status", "Completed"),
                        payload.get("parent_summary", ""),
                        0,
                        now_iso(),
                        now_iso(),
                    ),
                )
                student = conn.execute("SELECT parent_email, student_name FROM students WHERE student_id = ?", (booking["student_id"],)).fetchone()
            email_sent = False
            email_error = ""
            message_id = ""
            if wants_email:
                try:
                    message_id = send_lesson_email(
                        student["parent_email"],
                        student["student_name"],
                        payload.get("parent_summary", ""),
                        user.get("email", ""),
                    )
                    email_sent = True
                    with db() as conn:
                        conn.execute(
                            "UPDATE lesson_records SET emailed_to_parent = 1, updated_at = ? WHERE booking_id = ?",
                            (now_iso(), booking_id),
                        )
                except (RuntimeError, ValueError) as error:
                    email_error = str(error)
            return self.send_json(
                {
                    "ok": True,
                    "parent_email": student["parent_email"],
                    "student_name": student["student_name"],
                    "email_sent": email_sent,
                    "email_error": email_error,
                    "postmark_message_id": message_id,
                }
            )

        if path.startswith("/api/bookings/") and path.endswith("/update"):
            booking_id = int(path.split("/")[3])
            with db() as conn:
                booking = conn.execute("SELECT * FROM bookings WHERE booking_id = ?", (booking_id,)).fetchone()
                if not booking:
                    return self.send_json({"error": "Booking not found."}, 404)
                if user["role"] != "Master" and booking["tutor_id"] != user["user_id"]:
                    return self.send_json({"error": "You can only edit your own lessons."}, 403)
                tutor_id = int(payload.get("tutor_id") or booking["tutor_id"])
                if user["role"] != "Master" and tutor_id != user["user_id"]:
                    return self.send_json({"error": "Tutors can only keep lessons assigned to themselves."}, 403)
                tutor = conn.execute(
                    "SELECT user_id FROM users WHERE user_id = ? AND role IN ('Master', 'Tutor') AND active = 1",
                    (tutor_id,),
                ).fetchone()
                if not tutor:
                    return self.send_json({"error": "Choose an active tutor for this booking."}, 400)
                conn.execute(
                    """
                    UPDATE bookings
                    SET student_id = ?, tutor_id = ?, start_at = ?, duration_minutes = ?, notes = ?
                    WHERE booking_id = ?
                    """,
                    (
                        int(payload["student_id"]),
                        tutor_id,
                        datetime.fromisoformat(payload["start_at"]).replace(microsecond=0).isoformat(),
                        int(payload.get("duration_minutes") or 60),
                        payload.get("notes", ""),
                        booking_id,
                    ),
                )
            return self.send_json({"ok": True})

        if path.startswith("/api/bookings/") and path.endswith("/cancel"):
            booking_id = int(path.split("/")[3])
            with db() as conn:
                booking = conn.execute("SELECT * FROM bookings WHERE booking_id = ?", (booking_id,)).fetchone()
                if not booking:
                    return self.send_json({"error": "Booking not found."}, 404)
                if user["role"] != "Master" and booking["tutor_id"] != user["user_id"]:
                    return self.send_json({"error": "You can only cancel your own lessons."}, 403)
                conn.execute("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?", (booking_id,))
            return self.send_json({"ok": True})

        if path.startswith("/api/bookings/") and path.endswith("/delete"):
            if not self.require_master():
                return
            booking_id = int(path.split("/")[3])
            with db() as conn:
                conn.execute("DELETE FROM bookings WHERE booking_id = ?", (booking_id,))
            return self.send_json({"ok": True})

        if path == "/api/timesheet/submit":
            start, end = query_period({"month": [payload.get("month", datetime.now().strftime("%Y-%m"))]})
            with db() as conn:
                conn.execute(
                    "UPDATE lesson_records SET timesheet_submitted = 1, timesheet_status = 'Submitted' WHERE tutor_id = ? AND completed_at >= ? AND completed_at < ?",
                    (user["user_id"], start, end),
                )
            return self.send_json({"ok": True})

        if path == "/api/timesheet/status":
            if not self.require_master():
                return
            start, end = query_period({"month": [payload.get("month", datetime.now().strftime("%Y-%m"))]})
            status = payload.get("status", "Submitted")
            if status not in {"Submitted", "Approved", "Queried"}:
                return self.send_json({"error": "Choose Submitted, Approved, or Queried."}, 400)
            tutor_id = int(payload["tutor_id"])
            with db() as conn:
                conn.execute(
                    "UPDATE lesson_records SET timesheet_status = ?, timesheet_submitted = 1 WHERE tutor_id = ? AND completed_at >= ? AND completed_at < ?",
                    (status, tutor_id, start, end),
                )
            return self.send_json({"ok": True})

        return self.send_json({"error": "Not found"}, 404)

    def export_lessons_csv(self, lessons, rate_key="student_rate"):
        return self.send_csv(
            "lesson-report.csv",
            self.csv_for_lessons(lessons, include_notes=True, rate_key=rate_key),
        )

    def export_timesheet_csv(self, lessons):
        return self.send_csv(
            "timesheet.csv",
            self.csv_for_lessons(lessons, include_notes=False, rate_key="tutor_rate"),
        )

    def csv_for_lessons(self, lessons, include_notes: bool, rate_key: str):
        from io import StringIO

        output = StringIO()
        fields = ["Date", "Student", "Tutor", "Duration", "Rate", "Fee", "Status", "Timesheet Status"]
        if include_notes:
            fields.append("Parent Notes")
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        for lesson in lessons:
            minutes = int(lesson.get("duration_minutes") or 0)
            rate = float(lesson.get(rate_key) or 0)
            row = {
                "Date": lesson.get("start_at") or lesson.get("completed_at"),
                "Student": lesson.get("student_name", ""),
                "Tutor": lesson.get("tutor_name", ""),
                "Duration": minutes,
                "Rate": rate,
                "Fee": round((minutes / 60) * rate, 2),
                "Status": lesson.get("attendance_status", ""),
                "Timesheet Status": lesson.get("timesheet_status") or ("Submitted" if lesson.get("timesheet_submitted") else "Draft"),
            }
            if include_notes:
                row["Parent Notes"] = lesson.get("parent_summary", "")
            writer.writerow(row)
        return output.getvalue()


if __name__ == "__main__":
    attempts = 10 if DATABASE_URL else 1
    for attempt in range(1, attempts + 1):
        try:
            init_db()
            break
        except Exception:
            if attempt == attempts:
                raise
            print(f"Database unavailable; retrying startup ({attempt}/{attempts})...", flush=True)
            time.sleep(2)
    PUBLIC.mkdir(exist_ok=True)
    print(f"TutorFlow Agency running at http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()

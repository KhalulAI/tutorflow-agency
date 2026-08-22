# TutorFlow Agency

A lightweight tutoring-agency application that runs locally with SQLite and on
Railway with PostgreSQL. Parent lesson emails are sent through Postmark.

## Workflow

- Master account creates tutor accounts.
- Master adds students with one or more parent email addresses and assigns each student to a tutor.
- Master can unassign, archive, or permanently delete a student and their records.
- Master and tutors can add lessons to the shared calendar.
- Master/tutors can edit or cancel lessons; master can permanently delete lessons.
- Tutors complete lessons, write parent notes, and can send them through Postmark.
- Tutors produce and submit monthly timesheets.
- Master can approve/query timesheets.
- Master can review lesson records by tutor, student, or month and export notes.
- Master-only finance reports show gross income, tutor costs, expenses, net income,
  and rolling 12-month turnover against a configurable VAT threshold.
- Master can reset tutor passwords and download a database backup.

## Run

```powershell
cd "C:\Users\conta\Documents\Codex\2026-06-18\build-a-simple-web-application-for\agency_app"
.\run_agency_server.ps1
```

Then open:

```text
http://127.0.0.1:8010
```

SQLite is used when `DATABASE_URL` is not set. To test with PostgreSQL, install
the dependencies and provide a PostgreSQL connection string:

```powershell
python -m pip install -r requirements.txt
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/tutorflow"
python server.py
```

## Deploy to Railway

1. Push the repository to a Git provider and create a Railway service from it.
2. Set the service **Root Directory** to `/agency_app`. Railway will use
   `railway.toml` and install `requirements.txt` from this directory.
3. Add a Railway PostgreSQL service to the same project.
4. In the app service, add `DATABASE_URL` as a reference to
   `${{Postgres.DATABASE_URL}}` (adjust `Postgres` if the database service has a
   different name).
5. Add the Postmark variables below to the app service.
6. Generate a public domain for the app service, deploy it, then visit the URL
   to create the first Master account.

The app binds to Railway's injected `PORT`, creates its schema on startup, and
exposes `GET /api/health` for deployment health checks.

## Postmark variables

Required to send parent emails:

```text
POSTMARK_SERVER_TOKEN=your-postmark-server-token
POSTMARK_FROM_EMAIL=verified-sender@example.com
```

Optional:

```text
POSTMARK_MESSAGE_STREAM=outbound
VAT_THRESHOLD=90000
```

`VAT_THRESHOLD` defaults to `90000` when omitted. The VAT display is a planning
aid based on recorded gross lesson charges; confirm which supplies form taxable
turnover with an accountant.

`POSTMARK_FROM_EMAIL` must be a verified sender signature or belong to a
verified sending domain in Postmark. For a non-delivering configuration test,
Postmark supports `POSTMARK_API_TEST` as the server token.

Do not upload the local `.env` file or the SQLite database to Railway. Production
data lives in PostgreSQL. The Master account can download a portable ZIP backup
from Settings; PostgreSQL backups contain JSON exports of the application tables.

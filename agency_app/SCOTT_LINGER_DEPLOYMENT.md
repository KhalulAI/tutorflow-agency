# Scott Linger: separate personal tutoring instance

This is the same software, not a shared database or an account inside the agency.
Do not copy agency data, database credentials or backups into this instance.
Do not move company income into personal records merely to alter VAT totals.
Confirm the correct supplier and VAT treatment with your accountant.

## Deployment (requires Railway account access)

1. Leave the existing agency project and its variables unchanged. Publish the
   business-branding code changes to the existing GitHub repository first.
2. Create a NEW Railway project named `Scott Linger Tutoring`. Billing may be
   shared with the existing workspace, but usage increases. Agree who pays before
   creating billable resources; no paid plan changes are made by this code.
3. Add a NEW PostgreSQL service in that project. Deploy the same GitHub repository
   and `main` branch as a NEW app service, with root directory `/agency_app`.
   Set its Railway configuration-file path to `/agency_app/railway.personal.toml`.
   Confirm the effective start command is `python personal_server.py`, not the
   agency's `python server.py`. Leave the original agency service unchanged.
4. Set the following on the NEW app service only:

   ```text
   BUSINESS_NAME=Scott Linger
   APP_NAME=Scott Linger - TutorFlow
   WORKSPACE_NAME=Scott Linger
   EMAIL_SENDER_NAME=Scott Linger - TutorFlow
   HOST=0.0.0.0
   COOKIE_SECURE=1
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   POSTMARK_MESSAGE_STREAM=outbound
   POSTMARK_FROM_EMAIL=contact@scottlinger.co.uk
   ```

   The database reference MUST resolve to the new project's Postgres service,
   not the agency database. Adjust the reference if that service has another name.
5. In Postmark, create a separate server for personal tutoring (or use a separate
   Postmark account for separate billing). Set `POSTMARK_SERVER_TOKEN` from that
   server, and verify `contact@scottlinger.co.uk` as the sender address.
   Do not paste real API tokens into Git or screenshots.
6. Deploy and generate a domain. Set `APP_BASE_URL` to that new HTTPS address
   (no trailing slash) so all emailed login/reset links go to the personal app.
7. Open `/api/health` and confirm `ok`, `postgresql` and Postmark configured.
   This does not prove email delivery: send a test lesson note to yourself.
8. Open the new site and immediately create your own Master account with a unique
   password. Do not share the URL before this setup; the first-run setup endpoint
   is public. If any agency records or an existing login appear, STOP: check the
   database reference before entering or changing any records.

## Personal teaching and bookkeeping

Your Master login is also available in teaching selections in personal mode.
Assign your own students and bookings to yourself; no second email/login is needed.
Enter the fee paid by the family in the client rate field. When you complete your
own lesson, its tutor cost is automatically recorded as zero, even if a student
has an old/custom tutor rate. This avoids treating owner drawings as subcontractor
costs. Your tutor timesheet therefore shows zero tutor pay; use Reports/Finance for
your income. Actual external Tutor accounts retain their agreed tutor costs.

## Local preview (not the public app)

Run `powershell -ExecutionPolicy Bypass -File .\run_personal_server.ps1` from
`agency_app`, then open `http://127.0.0.1:8011`. Keep that PowerShell window open.
The launcher uses separate ignored `personal_data` storage and disables production
database/email credentials. Local data is not uploaded to Railway automatically.

Record genuine business expenses in the relevant instance only. For shared bills,
retain the supplier invoice and an agreed allocation/reimbursement record; do not
claim the full invoice in both businesses. Net income here is an internal operating
figure, not a tax return or bank reconciliation. The VAT chart remains a gross
lesson-income indicator, not an automatic ruling on exempt/taxable supplies.

## Acceptance checks before client use

- Header, browser title, email sender/signature and PDF say Scott Linger.
- Both sites have distinct URLs, databases, user accounts and backup files.
- A dummy personal lesson appears only in personal reports, never agency reports.
- A one-hour personal lesson charged at 100 with zero tutor rate reports income
  100, tutor cost 0 and net 100 before other expenses.
- Login, reset link, notes delivery, PDF download and month locking work.
- Agency UI/emails/PDF keep their existing branding and existing records.

Changes to the shared GitHub branch will deploy to both services when automatic
deployments are enabled. Take independent backups before database changes.

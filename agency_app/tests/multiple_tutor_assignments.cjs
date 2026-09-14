const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '../public');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const owner = { user_id: 1, role: 'Master', name: 'Agency Owner', email: 'owner@example.com', active: 1 };
    const tutors = [
      { user_id: 2, role: 'Tutor', name: 'Maths Tutor', email: 'maths@example.com', active: 1, hourly_rate: 30 },
      { user_id: 3, role: 'Tutor', name: 'English Tutor', email: 'english@example.com', active: 1, hourly_rate: 35 },
    ];
    const student = {
      student_id: 10, student_name: 'Shared Student', parent_name: 'Pat Parent',
      parent_email: 'parent@example.com', hourly_rate: 70, active: 1,
      assignments: [
        { tutor_id: 2, tutor_name: 'Maths Tutor', subject: 'Maths', client_hourly_rate: 75, tutor_hourly_rate: 40, effective_client_rate: 75, effective_tutor_rate: 40 },
        { tutor_id: 3, tutor_name: 'English Tutor', subject: 'English', client_hourly_rate: null, tutor_hourly_rate: 45, effective_client_rate: 70, effective_tutor_rate: 45 },
      ],
    };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const responses = {
        '/api/business': { business_name: 'SWL Education Ltd', app_name: 'TutorFlow Agency', workspace_name: 'Agency', personal_workspace: false },
        '/api/setup-status': { has_master: true },
        '/api/session': { user: owner },
        '/api/students': { students: [student] },
        '/api/users': { users: [owner, ...tutors] },
        '/api/bookings': { bookings: [], month_locked: false },
        '/api/reports/lessons': { lessons: [] },
      };
      if (responses[url.pathname]) return route.fulfill({ json: responses[url.pathname] });
      const assets = {
        '/': ['index.html', 'text/html'],
        '/app.js': ['app.js', 'text/javascript'],
        '/styles.css': ['styles.css', 'text/css'],
      };
      const asset = assets[url.pathname];
      if (asset) return route.fulfill({ body: fs.readFileSync(path.join(publicDir, asset[0])), contentType: asset[1] });
      return route.fulfill({ json: {} });
    });

    await page.goto('http://tutorflow.test/');
    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await page.waitForSelector('[data-assignment-row]');
    assert.equal(await page.locator('#studentAssignments [data-assignment-row]').count(), 2);
    assert.match(await page.locator('#studentList').textContent(), /Maths Tutor/);
    assert.match(await page.locator('#studentList').textContent(), /English Tutor/);
    assert.match(await page.locator('#studentList').textContent(), /Maths/);
    assert.match(await page.locator('#studentList').textContent(), /English/);

    await page.locator('[data-edit-student="10"]').click();
    assert.equal(await page.locator('#studentEditAssignments [data-assignment-enabled]:checked').count(), 2);
    await page.locator('#closeStudentEditX').click();

    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await page.locator('#bookingStudent').selectOption('10');
    const tutorChoices = await page.locator('#bookingTutor option').allTextContents();
    assert.deepEqual(tutorChoices, ['Choose assigned tutor', 'Maths Tutor · Maths', 'English Tutor · English']);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

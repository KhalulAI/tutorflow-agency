// Run with Node and Playwright available. Uses synthetic API responses only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '../public');
const longName = 'Alexandertheverylongstudentname Example';
const parentEmails = 'averylongparentemailaddress@example.com, second.parent@example.com';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const role of ['Tutor', 'Master']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        const user = { user_id: 2, role, name: 'Test Tutor', email: 'tutor@example.com', active: 1, hourly_rate: 80 };
        const student = {
          student_id: 1, student_name: longName, parent_name: 'Pat Example',
          parent_email: parentEmails, tutor_name: 'Test Tutor', assigned_tutor_id: 2,
          tutor_rate: 80, active: 1,
          ...(role === 'Master' ? { hourly_rate: 130, tutor_hourly_rate: 80 } : {}),
        };
        const responses = {
          '/api/business': { business_name: 'Scott Linger', app_name: 'Scott Linger - TutorFlow', workspace_name: 'Scott Linger', personal_workspace: role === 'Master' },
          '/api/setup-status': { has_master: true },
          '/api/session': { user },
          '/api/students': { students: [student, { ...student, student_id: 2, student_name: 'Second Student', active: 0 }] },
          '/api/users': { users: [user, { ...user, user_id: 3, role: 'Tutor' }] },
          '/api/bookings': { bookings: [
            { booking_id: 1, student_id: 1, student_name: longName, tutor_id: 2, tutor_name: 'Test Tutor', start_at: '2026-09-10T16:00:00', duration_minutes: 45, status: 'Booked', month_locked: 0 },
            { booking_id: 2, student_id: 2, student_name: 'Second Student', tutor_id: 2, tutor_name: 'Test Tutor', start_at: '2026-09-11T16:00:00', duration_minutes: 60, status: 'Completed', month_locked: 0 },
            { booking_id: 3, student_id: 1, student_name: longName, tutor_id: 2, tutor_name: 'Test Tutor', parent_email: parentEmails, start_at: '2020-01-02T16:00:00', duration_minutes: 60, status: 'Booked', month_locked: 0 },
          ], month_locked: false },
          '/api/reports/lessons': { lessons: [{
            lesson_record_id: 1, student_name: longName, tutor_name: 'Test Tutor',
            start_at: '2026-09-10T16:00:00', duration_minutes: 60,
            student_rate: 130, tutor_rate: 80, attendance_status: 'Completed',
          }] },
        };
        if (responses[url.pathname]) {
          return route.fulfill({ json: responses[url.pathname] });
        }
        const assets = {
          '/': ['index.html', 'text/html'],
          '/app.js': ['app.js', 'text/javascript'],
          '/styles.css': ['styles.css', 'text/css'],
        };
        const asset = assets[url.pathname];
        if (asset) return route.fulfill({ body: fs.readFileSync(path.join(publicDir, asset[0])), contentType: asset[1] });
        return route.fulfill({ status: 404, body: '' });
      });
      await page.goto('http://tutorflow.test/');
      await page.waitForFunction(() => document.querySelector('#bookingStudent').options.length > 1);
      assert.equal(await page.title(), 'Scott Linger - TutorFlow');
      assert.equal(await page.locator('.sidebar h1').textContent(), 'Scott Linger');
      if (role === 'Master') {
        await page.waitForFunction(() => document.querySelector('#completionList [data-quick-complete="3"]'));
        await page.waitForTimeout(25);
        await page.locator('#completionList [data-quick-complete="3"]').click();
        assert.equal(await page.locator('#completeDialog').evaluate(dialog => dialog.open), true);
        assert.match(await page.locator('#completeContext').textContent(), new RegExp(longName));
        assert.match(await page.locator('#completeRecipient').textContent(), /averylongparentemailaddress@example\.com/);
        assert.equal(await page.locator('#emailParent').isChecked(), true);
        assert.equal(await page.locator('#emailParent').isEnabled(), true);
        await page.locator('#closeCompleteDialogX').click();
        assert.equal(await page.locator('#assignedTutor option[value="2"]').count(), 1);
        assert.equal(await page.locator('#bookingTutor option[value="2"]').count(), 1);
        assert.equal(await page.locator('#timesheetTutor option[value="2"]').count(), 1);
        assert.equal(await page.locator('[data-tab="tutors"]').isVisible(), false);
        assert.equal(await page.locator('#completedTutor').isVisible(), false);
        assert.equal(await page.locator('#reportTutor').isVisible(), false);
        assert.equal(await page.locator('#timesheetTutor').isVisible(), false);
        await page.setViewportSize({ width: 1280, height: 640 });
        const sidebar = await page.evaluate(() => {
          const aside = document.querySelector('.sidebar');
          const nav = aside.querySelector('nav');
          const settings = nav.querySelector('[data-tab="settings"]');
          settings.scrollIntoView({ block: 'nearest' });
          const asideRect = aside.getBoundingClientRect();
          const settingsRect = settings.getBoundingClientRect();
          return {
            asideBottom: asideRect.bottom,
            viewportHeight: innerHeight,
            settingsTop: settingsRect.top,
            settingsBottom: settingsRect.bottom,
            navScrollable: nav.scrollHeight > nav.clientHeight,
          };
        });
        assert.ok(sidebar.navScrollable, 'short desktop sidebar should scroll');
        assert.ok(sidebar.asideBottom <= sidebar.viewportHeight + 1, 'sidebar background must stay within viewport');
        assert.ok(sidebar.settingsTop >= 0 && sidebar.settingsBottom <= sidebar.viewportHeight + 1,
          `Settings should be reachable within sidebar: ${JSON.stringify(sidebar)}`);
      }
      await page.getByRole('button', { name: 'Students', exact: true }).click();
      for (const width of (role === 'Tutor' ? [320, 375, 640, 768, 980, 1024, 1280, 1920] : [1024, 1280, 1920])) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.evaluate(() => {
          const grid = document.querySelector('#students .grid-two');
          const form = document.querySelector('#studentForm');
          const panel = document.querySelector('.student-directory-panel');
          const wrap = document.querySelector('#studentList .table-wrap');
          const row = document.querySelector('.student-table tbody tr');
          return {
            pageWidth: document.documentElement.clientWidth,
            pageScrollWidth: document.documentElement.scrollWidth,
            gridWidth: grid.getBoundingClientRect().width,
            formWidth: form.getBoundingClientRect().width,
            formBottom: form.getBoundingClientRect().bottom,
            panelWidth: panel.getBoundingClientRect().width,
            panelTop: panel.getBoundingClientRect().top,
            panelRight: panel.getBoundingClientRect().right,
            wrapWidth: wrap.clientWidth, wrapScrollWidth: wrap.scrollWidth,
            rowDisplay: getComputedStyle(row).display,
            headers: [...document.querySelectorAll('.student-table th')].map(el => el.textContent),
            overflowingCells: [...row.cells].filter(el => el.scrollWidth > el.clientWidth + 1).length,
            activePages: [...document.querySelectorAll('.page.active')].map(el => el.id),
            outside: [...document.querySelectorAll('body *')].filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width && rect.right > innerWidth + 1 && !el.closest('.table-wrap');
            }).slice(0, 10).map(el => `${el.tagName}#${el.id}.${el.className}`),
          };
        });
        assert.ok(metrics.pageScrollWidth <= width + 1, `${role} ${width}: page overflows ${JSON.stringify(metrics)}`);
        assert.ok(metrics.panelRight <= width + 1, `${role} ${width}: panel extends off-screen`);
        if (role === 'Tutor') {
          assert.ok(Math.abs(metrics.gridWidth - metrics.panelWidth) <= 1, `${width}: tutor directory is not full width`);
          assert.ok(metrics.wrapScrollWidth <= metrics.wrapWidth + 1, `${width}: tutor table needs horizontal scrolling`);
          assert.equal(metrics.overflowingCells, 0, `${width}: cell content is clipped`);
          assert.ok(!metrics.headers.includes('Client rate'), 'Client rates must not be rendered for tutors');
          assert.ok(metrics.headers.includes('Your rate'));
          if (width <= 768) assert.equal(metrics.rowDisplay, 'grid');
          if (width === 1280) assert.equal(metrics.rowDisplay, 'table-row');
          if (process.env.LAYOUT_SCREENSHOTS && [375, 1280].includes(width)) {
            await page.screenshot({ path: path.join(process.env.LAYOUT_SCREENSHOTS, `tutor-directory-${width}.png`), fullPage: true });
          }
        } else {
          assert.ok(Math.abs(metrics.gridWidth - metrics.formWidth) <= 1, `${width}: personal add-student form is not full width`);
          assert.ok(Math.abs(metrics.gridWidth - metrics.panelWidth) <= 1, `${width}: personal directory is not full width`);
          assert.ok(metrics.panelTop >= metrics.formBottom, `${width}: personal directory is not below the add-student form`);
          assert.ok(metrics.headers.includes('Hourly charge'));
          assert.ok(!metrics.headers.includes('Tutor'));
          assert.ok(!metrics.headers.includes('Tutor rate'));
        }
        console.log(`${role} ${width}px: layout passed (${metrics.rowDisplay})`);
      }
      if (role === 'Master') {
        await page.setViewportSize({ width: 1024, height: 900 });
        await page.getByRole('button', { name: 'Reports', exact: true }).click();
        await page.waitForSelector('#reportList .notice');
        const reportMetrics = await page.evaluate(() => {
          const load = document.querySelector('#loadReports').getBoundingClientRect();
          const download = document.querySelector('#downloadReports').getBoundingClientRect();
          return {
            loadWidth: load.width,
            loadHeight: load.height,
            downloadWidth: download.width,
            downloadHeight: download.height,
            summary: document.querySelector('#reportList .notice').textContent,
          };
        });
        assert.ok(Math.abs(reportMetrics.loadWidth - reportMetrics.downloadWidth) <= 1, 'report buttons should have equal widths');
        assert.ok(Math.abs(reportMetrics.loadHeight - reportMetrics.downloadHeight) <= 1, 'report buttons should have equal heights');
        assert.doesNotMatch(reportMetrics.summary, /Students:/, 'report summary should not include the student breakdown');
        await page.getByRole('button', { name: 'Calendar', exact: true }).click();
        await page.waitForSelector('.calendar-grid .day');
        const calendarMetrics = await page.evaluate(() => {
          const date = document.querySelector('#bookingDate').getBoundingClientRect();
          const time = document.querySelector('#bookingTime').getBoundingClientRect();
          const day = document.querySelector('.calendar-grid .day');
          const lessonBlocks = [...document.querySelectorAll('.booking-chip')].map(element => ({
            height: element.getBoundingClientRect().height,
            background: getComputedStyle(element).backgroundColor,
            completed: element.classList.contains('completed'),
          }));
          return {
            dateRight: date.right,
            timeLeft: time.left,
            dayMinHeight: parseFloat(getComputedStyle(day).minHeight),
            dayOverflowY: getComputedStyle(day).overflowY,
            legendItems: document.querySelectorAll('.calendar-legend-item').length,
            lessonBlocks,
            pageScrollWidth: document.documentElement.scrollWidth,
            pageWidth: document.documentElement.clientWidth,
          };
        });
        assert.ok(calendarMetrics.dateRight < calendarMetrics.timeLeft, `date and time controls overlap: ${JSON.stringify(calendarMetrics)}`);
        assert.ok(calendarMetrics.dayMinHeight >= 220, 'calendar days should have more vertical room');
        assert.equal(calendarMetrics.dayOverflowY, 'visible', 'calendar days should not have individual scrollbars');
        assert.equal(calendarMetrics.legendItems, 2, 'calendar should show a colour key for visible students');
        assert.ok(calendarMetrics.lessonBlocks[1].height > calendarMetrics.lessonBlocks[0].height, 'a 60-minute lesson should be taller than a 45-minute lesson');
        assert.notEqual(calendarMetrics.lessonBlocks[0].background, calendarMetrics.lessonBlocks[1].background, 'students should have different calendar colours');
        assert.equal(calendarMetrics.lessonBlocks[0].completed, false, 'booked lessons should retain their normal appearance');
        assert.equal(calendarMetrics.lessonBlocks[1].completed, true, 'completed lessons should receive the completed appearance');
        assert.ok(calendarMetrics.pageScrollWidth <= calendarMetrics.pageWidth + 1, 'calendar page should not overflow horizontally');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

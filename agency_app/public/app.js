const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  authScreen: $("#authScreen"),
  appShell: $("#appShell"),
  setupForm: $("#setupForm"),
  loginForm: $("#loginForm"),
  setupName: $("#setupName"),
  setupEmail: $("#setupEmail"),
  setupPassword: $("#setupPassword"),
  setupMessage: $("#setupMessage"),
  loginEmail: $("#loginEmail"),
  loginPassword: $("#loginPassword"),
  loginMessage: $("#loginMessage"),
  logoutButton: $("#logoutButton"),
  userBadge: $("#userBadge"),
  tabs: $$(".tab"),
  pages: $$(".page"),
  homeMonth: $("#homeMonth"),
  homeStats: $("#homeStats"),
  upcomingList: $("#upcomingList"),
  completionList: $("#completionList"),
  tutorForm: $("#tutorForm"),
  tutorName: $("#tutorName"),
  tutorEmail: $("#tutorEmail"),
  tutorRate: $("#tutorRate"),
  tutorMessage: $("#tutorMessage"),
  tutorList: $("#tutorList"),
  studentForm: $("#studentForm"),
  studentName: $("#studentName"),
  parentName: $("#parentName"),
  parentEmail: $("#parentEmail"),
  yearGroup: $("#yearGroup"),
  targetSchool: $("#targetSchool"),
  studentRate: $("#studentRate"),
  assignedTutor: $("#assignedTutor"),
  studentMessage: $("#studentMessage"),
  studentList: $("#studentList"),
  calendarMonth: $("#calendarMonth"),
  bookingForm: $("#bookingForm"),
  bookingStudent: $("#bookingStudent"),
  bookingTutor: $("#bookingTutor"),
  bookingDate: $("#bookingDate"),
  bookingTime: $("#bookingTime"),
  bookingDuration: $("#bookingDuration"),
  bookingRepeat: $("#bookingRepeat"),
  bookingNotes: $("#bookingNotes"),
  bookingMessage: $("#bookingMessage"),
  calendarGrid: $("#calendarGrid"),
  completeDialog: $("#completeDialog"),
  completeForm: $("#completeForm"),
  completeContext: $("#completeContext"),
  completeBookingId: $("#completeBookingId"),
  attendanceStatus: $("#attendanceStatus"),
  parentSummary: $("#parentSummary"),
  emailParent: $("#emailParent"),
  completeMessage: $("#completeMessage"),
  cancelComplete: $("#cancelComplete"),
  timesheetMonth: $("#timesheetMonth"),
  timesheetTutor: $("#timesheetTutor"),
  loadTimesheet: $("#loadTimesheet"),
  downloadTimesheet: $("#downloadTimesheet"),
  submitTimesheet: $("#submitTimesheet"),
  timesheetSummary: $("#timesheetSummary"),
  timesheetList: $("#timesheetList"),
  reportMonth: $("#reportMonth"),
  reportTutor: $("#reportTutor"),
  reportStudent: $("#reportStudent"),
  loadReports: $("#loadReports"),
  downloadReports: $("#downloadReports"),
  reportList: $("#reportList"),
  emailDraftPanel: $("#emailDraftPanel"),
  approveTimesheet: $("#approveTimesheet"),
  queryTimesheet: $("#queryTimesheet"),
  passwordForm: $("#passwordForm"),
  currentPassword: $("#currentPassword"),
  newPassword: $("#newPassword"),
  passwordMessage: $("#passwordMessage"),
  downloadBackup: $("#downloadBackup"),
  bookingDialog: $("#bookingDialog"),
  bookingEditForm: $("#bookingEditForm"),
  bookingEditContext: $("#bookingEditContext"),
  bookingEditId: $("#bookingEditId"),
  bookingEditStudent: $("#bookingEditStudent"),
  bookingEditTutor: $("#bookingEditTutor"),
  bookingEditDate: $("#bookingEditDate"),
  bookingEditTime: $("#bookingEditTime"),
  bookingEditDuration: $("#bookingEditDuration"),
  bookingEditNotes: $("#bookingEditNotes"),
  bookingEditMessage: $("#bookingEditMessage"),
  closeBookingDialog: $("#closeBookingDialog"),
  completeBookingFromDialog: $("#completeBookingFromDialog"),
  cancelBookingButton: $("#cancelBookingButton"),
  deleteBookingButton: $("#deleteBookingButton"),
};

let currentUser = null;
let tutors = [];
let students = [];
let bookings = [];
let lessons = [];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(new Date(value));
}

function datePart(value) {
  return String(value || "").slice(0, 10);
}

function timePart(value) {
  return String(value || "").slice(11, 16);
}

function money(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function switchTab(tabName) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  els.pages.forEach((page) => page.classList.toggle("active", page.id === tabName));
  if (tabName === "home") loadHome();
  if (tabName === "tutors") renderTutors();
  if (tabName === "students") renderStudents();
  if (tabName === "calendar") loadCalendar();
  if (tabName === "timesheet") loadTimesheet();
  if (tabName === "reports") loadReports();
  if (tabName === "settings") renderSettings();
}

function showApp(user) {
  currentUser = user;
  document.body.classList.toggle("tutor", user.role !== "Master");
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  els.userBadge.textContent = `${user.name} / ${user.role}`;
}

async function start() {
  els.homeMonth.value = currentMonth();
  els.calendarMonth.value = currentMonth();
  els.timesheetMonth.value = currentMonth();
  els.reportMonth.value = currentMonth();
  els.bookingDate.value = today();
  els.bookingTime.value = "16:00";

  const setup = await api("/api/setup-status");
  if (!setup.has_master) {
    els.setupForm.hidden = false;
    return;
  }
  const session = await api("/api/session");
  if (!session.user) {
    els.loginForm.hidden = false;
    return;
  }
  showApp(session.user);
  await refreshBaseData();
  switchTab("home");
}

async function refreshBaseData() {
  const [studentData, userData] = await Promise.all([
    api("/api/students"),
    currentUser.role === "Master" ? api("/api/users") : Promise.resolve({ users: [currentUser] }),
  ]);
  students = studentData.students;
  tutors = userData.users.filter((user) => user.role === "Tutor");
  renderSelects();
}

function renderSelects() {
  const tutorOptions = `<option value="">Choose tutor</option>` + tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  els.assignedTutor.innerHTML = tutorOptions;
  els.bookingTutor.innerHTML = tutorOptions;
  els.timesheetTutor.innerHTML = tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  els.reportTutor.innerHTML = `<option value="">All tutors</option>` + tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  if (!els.timesheetTutor.value && tutors[0]) els.timesheetTutor.value = tutors[0].user_id;

  const studentOptions = `<option value="">Choose student</option>` + students.map((student) => `<option value="${student.student_id}">${escapeHtml(student.student_name)}</option>`).join("");
  els.bookingStudent.innerHTML = studentOptions;
  els.bookingEditStudent.innerHTML = studentOptions;
  els.reportStudent.innerHTML = `<option value="">All students</option>` + students.map((student) => `<option value="${student.student_id}">${escapeHtml(student.student_name)}</option>`).join("");
  els.bookingEditTutor.innerHTML = tutorOptions;
}

async function setupMaster(event) {
  event.preventDefault();
  els.setupMessage.textContent = "Creating account...";
  await api("/api/setup", {
    method: "POST",
    body: JSON.stringify({ name: els.setupName.value, email: els.setupEmail.value, password: els.setupPassword.value }),
  });
  els.setupMessage.textContent = "Master account created. Sign in.";
  els.setupForm.hidden = true;
  els.loginForm.hidden = false;
}

async function login(event) {
  event.preventDefault();
  els.loginMessage.textContent = "Signing in...";
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: els.loginEmail.value, password: els.loginPassword.value }),
    });
    showApp(data.user);
    await refreshBaseData();
    switchTab("home");
  } catch (error) {
    els.loginMessage.textContent = error.message;
  }
}

async function logout() {
  await api("/api/logout", { method: "POST", body: "{}" });
  location.reload();
}

async function saveTutor(event) {
  event.preventDefault();
  els.tutorMessage.textContent = "Creating tutor...";
  const data = await api("/api/users", {
    method: "POST",
    body: JSON.stringify({ name: els.tutorName.value, email: els.tutorEmail.value, hourly_rate: els.tutorRate.value }),
  });
  if (data.email_sent) {
    els.tutorMessage.textContent = `Tutor created. Login details were emailed to ${data.email}.`;
  } else {
    els.tutorMessage.innerHTML = `Tutor created, but the login email was not sent: ${escapeHtml(data.email_error || "Email delivery is unavailable.")} Temporary password: <strong>${escapeHtml(data.temporary_password)}</strong>`;
  }
  els.tutorForm.reset();
  await refreshBaseData();
  renderTutors();
}

function renderTutors() {
  els.tutorList.innerHTML = tutors.length ? tutors.map((tutor) => `
    <article class="item" data-tutor-id="${tutor.user_id}">
      <div class="item-head"><h4>${escapeHtml(tutor.name)}</h4><span class="pill">${escapeHtml(tutor.active ? "Active" : "Inactive")}</span></div>
      <p>${escapeHtml(tutor.email)} / default rate ${money(tutor.hourly_rate)}</p>
      <div class="button-row">
        <button type="button" data-edit-tutor="${tutor.user_id}">Edit</button>
        <button class="ghost dark-ghost" type="button" data-reset-tutor="${tutor.user_id}">Reset Password</button>
      </div>
    </article>
  `).join("") : `<div class="notice">No tutor accounts yet.</div>`;
  $$("[data-edit-tutor]").forEach((button) => button.addEventListener("click", () => editTutor(Number(button.dataset.editTutor))));
  $$("[data-reset-tutor]").forEach((button) => button.addEventListener("click", () => resetTutorPassword(Number(button.dataset.resetTutor))));
}

async function editTutor(tutorId) {
  const tutor = tutors.find((item) => Number(item.user_id) === Number(tutorId));
  if (!tutor) return;
  const name = prompt("Tutor name", tutor.name);
  if (name === null) return;
  const email = prompt("Tutor email", tutor.email);
  if (email === null) return;
  const hourlyRate = prompt("Default hourly rate", tutor.hourly_rate ?? 0);
  if (hourlyRate === null) return;
  const active = confirm("Should this tutor account be active?");
  await api(`/api/users/${tutorId}/update`, {
    method: "POST",
    body: JSON.stringify({ name, email, hourly_rate: hourlyRate, active }),
  });
  await refreshBaseData();
  renderTutors();
}

async function resetTutorPassword(tutorId) {
  const tutor = tutors.find((item) => Number(item.user_id) === Number(tutorId));
  if (!tutor || !confirm(`Reset password for ${tutor.name}?`)) return;
  const data = await api(`/api/users/${tutorId}/reset-password`, { method: "POST", body: "{}" });
  if (data.email_sent) {
    alert(`Password reset. New login details were emailed to ${data.email}.`);
  } else {
    alert(`Password reset, but the email was not sent: ${data.email_error || "Email delivery is unavailable."}\n\nTemporary password for ${tutor.name}: ${data.temporary_password}`);
  }
}

async function saveStudent(event) {
  event.preventDefault();
  els.studentMessage.textContent = "Saving student...";
  await api("/api/students", {
    method: "POST",
    body: JSON.stringify({
      student_name: els.studentName.value,
      parent_name: els.parentName.value,
      parent_email: els.parentEmail.value,
      year_group: els.yearGroup.value,
      target_school: els.targetSchool.value,
      hourly_rate: els.studentRate.value,
      assigned_tutor_id: els.assignedTutor.value,
    }),
  });
  els.studentMessage.textContent = "Student saved.";
  els.studentForm.reset();
  await refreshBaseData();
  renderStudents();
}

function renderStudents() {
  els.studentList.innerHTML = students.length ? students.map((student) => `
    <article class="item" data-student-id="${student.student_id}">
      <div class="item-head"><h4>${escapeHtml(student.student_name)}</h4><span class="pill">${escapeHtml(student.tutor_name || "Unassigned")}</span></div>
      <p>${escapeHtml(student.parent_name || "No parent")} / ${escapeHtml(student.parent_email || "No email")}</p>
      <p>${escapeHtml(student.year_group || "No year group")} / ${escapeHtml(student.target_school || "No target")} / ${money(student.hourly_rate)} per hour</p>
      <div class="button-row">
        <button type="button" data-edit-student="${student.student_id}">Edit Student</button>
      </div>
    </article>
  `).join("") : `<div class="notice">No students yet.</div>`;
  $$("[data-edit-student]").forEach((button) => button.addEventListener("click", () => editStudent(Number(button.dataset.editStudent))));
}

async function editStudent(studentId) {
  const student = students.find((item) => Number(item.student_id) === Number(studentId));
  if (!student) return;
  const student_name = prompt("Student name", student.student_name);
  if (student_name === null) return;
  const parent_name = prompt("Parent name", student.parent_name || "");
  if (parent_name === null) return;
  const parent_email = prompt("Parent email", student.parent_email || "");
  if (parent_email === null) return;
  const year_group = prompt("Year group", student.year_group || "");
  if (year_group === null) return;
  const target_school = prompt("Target school / notes", student.target_school || "");
  if (target_school === null) return;
  const hourly_rate = prompt("Hourly rate", student.hourly_rate || 0);
  if (hourly_rate === null) return;
  const assigned_tutor_id = prompt("Assigned tutor ID (leave blank for unassigned)", student.assigned_tutor_id || "");
  if (assigned_tutor_id === null) return;
  const active = confirm("Should this student be active?");
  await api(`/api/students/${studentId}/update`, {
    method: "POST",
    body: JSON.stringify({ student_name, parent_name, parent_email, year_group, target_school, hourly_rate, assigned_tutor_id, active }),
  });
  await refreshBaseData();
  renderStudents();
}

async function loadCalendar() {
  const data = await api(`/api/bookings?month=${encodeURIComponent(els.calendarMonth.value)}`);
  bookings = data.bookings;
  renderCalendar();
}

function renderCalendar() {
  const [year, month] = els.calendarMonth.value.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells = weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`);
  for (let i = 0; i < offset; i += 1) {
    cells.push(`<div class="day muted-day"></div>`);
  }
  for (let day = 1; day <= days; day += 1) {
    const iso = `${els.calendarMonth.value}-${String(day).padStart(2, "0")}`;
    const dayBookings = bookings.filter((booking) => booking.start_at.slice(0, 10) === iso);
    cells.push(`
      <div class="day">
        <div class="day-header">
          <span class="day-number">${day}</span>
          ${dayBookings.length ? `<span class="day-count">${dayBookings.length}</span>` : ""}
        </div>
        ${dayBookings.map((booking) => `
          <button class="booking-chip" type="button" data-complete-booking="${booking.booking_id}">
            <strong>${formatTime(booking.start_at)} ${escapeHtml(booking.student_name)}</strong>
            <span>${escapeHtml(booking.tutor_name)} / ${escapeHtml(booking.status)}</span>
          </button>
        `).join("")}
      </div>
    `);
  }
  els.calendarGrid.innerHTML = cells.join("");
  $$("[data-complete-booking]").forEach((button) => {
    button.addEventListener("click", () => openBookingDialog(Number(button.dataset.completeBooking)));
  });
}

function openBookingDialog(bookingId) {
  const booking = bookings.find((item) => Number(item.booking_id) === Number(bookingId));
  if (!booking) return;
  els.bookingEditId.value = booking.booking_id;
  els.bookingEditContext.textContent = `${booking.student_name} with ${booking.tutor_name} / ${escapeHtml(booking.status)}`;
  els.bookingEditStudent.value = booking.student_id;
  els.bookingEditTutor.value = booking.tutor_id;
  els.bookingEditDate.value = datePart(booking.start_at);
  els.bookingEditTime.value = timePart(booking.start_at);
  els.bookingEditDuration.value = booking.duration_minutes || 60;
  els.bookingEditNotes.value = booking.notes || "";
  els.bookingEditMessage.textContent = "";
  els.bookingDialog.showModal();
}

async function saveBookingEdit(event) {
  event.preventDefault();
  await api(`/api/bookings/${els.bookingEditId.value}/update`, {
    method: "POST",
    body: JSON.stringify({
      student_id: els.bookingEditStudent.value,
      tutor_id: currentUser.role === "Master" ? els.bookingEditTutor.value : currentUser.user_id,
      start_at: `${els.bookingEditDate.value}T${els.bookingEditTime.value}:00`,
      duration_minutes: els.bookingEditDuration.value,
      notes: els.bookingEditNotes.value,
    }),
  });
  els.bookingDialog.close();
  await loadCalendar();
  await loadHome();
}

async function cancelBooking() {
  if (!confirm("Cancel this lesson?")) return;
  await api(`/api/bookings/${els.bookingEditId.value}/cancel`, { method: "POST", body: "{}" });
  els.bookingDialog.close();
  await loadCalendar();
  await loadHome();
}

async function deleteBooking() {
  if (!confirm("Delete this lesson permanently?")) return;
  await api(`/api/bookings/${els.bookingEditId.value}/delete`, { method: "POST", body: "{}" });
  els.bookingDialog.close();
  await loadCalendar();
  await loadHome();
}

async function saveBooking(event) {
  event.preventDefault();
  const student = students.find((item) => String(item.student_id) === String(els.bookingStudent.value));
  const tutorId = currentUser.role === "Master" ? els.bookingTutor.value || student?.assigned_tutor_id : currentUser.user_id;
  els.bookingMessage.textContent = "Adding booking...";
  await api("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      student_id: els.bookingStudent.value,
      tutor_id: tutorId,
      start_at: `${els.bookingDate.value}T${els.bookingTime.value}:00`,
      duration_minutes: els.bookingDuration.value,
      repeat_weeks: els.bookingRepeat.value,
      notes: els.bookingNotes.value,
    }),
  });
  els.bookingMessage.textContent = "Booking added.";
  await loadCalendar();
  await loadHome();
}

function openCompleteDialog(bookingId) {
  const booking = bookings.find((item) => Number(item.booking_id) === Number(bookingId));
  if (!booking) return;
  els.completeBookingId.value = booking.booking_id;
  els.completeContext.textContent = `${booking.student_name} with ${booking.tutor_name} / ${formatDateTime(booking.start_at)}`;
  els.parentSummary.value = "";
  els.completeMessage.textContent = "";
  els.completeDialog.showModal();
}

async function completeLesson(event) {
  event.preventDefault();
  const booking = bookings.find((item) => Number(item.booking_id) === Number(els.completeBookingId.value));
  const data = await api(`/api/bookings/${els.completeBookingId.value}/complete`, {
    method: "POST",
    body: JSON.stringify({
      attendance_status: els.attendanceStatus.value,
      parent_summary: els.parentSummary.value,
      emailed_to_parent: els.emailParent.checked,
    }),
  });
  if (els.emailParent.checked) {
    const subject = `Lesson notes for ${data.student_name}`;
    const body = els.parentSummary.value;
    const href = `mailto:${encodeURIComponent(data.parent_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    els.emailDraftPanel.hidden = false;
    if (data.email_sent) {
      els.emailDraftPanel.innerHTML = `<strong>Email sent:</strong> Lesson notes were delivered to ${escapeHtml(data.parent_email)}.`;
    } else {
      els.emailDraftPanel.innerHTML = `
        <strong>Lesson saved, but email was not sent:</strong>
        ${escapeHtml(data.email_error || "Email delivery is unavailable.")}
        ${data.parent_email ? `<a href="${escapeHtml(href)}">Open a manual email</a>` : ""}
      `;
    }
  }
  els.completeDialog.close();
  await loadCalendar();
  await loadHome();
}

async function loadHome() {
  const data = await api(`/api/bookings?month=${encodeURIComponent(els.homeMonth.value)}`);
  const monthBookings = data.bookings;
  const lessonData = await api(`/api/reports/lessons?month=${encodeURIComponent(els.homeMonth.value)}`);
  const done = lessonData.lessons;
  const now = new Date();
  const incomplete = monthBookings.filter((booking) => booking.status !== "Completed" && new Date(booking.start_at) < now);
  const upcoming = monthBookings.filter((booking) => new Date(booking.start_at) >= now).slice(0, 8);
  els.homeStats.innerHTML = `
    <article class="stat"><span class="eyebrow">Booked</span><strong>${monthBookings.length}</strong><small>This month</small></article>
    <article class="stat"><span class="eyebrow">Completed</span><strong>${done.length}</strong><small>Recorded lessons</small></article>
    <article class="stat"><span class="eyebrow">Need Notes</span><strong>${incomplete.length}</strong><small>Past lessons incomplete</small></article>
    <article class="stat"><span class="eyebrow">Tutors</span><strong>${tutors.length}</strong><small>Agency accounts</small></article>
  `;
  els.upcomingList.innerHTML = upcoming.length ? upcoming.map(bookingItem).join("") : `<div class="notice">No upcoming lessons this month.</div>`;
  els.completionList.innerHTML = incomplete.length ? incomplete.map(bookingItem).join("") : `<div class="notice">No overdue lesson notes.</div>`;
  $$("[data-open-calendar]").forEach((button) => button.addEventListener("click", () => switchTab("calendar")));
}

function bookingItem(booking) {
  return `
    <article class="item">
      <div class="item-head"><h4>${escapeHtml(booking.student_name)}</h4><span class="pill">${escapeHtml(booking.status)}</span></div>
      <p>${formatDateTime(booking.start_at)} / ${booking.duration_minutes} mins</p>
      <p>${escapeHtml(booking.tutor_name)}</p>
      <button type="button" data-open-calendar>Open Calendar</button>
    </article>
  `;
}

async function loadTimesheet() {
  const tutorQuery = currentUser.role === "Master" && els.timesheetTutor.value ? `&tutor_id=${encodeURIComponent(els.timesheetTutor.value)}` : "";
  const data = await api(`/api/timesheet?month=${encodeURIComponent(els.timesheetMonth.value)}${tutorQuery}`);
  const rows = data.lessons;
  const total = rows.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes || 0) / 60) * Number(lesson.student_rate || 0), 0);
  els.timesheetSummary.textContent = `${rows.length} completed lessons / ${money(total)} total`;
  els.timesheetList.innerHTML = rows.length ? rows.map(lessonItem).join("") : `<div class="notice">No completed lessons for this period.</div>`;
}

function lessonItem(lesson) {
  const fee = (Number(lesson.duration_minutes || 0) / 60) * Number(lesson.student_rate || 0);
  return `
    <article class="item">
      <div class="item-head"><h4>${escapeHtml(lesson.student_name)}</h4><span class="pill">${money(fee)}</span></div>
      <p>${formatDateTime(lesson.start_at || lesson.completed_at)} / ${lesson.duration_minutes || 0} mins / ${escapeHtml(lesson.tutor_name)} / ${escapeHtml(lesson.timesheet_status || "Draft")}</p>
      ${lesson.parent_summary ? `<p>${escapeHtml(lesson.parent_summary)}</p>` : ""}
    </article>
  `;
}

function openTimesheetDownload() {
  const tutorQuery = currentUser.role === "Master" && els.timesheetTutor.value ? `&tutor_id=${encodeURIComponent(els.timesheetTutor.value)}` : "";
  window.open(`/api/timesheet?month=${encodeURIComponent(els.timesheetMonth.value)}${tutorQuery}&format=csv`, "_blank");
}

async function submitTimesheet() {
  await api("/api/timesheet/submit", { method: "POST", body: JSON.stringify({ month: els.timesheetMonth.value }) });
  els.timesheetSummary.textContent = "Timesheet marked as submitted to Scott.";
  await loadTimesheet();
}

async function setTimesheetStatus(status) {
  if (currentUser.role !== "Master" || !els.timesheetTutor.value) return;
  await api("/api/timesheet/status", {
    method: "POST",
    body: JSON.stringify({ month: els.timesheetMonth.value, tutor_id: els.timesheetTutor.value, status }),
  });
  await loadTimesheet();
}

async function loadReports() {
  const qs = new URLSearchParams({ month: els.reportMonth.value });
  if (els.reportTutor.value) qs.set("tutor_id", els.reportTutor.value);
  if (els.reportStudent.value) qs.set("student_id", els.reportStudent.value);
  const data = await api(`/api/reports/lessons?${qs.toString()}`);
  lessons = data.lessons;
  const totalFees = lessons.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes || 0) / 60) * Number(lesson.student_rate || 0), 0);
  const byTutor = {};
  const byStudent = {};
  lessons.forEach((lesson) => {
    byTutor[lesson.tutor_name] = (byTutor[lesson.tutor_name] || 0) + 1;
    byStudent[lesson.student_name] = (byStudent[lesson.student_name] || 0) + 1;
  });
  const summary = `
    <div class="notice">
      ${lessons.length} lessons / ${money(totalFees)} total.
      Tutors: ${Object.entries(byTutor).map(([name, count]) => `${escapeHtml(name)} (${count})`).join(", ") || "none"}.
      Students: ${Object.entries(byStudent).map(([name, count]) => `${escapeHtml(name)} (${count})`).join(", ") || "none"}.
    </div>
  `;
  els.reportList.innerHTML = lessons.length ? summary + lessons.map(lessonItem).join("") : `<div class="notice">No lesson records match this report.</div>`;
}

function downloadReports() {
  const qs = new URLSearchParams({ month: els.reportMonth.value, format: "csv" });
  if (els.reportTutor.value) qs.set("tutor_id", els.reportTutor.value);
  if (els.reportStudent.value) qs.set("student_id", els.reportStudent.value);
  window.open(`/api/reports/lessons?${qs.toString()}`, "_blank");
}

function renderSettings() {
  els.passwordMessage.textContent = "";
}

async function changePassword(event) {
  event.preventDefault();
  els.passwordMessage.textContent = "Updating password...";
  await api("/api/account/password", {
    method: "POST",
    body: JSON.stringify({ current_password: els.currentPassword.value, new_password: els.newPassword.value }),
  });
  els.passwordForm.reset();
  els.passwordMessage.textContent = "Password updated.";
}

function downloadBackup() {
  window.open("/api/backup", "_blank");
}

els.setupForm.addEventListener("submit", setupMaster);
els.loginForm.addEventListener("submit", login);
els.logoutButton.addEventListener("click", logout);
els.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
els.tutorForm.addEventListener("submit", saveTutor);
els.studentForm.addEventListener("submit", saveStudent);
els.bookingForm.addEventListener("submit", saveBooking);
els.bookingEditForm.addEventListener("submit", saveBookingEdit);
els.closeBookingDialog.addEventListener("click", () => els.bookingDialog.close());
els.completeBookingFromDialog.addEventListener("click", () => {
  const bookingId = Number(els.bookingEditId.value);
  els.bookingDialog.close();
  openCompleteDialog(bookingId);
});
els.cancelBookingButton.addEventListener("click", cancelBooking);
els.deleteBookingButton.addEventListener("click", deleteBooking);
els.calendarMonth.addEventListener("change", loadCalendar);
els.homeMonth.addEventListener("change", loadHome);
els.completeForm.addEventListener("submit", completeLesson);
els.cancelComplete.addEventListener("click", () => els.completeDialog.close());
els.loadTimesheet.addEventListener("click", loadTimesheet);
els.timesheetMonth.addEventListener("change", loadTimesheet);
els.timesheetTutor.addEventListener("change", loadTimesheet);
els.downloadTimesheet.addEventListener("click", openTimesheetDownload);
els.submitTimesheet.addEventListener("click", submitTimesheet);
els.approveTimesheet.addEventListener("click", () => setTimesheetStatus("Approved"));
els.queryTimesheet.addEventListener("click", () => setTimesheetStatus("Queried"));
els.loadReports.addEventListener("click", loadReports);
els.downloadReports.addEventListener("click", downloadReports);
els.passwordForm.addEventListener("submit", changePassword);
els.downloadBackup.addEventListener("click", downloadBackup);

start().catch((error) => {
  els.loginForm.hidden = false;
  els.loginMessage.textContent = error.message;
});

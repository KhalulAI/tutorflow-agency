const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let businessName = "SWL Education Ltd";
let personalWorkspace = false;
let personalTeacher = null;

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
  showPasswordReset: $("#showPasswordReset"),
  passwordResetRequestForm: $("#passwordResetRequestForm"),
  passwordResetEmail: $("#passwordResetEmail"),
  passwordResetRequestMessage: $("#passwordResetRequestMessage"),
  cancelPasswordResetRequest: $("#cancelPasswordResetRequest"),
  passwordResetCompleteForm: $("#passwordResetCompleteForm"),
  passwordResetToken: $("#passwordResetToken"),
  passwordResetNew: $("#passwordResetNew"),
  passwordResetConfirm: $("#passwordResetConfirm"),
  passwordResetCompleteMessage: $("#passwordResetCompleteMessage"),
  logoutButton: $("#logoutButton"),
  userBadge: $("#userBadge"),
  tabs: $$(".tab"),
  pages: $$(".page"),
  homeMonth: $("#homeMonth"),
  homeStats: $("#homeStats"),
  upcomingList: $("#upcomingList"),
  completionList: $("#completionList"),
  completedPeriod: $("#completedPeriod"),
  completedMonth: $("#completedMonth"),
  completedDay: $("#completedDay"),
  completedStart: $("#completedStart"),
  completedEnd: $("#completedEnd"),
  completedTutor: $("#completedTutor"),
  completedStudent: $("#completedStudent"),
  completedSort: $("#completedSort"),
  loadCompletedLessons: $("#loadCompletedLessons"),
  completedLessonSummary: $("#completedLessonSummary"),
  completedLessonList: $("#completedLessonList"),
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
  studentTutorRate: $("#studentTutorRate"),
  assignedTutor: $("#assignedTutor"),
  studentMessage: $("#studentMessage"),
  studentList: $("#studentList"),
  studentCount: $("#studentCount"),
  calendarMonth: $("#calendarMonth"),
  calendarLockStatus: $("#calendarLockStatus"),
  calendarLockNotice: $("#calendarLockNotice"),
  toggleMonthLock: $("#toggleMonthLock"),
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
  closeCompleteDialogX: $("#closeCompleteDialogX"),
  timesheetMonth: $("#timesheetMonth"),
  timesheetTutor: $("#timesheetTutor"),
  loadTimesheet: $("#loadTimesheet"),
  downloadTimesheet: $("#downloadTimesheet"),
  downloadTimesheetPdf: $("#downloadTimesheetPdf"),
  submitTimesheet: $("#submitTimesheet"),
  timesheetSummary: $("#timesheetSummary"),
  timesheetList: $("#timesheetList"),
  reportMonth: $("#reportMonth"),
  reportTutor: $("#reportTutor"),
  reportStudent: $("#reportStudent"),
  loadReports: $("#loadReports"),
  downloadReports: $("#downloadReports"),
  reportList: $("#reportList"),
  financePeriod: $("#financePeriod"),
  financeAnchor: $("#financeAnchor"),
  loadFinance: $("#loadFinance"),
  downloadFinance: $("#downloadFinance"),
  financePeriodLabel: $("#financePeriodLabel"),
  financeStats: $("#financeStats"),
  vatSummary: $("#vatSummary"),
  vatHistory: $("#vatHistory"),
  expenseForm: $("#expenseForm"),
  expenseDate: $("#expenseDate"),
  expenseCategory: $("#expenseCategory"),
  expenseDescription: $("#expenseDescription"),
  expenseAmount: $("#expenseAmount"),
  expenseMessage: $("#expenseMessage"),
  expenseList: $("#expenseList"),
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
  closeBookingDialogX: $("#closeBookingDialogX"),
  completeBookingFromDialog: $("#completeBookingFromDialog"),
  cancelBookingButton: $("#cancelBookingButton"),
  deleteBookingButton: $("#deleteBookingButton"),
  studentRemovalDialog: $("#studentRemovalDialog"),
  studentRemovalForm: $("#studentRemovalForm"),
  studentRemovalId: $("#studentRemovalId"),
  studentRemovalContext: $("#studentRemovalContext"),
  closeStudentRemovalX: $("#closeStudentRemovalX"),
  cancelStudentRemoval: $("#cancelStudentRemoval"),
  studentEditDialog: $("#studentEditDialog"),
  studentEditForm: $("#studentEditForm"),
  studentEditId: $("#studentEditId"),
  studentEditName: $("#studentEditName"),
  studentEditParentName: $("#studentEditParentName"),
  studentEditParentEmail: $("#studentEditParentEmail"),
  studentEditYearGroup: $("#studentEditYearGroup"),
  studentEditTargetSchool: $("#studentEditTargetSchool"),
  studentEditRate: $("#studentEditRate"),
  studentEditTutorRate: $("#studentEditTutorRate"),
  studentEditTutor: $("#studentEditTutor"),
  studentEditActive: $("#studentEditActive"),
  studentEditMessage: $("#studentEditMessage"),
  closeStudentEditX: $("#closeStudentEditX"),
  cancelStudentEdit: $("#cancelStudentEdit"),
  tutorDocumentsDialog: $("#tutorDocumentsDialog"),
  tutorDocumentForm: $("#tutorDocumentForm"),
  tutorDocumentTutorId: $("#tutorDocumentTutorId"),
  tutorDocumentContext: $("#tutorDocumentContext"),
  tutorDocumentType: $("#tutorDocumentType"),
  tutorDocumentReference: $("#tutorDocumentReference"),
  tutorDocumentExpiry: $("#tutorDocumentExpiry"),
  tutorDocumentFile: $("#tutorDocumentFile"),
  tutorDocumentNotes: $("#tutorDocumentNotes"),
  tutorDocumentMessage: $("#tutorDocumentMessage"),
  tutorDocumentList: $("#tutorDocumentList"),
  closeTutorDocumentsX: $("#closeTutorDocumentsX"),
  closeTutorDocuments: $("#closeTutorDocuments"),
};

let currentUser = null;
let tutors = [];
let students = [];
let bookings = [];
let lessons = [];
let calendarMonthLocked = false;

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

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
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
  if (tabName === "completed-lessons") loadCompletedLessons();
  if (tabName === "timesheet") loadTimesheet();
  if (tabName === "reports") loadReports();
  if (tabName === "finance") loadFinance();
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
  const business = await api("/api/business");
  businessName = business.business_name;
  personalWorkspace = Boolean(business.personal_workspace);
  document.body.classList.toggle("personal-workspace", personalWorkspace);
  document.title = business.app_name;
  $("#authScreen .eyebrow").textContent = business.app_name;
  $("#authScreen h1").textContent = `${business.workspace_name} Lesson Workspace`;
  $(".sidebar h1").textContent = business.workspace_name;
  $("#home .page-head h2").textContent = `${business.workspace_name} Dashboard`;
  $("#backupHeading").textContent = `${business.workspace_name} Backup`;
  if (personalWorkspace) {
    $("#students .page-head h2").textContent = "My Students";
    $("#studentDirectoryIntro").textContent = "A quick view of family contacts and lesson rates.";
    $("#calendar .page-head h2").textContent = "My Calendar";
    $("#timesheet .page-head h2").textContent = "My Monthly Timesheet";
    $("#financeHeading").textContent = "Income & Expenses";
    $("#financeEyebrow").textContent = "Personal Practice";
  }
  els.homeMonth.value = currentMonth();
  els.calendarMonth.value = currentMonth();
  els.completedMonth.value = currentMonth();
  els.completedDay.value = today();
  els.completedStart.value = `${currentMonth()}-01`;
  els.completedEnd.value = today();
  els.timesheetMonth.value = currentMonth();
  els.reportMonth.value = currentMonth();
  els.financeAnchor.value = today();
  els.expenseDate.value = today();
  els.bookingDate.value = today();
  els.bookingTime.value = "16:00";
  updateCompletedPeriodFields();

  const resetToken = new URLSearchParams(location.search).get("reset_token");
  if (resetToken) {
    els.passwordResetToken.value = resetToken;
    els.passwordResetCompleteForm.hidden = false;
    return;
  }

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
  personalTeacher = personalWorkspace && currentUser.role === "Master"
    ? userData.users.find((user) => user.user_id === currentUser.user_id) : null;
  renderSelects();
}

function renderSelects() {
  // Include the owner for teaching selections, not tutor management actions.
  const tutors = personalTeacher ? [personalTeacher, ...userTutors()] : userTutors();
  const activeTutors = tutors.filter((tutor) => tutor.active);
  const tutorOptions = `<option value="">Choose tutor</option>` + activeTutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  els.assignedTutor.innerHTML = tutorOptions;
  els.studentEditTutor.innerHTML = `<option value="">Unassigned</option>` + tutors.map((tutor) => `<option value="${tutor.user_id}" ${tutor.active ? "" : "disabled"}>${escapeHtml(tutor.name)}${tutor.active ? "" : " (Inactive)"}</option>`).join("");
  els.bookingTutor.innerHTML = tutorOptions;
  els.timesheetTutor.innerHTML = tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  els.reportTutor.innerHTML = `<option value="">All tutors</option>` + tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  els.completedTutor.innerHTML = `<option value="">All tutors</option>` + tutors.map((tutor) => `<option value="${tutor.user_id}">${escapeHtml(tutor.name)}</option>`).join("");
  if (!els.timesheetTutor.value && tutors[0]) els.timesheetTutor.value = tutors[0].user_id;

  const activeStudents = students.filter((student) => student.active);
  const studentOptions = `<option value="">Choose student</option>` + activeStudents.map((student) => `<option value="${student.student_id}">${escapeHtml(student.student_name)}</option>`).join("");
  els.bookingStudent.innerHTML = studentOptions;
  els.bookingEditStudent.innerHTML = studentOptions;
  els.reportStudent.innerHTML = `<option value="">All students</option>` + students.map((student) => `<option value="${student.student_id}">${escapeHtml(student.student_name)}${student.active ? "" : " (Archived)"}</option>`).join("");
  els.completedStudent.innerHTML = `<option value="">All students</option>` + students.map((student) => `<option value="${student.student_id}">${escapeHtml(student.student_name)}${student.active ? "" : " (Archived)"}</option>`).join("");
  els.bookingEditTutor.innerHTML = tutorOptions;
}

function userTutors() { return tutors; }

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

function showPasswordResetRequest() {
  els.loginForm.hidden = true;
  els.passwordResetRequestForm.hidden = false;
  els.passwordResetRequestMessage.textContent = "";
  els.passwordResetEmail.value = els.loginEmail.value;
}

function hidePasswordResetRequest() {
  els.passwordResetRequestForm.hidden = true;
  els.loginForm.hidden = false;
}

async function requestPasswordReset(event) {
  event.preventDefault();
  els.passwordResetRequestMessage.textContent = "Requesting reset link...";
  const data = await api("/api/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email: els.passwordResetEmail.value }),
  });
  els.passwordResetRequestMessage.textContent = data.message;
}

async function completePasswordReset(event) {
  event.preventDefault();
  if (els.passwordResetNew.value !== els.passwordResetConfirm.value) {
    els.passwordResetCompleteMessage.textContent = "The passwords do not match.";
    return;
  }
  els.passwordResetCompleteMessage.textContent = "Saving new password...";
  try {
    await api("/api/password-reset/complete", {
      method: "POST",
      body: JSON.stringify({ token: els.passwordResetToken.value, new_password: els.passwordResetNew.value }),
    });
    history.replaceState({}, "", location.pathname);
    els.passwordResetCompleteForm.hidden = true;
    els.loginForm.hidden = false;
    els.loginMessage.textContent = "Password reset successfully. You can now sign in.";
  } catch (error) {
    els.passwordResetCompleteMessage.textContent = error.message;
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
        <button class="ghost dark-ghost" type="button" data-documents-tutor="${tutor.user_id}">Documents (${Number(tutor.document_count || 0)})</button>
        <button class="${tutor.active ? "warn" : ""}" type="button" data-status-tutor="${tutor.user_id}">${tutor.active ? "Make Inactive" : "Reactivate"}</button>
        <button class="danger" type="button" data-remove-tutor="${tutor.user_id}">Remove</button>
      </div>
    </article>
  `).join("") : `<div class="notice">No tutor accounts yet.</div>`;
  $$("[data-edit-tutor]").forEach((button) => button.addEventListener("click", () => editTutor(Number(button.dataset.editTutor))));
  $$("[data-reset-tutor]").forEach((button) => button.addEventListener("click", () => resetTutorPassword(Number(button.dataset.resetTutor))));
  $$("[data-documents-tutor]").forEach((button) => button.addEventListener("click", () => openTutorDocuments(Number(button.dataset.documentsTutor))));
  $$("[data-status-tutor]").forEach((button) => button.addEventListener("click", () => changeTutorStatus(Number(button.dataset.statusTutor))));
  $$("[data-remove-tutor]").forEach((button) => button.addEventListener("click", () => removeTutor(Number(button.dataset.removeTutor))));
}

async function openTutorDocuments(tutorId) {
  const tutor = tutors.find((item) => Number(item.user_id) === Number(tutorId));
  if (!tutor) return;
  els.tutorDocumentForm.reset();
  els.tutorDocumentTutorId.value = tutorId;
  els.tutorDocumentContext.textContent = `${tutor.name} · master access only`;
  els.tutorDocumentMessage.textContent = "";
  els.tutorDocumentsDialog.showModal();
  await loadTutorDocuments();
}

async function loadTutorDocuments() {
  const tutorId = Number(els.tutorDocumentTutorId.value);
  if (!tutorId) return;
  els.tutorDocumentList.innerHTML = `<div class="notice">Loading records...</div>`;
  try {
    const data = await api(`/api/tutor-documents?tutor_id=${tutorId}`);
    els.tutorDocumentList.innerHTML = data.documents.length ? data.documents.map((document) => {
      const expired = document.expires_on && document.expires_on < today();
      return `
        <article class="document-item ${expired ? "document-expired" : ""}">
          <div class="item-head">
            <div><h4>${escapeHtml(document.document_type)}</h4><p>${escapeHtml(document.filename || "Record only — no file stored")}</p></div>
            <span class="pill">${expired ? "Review overdue" : (document.expires_on ? `Review ${escapeHtml(formatDate(document.expires_on))}` : "No review date")}</span>
          </div>
          ${document.reference ? `<p><strong>Reference:</strong> ${escapeHtml(document.reference)}</p>` : ""}
          ${document.notes ? `<p>${escapeHtml(document.notes)}</p>` : ""}
          <p class="document-meta">Saved ${escapeHtml(formatDateTime(document.uploaded_at))}${document.file_size ? ` · ${escapeHtml(formatFileSize(document.file_size))}` : ""}</p>
          <div class="button-row">
            ${document.has_file ? `<button type="button" data-download-document="${document.document_id}">Download</button>` : ""}
            <button class="danger" type="button" data-delete-document="${document.document_id}">Delete</button>
          </div>
        </article>`;
    }).join("") : `<div class="notice">No document records saved for this tutor.</div>`;
    $$("[data-download-document]").forEach((button) => button.addEventListener("click", () => {
      window.open(`/api/tutor-documents/${button.dataset.downloadDocument}/download`, "_blank");
    }));
    $$("[data-delete-document]").forEach((button) => button.addEventListener("click", () => deleteTutorDocument(Number(button.dataset.deleteDocument))));
  } catch (error) {
    els.tutorDocumentList.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

async function fileAsBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 32768) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
  }
  return btoa(binary);
}

async function saveTutorDocument(event) {
  event.preventDefault();
  const file = els.tutorDocumentFile.files[0];
  if (file && els.tutorDocumentType.value === "DBS check record") {
    els.tutorDocumentMessage.textContent = "Record the DBS check details without attaching the certificate copy.";
    return;
  }
  if (file && file.size > 5 * 1024 * 1024) {
    els.tutorDocumentMessage.textContent = "Files must be no larger than 5 MB.";
    return;
  }
  els.tutorDocumentMessage.textContent = "Saving record...";
  try {
    await api("/api/tutor-documents", {
      method: "POST",
      body: JSON.stringify({
        tutor_id: Number(els.tutorDocumentTutorId.value),
        document_type: els.tutorDocumentType.value,
        reference: els.tutorDocumentReference.value,
        expires_on: els.tutorDocumentExpiry.value,
        notes: els.tutorDocumentNotes.value,
        filename: file?.name || "",
        content_type: file?.type || "",
        file_data: file ? await fileAsBase64(file) : "",
      }),
    });
    els.tutorDocumentMessage.textContent = "Record saved.";
    const tutorId = Number(els.tutorDocumentTutorId.value);
    els.tutorDocumentForm.reset();
    els.tutorDocumentTutorId.value = tutorId;
    await refreshBaseData();
    await loadTutorDocuments();
    renderTutors();
  } catch (error) {
    els.tutorDocumentMessage.textContent = error.message;
  }
}

async function deleteTutorDocument(documentId) {
  if (!confirm("Permanently delete this document record and its stored file? This cannot be undone.")) return;
  await api(`/api/tutor-documents/${documentId}/delete`, { method: "POST", body: "{}" });
  await refreshBaseData();
  await loadTutorDocuments();
  renderTutors();
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
  await api(`/api/users/${tutorId}/update`, {
    method: "POST",
    body: JSON.stringify({ name, email, hourly_rate: hourlyRate }),
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

async function changeTutorStatus(tutorId) {
  const tutor = tutors.find((item) => Number(item.user_id) === Number(tutorId));
  if (!tutor) return;
  const nextActive = !tutor.active;
  const action = nextActive ? "reactivate" : "make inactive";
  if (!confirm(`Are you sure you want to ${action} ${tutor.name}?`)) return;
  await api(`/api/users/${tutorId}/status`, {
    method: "POST",
    body: JSON.stringify({ active: nextActive }),
  });
  await refreshBaseData();
  renderTutors();
}

async function removeTutor(tutorId) {
  const tutor = tutors.find((item) => Number(item.user_id) === Number(tutorId));
  if (!tutor) return;
  if (!confirm(`Permanently remove ${tutor.name}? Any assigned students will become unassigned. This cannot be undone.`)) return;
  try {
    const data = await api(`/api/users/${tutorId}/delete`, { method: "POST", body: "{}" });
    const suffix = data.unassigned_students ? ` ${data.unassigned_students} student(s) were unassigned.` : "";
    alert(`Tutor removed.${suffix}`);
    await refreshBaseData();
    renderTutors();
  } catch (error) {
    alert(error.message);
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
      tutor_hourly_rate: personalWorkspace ? 0 : els.studentTutorRate.value,
      assigned_tutor_id: personalWorkspace ? currentUser.user_id : els.assignedTutor.value,
    }),
  });
  els.studentMessage.textContent = "Student saved.";
  els.studentForm.reset();
  await refreshBaseData();
  renderStudents();
}

function renderStudents() {
  els.studentCount.textContent = `${students.length} student${students.length === 1 ? "" : "s"}`;
  if (!students.length) {
    els.studentList.innerHTML = `<div class="notice">No students yet.</div>`;
    return;
  }
  const master = currentUser.role === "Master";
  const personal = master && personalWorkspace;
  els.studentList.innerHTML = `
    <div class="table-wrap">
      <table class="student-table">
        <thead><tr>
          <th>Student</th><th>Parent</th><th>Email</th>${personal ? "" : "<th>Tutor</th>"}
          ${master ? `<th>${personal ? "Hourly charge" : "Client rate"}</th>${personal ? "" : "<th>Tutor rate</th>"}<th>Status</th><th><span class="sr-only">Actions</span></th>` : `<th>Your rate</th><th>Status</th>`}
        </tr></thead>
        <tbody>${students.map((student) => `
          <tr class="${student.active ? "" : "archived-row"}">
            <td data-label="Student"><strong>${escapeHtml(student.student_name)}</strong></td>
            <td data-label="Parent">${escapeHtml(student.parent_name || "—")}</td>
            <td data-label="Email" class="email-cell">${escapeHtml(student.parent_email || "—")}</td>
            ${personal ? "" : `<td data-label="Tutor">${escapeHtml(student.tutor_name || "Unassigned")}</td>`}
            ${master ? `
              <td data-label="Client rate"><strong>${money(student.hourly_rate)}</strong><small>/hr</small></td>
              ${personal ? "" : `<td data-label="Tutor rate"><strong>${money(effectiveStudentTutorRate(student))}</strong><small>/hr${student.tutor_hourly_rate == null ? " · default" : " · custom"}</small></td>`}
              <td data-label="Status"><span class="pill">${student.active ? "Active" : "Archived"}</span></td>
              <td class="table-actions"><button type="button" data-edit-student="${student.student_id}" aria-label="Edit ${escapeHtml(student.student_name)}">Edit</button><button class="ghost dark-ghost" type="button" data-remove-student="${student.student_id}" aria-label="Remove or unassign ${escapeHtml(student.student_name)}">Manage</button></td>
            ` : `<td data-label="Your rate"><strong>${money(student.tutor_rate)}</strong><small>/hr</small></td><td data-label="Status"><span class="pill">${student.active ? "Active" : "Archived"}</span></td>`}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  $$("[data-edit-student]").forEach((button) => button.addEventListener("click", () => editStudent(Number(button.dataset.editStudent))));
  $$("[data-remove-student]").forEach((button) => button.addEventListener("click", () => openStudentRemoval(Number(button.dataset.removeStudent))));
}

function effectiveStudentTutorRate(student) {
  if (personalTeacher && Number(student.assigned_tutor_id) === Number(personalTeacher.user_id)) return 0;
  if (student.tutor_hourly_rate !== null && student.tutor_hourly_rate !== undefined && student.tutor_hourly_rate !== "") {
    return Number(student.tutor_hourly_rate);
  }
  const assignedTutor = tutors.find((tutor) => Number(tutor.user_id) === Number(student.assigned_tutor_id));
  return Number(assignedTutor?.hourly_rate || 0);
}

function editStudent(studentId) {
  const student = students.find((item) => Number(item.student_id) === Number(studentId));
  if (!student) return;
  els.studentEditId.value = studentId;
  els.studentEditName.value = student.student_name || "";
  els.studentEditParentName.value = student.parent_name || "";
  els.studentEditParentEmail.value = student.parent_email || "";
  els.studentEditYearGroup.value = student.year_group || "";
  els.studentEditTargetSchool.value = student.target_school || "";
  els.studentEditRate.value = student.hourly_rate ?? 0;
  els.studentEditTutorRate.value = student.tutor_hourly_rate ?? "";
  els.studentEditTutor.value = student.assigned_tutor_id || "";
  els.studentEditActive.checked = Boolean(student.active);
  els.studentEditMessage.textContent = "";
  els.studentEditDialog.showModal();
}

async function saveStudentEdit(event) {
  event.preventDefault();
  els.studentEditMessage.textContent = "Saving student...";
  try {
    await api(`/api/students/${els.studentEditId.value}/update`, {
      method: "POST",
      body: JSON.stringify({
        student_name: els.studentEditName.value,
        parent_name: els.studentEditParentName.value,
        parent_email: els.studentEditParentEmail.value,
        year_group: els.studentEditYearGroup.value,
        target_school: els.studentEditTargetSchool.value,
        hourly_rate: els.studentEditRate.value,
        tutor_hourly_rate: personalWorkspace ? 0 : els.studentEditTutorRate.value,
        assigned_tutor_id: personalWorkspace ? currentUser.user_id : els.studentEditTutor.value,
        active: els.studentEditActive.checked,
      }),
    });
    els.studentEditDialog.close();
    await refreshBaseData();
    renderStudents();
  } catch (error) {
    els.studentEditMessage.textContent = error.message;
  }
}

function openStudentRemoval(studentId) {
  const student = students.find((item) => Number(item.student_id) === Number(studentId));
  if (!student) return;
  els.studentRemovalId.value = studentId;
  els.studentRemovalContext.textContent = `Choose what should happen to ${student.student_name}.`;
  const defaultMode = personalWorkspace ? "archive" : (student.assigned_tutor_id ? "unassign" : "archive");
  const option = document.querySelector(`input[name="studentRemovalMode"][value="${defaultMode}"]`);
  if (option) option.checked = true;
  els.studentRemovalDialog.showModal();
}

async function removeStudent(event) {
  event.preventDefault();
  const studentId = Number(els.studentRemovalId.value);
  const student = students.find((item) => Number(item.student_id) === studentId);
  const selected = document.querySelector('input[name="studentRemovalMode"]:checked');
  if (!student || !selected) return;
  const mode = selected.value;
  if (mode === "delete" && !confirm(`Permanently delete ${student.student_name}, including every booking and lesson note? This cannot be undone.`)) return;
  const data = await api(`/api/students/${studentId}/remove`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
  els.studentRemovalDialog.close();
  if (mode === "delete") {
    alert(`Student permanently deleted. ${data.deleted_bookings} booking(s) and ${data.deleted_lesson_records} lesson record(s) were removed.`);
  }
  await refreshBaseData();
  renderStudents();
}

async function loadCalendar() {
  const data = await api(`/api/bookings?month=${encodeURIComponent(els.calendarMonth.value)}`);
  bookings = data.bookings;
  calendarMonthLocked = Boolean(data.month_locked);
  els.calendarLockStatus.textContent = calendarMonthLocked ? "Locked for invoicing" : "Open for changes";
  els.calendarLockStatus.classList.toggle("locked", calendarMonthLocked);
  els.toggleMonthLock.textContent = calendarMonthLocked ? "Unlock Month" : "Lock Month for Invoicing";
  els.toggleMonthLock.classList.toggle("warn", calendarMonthLocked);
  els.calendarLockNotice.hidden = !calendarMonthLocked;
  els.calendarLockNotice.textContent = calendarMonthLocked
    ? `${formatMonthLabel(els.calendarMonth.value)} is locked for invoicing${data.month_lock?.locked_by_name ? ` by ${data.month_lock.locked_by_name}` : ""}. Lessons can be viewed, but cannot be added, edited, completed, cancelled or deleted.`
    : "";
  const calendarWorkspace = $(".calendar-workspace");
  calendarWorkspace.classList.toggle("month-locked", calendarMonthLocked);
  els.bookingForm.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = calendarMonthLocked;
  });
  els.bookingMessage.textContent = calendarMonthLocked ? "Unlock this month to add lessons." : "";
  renderCalendar();
}

function formatMonthLabel(month) {
  if (!month) return "This month";
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}

async function toggleMonthLock() {
  const nextLocked = !calendarMonthLocked;
  const action = nextLocked ? "lock" : "unlock";
  const consequence = nextLocked
    ? "Tutors and the master account will no longer be able to change lessons or timesheets in this month."
    : "Lesson and timesheet changes will be allowed again.";
  if (!confirm(`${action[0].toUpperCase()}${action.slice(1)} ${formatMonthLabel(els.calendarMonth.value)}?\n\n${consequence}`)) return;
  try {
    await api("/api/month-locks", {
      method: "POST",
      body: JSON.stringify({ month: els.calendarMonth.value, locked: nextLocked }),
    });
    await loadCalendar();
  } catch (error) {
    alert(error.message);
  }
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
  const bookingLocked = Boolean(booking.month_locked);
  els.bookingEditId.value = booking.booking_id;
  els.bookingEditContext.textContent = `${booking.student_name} with ${booking.tutor_name} / ${escapeHtml(booking.status)}`;
  els.bookingEditStudent.value = booking.student_id;
  els.bookingEditTutor.value = booking.tutor_id;
  els.bookingEditDate.value = datePart(booking.start_at);
  els.bookingEditTime.value = timePart(booking.start_at);
  els.bookingEditDuration.value = booking.duration_minutes || 60;
  els.bookingEditNotes.value = booking.notes || "";
  els.completeBookingFromDialog.textContent = booking.status === "Completed" ? "View/Edit Lesson Notes" : "Complete & Add Notes";
  const editControls = [
    els.bookingEditStudent, els.bookingEditTutor, els.bookingEditDate, els.bookingEditTime,
    els.bookingEditDuration, els.bookingEditNotes, els.completeBookingFromDialog,
    els.cancelBookingButton,
  ];
  editControls.forEach((control) => { control.disabled = bookingLocked; });
  els.deleteBookingButton.disabled = bookingLocked || (currentUser.role !== "Master" && booking.status === "Completed");
  els.bookingEditForm.querySelector('button[type="submit"]').disabled = bookingLocked;
  els.bookingEditMessage.textContent = bookingLocked
    ? "This month is locked for invoicing. Details are view-only."
    : (currentUser.role !== "Master" && booking.status === "Completed" ? "Completed lessons cannot be deleted by tutors." : "");
  els.bookingDialog.showModal();
}

async function saveBookingEdit(event) {
  event.preventDefault();
  try {
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
  } catch (error) {
    els.bookingEditMessage.textContent = error.message;
  }
}

async function cancelBooking() {
  if (!confirm("Cancel this lesson?")) return;
  try {
    await api(`/api/bookings/${els.bookingEditId.value}/cancel`, { method: "POST", body: "{}" });
    els.bookingDialog.close();
    await loadCalendar();
    await loadHome();
  } catch (error) {
    els.bookingEditMessage.textContent = error.message;
  }
}

async function deleteBooking() {
  if (!confirm("Delete this mistaken lesson entry permanently? This cannot be undone.")) return;
  try {
    await api(`/api/bookings/${els.bookingEditId.value}/delete`, { method: "POST", body: "{}" });
    els.bookingDialog.close();
    await loadCalendar();
    await loadHome();
  } catch (error) {
    els.bookingEditMessage.textContent = error.message;
  }
}

async function saveBooking(event) {
  event.preventDefault();
  const student = students.find((item) => String(item.student_id) === String(els.bookingStudent.value));
  const tutorId = currentUser.role === "Master" ? els.bookingTutor.value || student?.assigned_tutor_id : currentUser.user_id;
  els.bookingMessage.textContent = "Adding booking...";
  try {
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
  } catch (error) {
    els.bookingMessage.textContent = error.message;
  }
}

function openCompleteDialog(bookingId) {
  const booking = bookings.find((item) => Number(item.booking_id) === Number(bookingId));
  if (!booking) return;
  els.completeBookingId.value = booking.booking_id;
  els.completeContext.textContent = personalWorkspace
    ? `${booking.student_name} / ${formatDateTime(booking.start_at)}`
    : `${booking.student_name} with ${booking.tutor_name} / ${formatDateTime(booking.start_at)}`;
  els.attendanceStatus.value = booking.attendance_status || "Completed";
  els.parentSummary.value = booking.parent_summary || "";
  els.emailParent.checked = booking.status !== "Completed";
  const bookingLocked = Boolean(booking.month_locked);
  els.completeForm.querySelectorAll("select, textarea, input, button[type='submit']").forEach((control) => {
    control.disabled = bookingLocked;
  });
  els.completeMessage.textContent = bookingLocked ? "This month is locked for invoicing. Lesson notes are view-only." : "";
  els.completeDialog.showModal();
}

async function completeLesson(event) {
  event.preventDefault();
  const booking = bookings.find((item) => Number(item.booking_id) === Number(els.completeBookingId.value));
  let data;
  try {
    data = await api(`/api/bookings/${els.completeBookingId.value}/complete`, {
      method: "POST",
      body: JSON.stringify({
        attendance_status: els.attendanceStatus.value,
        parent_summary: els.parentSummary.value,
        emailed_to_parent: els.emailParent.checked,
      }),
    });
  } catch (error) {
    els.completeMessage.textContent = error.message;
    return;
  }
  if (els.emailParent.checked) {
    const subject = `Lesson Notes - ${data.student_name}`;
    const body = `Student: ${data.student_name}\n\n${els.parentSummary.value}\n\nKind regards,\n${businessName}`;
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
    ${personalWorkspace ? `<article class="stat"><span class="eyebrow">Income</span><strong>${money(done.reduce((sum, lesson) => sum + Number(lesson.student_rate || 0) * Number(lesson.duration_minutes || 0) / 60, 0))}</strong><small>Completed lessons this month</small></article>` : `<article class="stat"><span class="eyebrow">Tutors</span><strong>${tutors.length}</strong><small>Tutor accounts</small></article>`}
  `;
  els.upcomingList.innerHTML = upcoming.length ? upcoming.map(bookingItem).join("") : `<div class="notice">No upcoming lessons this month.</div>`;
  els.completionList.innerHTML = incomplete.length ? incomplete.map(bookingItem).join("") : `<div class="notice">No overdue lesson notes.</div>`;
  $$("[data-open-calendar]").forEach((button) => button.addEventListener("click", () => switchTab("calendar")));
}

function updateCompletedPeriodFields() {
  const period = els.completedPeriod.value;
  els.completedMonth.hidden = period !== "month";
  els.completedDay.hidden = period !== "day";
  els.completedStart.hidden = period !== "range";
  els.completedEnd.hidden = period !== "range";
}

function completedLessonsQuery() {
  const qs = new URLSearchParams();
  if (els.completedPeriod.value === "month") qs.set("month", els.completedMonth.value);
  if (els.completedPeriod.value === "day") {
    qs.set("start", els.completedDay.value);
    qs.set("end", els.completedDay.value);
  }
  if (els.completedPeriod.value === "range") {
    qs.set("start", els.completedStart.value);
    qs.set("end", els.completedEnd.value);
  }
  if (!personalWorkspace && currentUser.role === "Master" && els.completedTutor.value) qs.set("tutor_id", els.completedTutor.value);
  if (currentUser.role === "Master" && els.completedStudent.value) qs.set("student_id", els.completedStudent.value);
  return qs;
}

async function loadCompletedLessons() {
  const data = await api(`/api/reports/lessons?${completedLessonsQuery().toString()}`);
  const completedLessons = [...data.lessons];
  const dateValue = (lesson) => new Date(lesson.start_at || lesson.completed_at || 0).getTime();
  const studentValue = (lesson) => String(lesson.student_name || "");
  const tutorValue = (lesson) => String(lesson.tutor_name || "");
  const sort = els.completedSort.value;

  completedLessons.sort((left, right) => {
    if (sort === "date-asc") return dateValue(left) - dateValue(right);
    if (sort === "student-asc") return studentValue(left).localeCompare(studentValue(right), "en-GB", { sensitivity: "base" }) || dateValue(right) - dateValue(left);
    if (sort === "student-desc") return studentValue(right).localeCompare(studentValue(left), "en-GB", { sensitivity: "base" }) || dateValue(right) - dateValue(left);
    if (sort === "tutor-asc") return tutorValue(left).localeCompare(tutorValue(right), "en-GB", { sensitivity: "base" }) || dateValue(right) - dateValue(left);
    if (sort === "tutor-desc") return tutorValue(right).localeCompare(tutorValue(left), "en-GB", { sensitivity: "base" }) || dateValue(right) - dateValue(left);
    return dateValue(right) - dateValue(left);
  });

  const lessonWord = completedLessons.length === 1 ? "lesson" : "lessons";
  els.completedLessonSummary.textContent = `${completedLessons.length} completed ${lessonWord} for the selected period.`;
  els.completedLessonList.innerHTML = completedLessons.length
    ? completedLessons.map(completedLessonItem).join("")
    : `<div class="notice">No completed lessons recorded for this month.</div>`;
}

function completedLessonItem(lesson) {
  const emailed = Number(lesson.emailed_to_parent || 0) === 1;
  return `
    <article class="item">
      <div class="item-head">
        <h4>${escapeHtml(lesson.student_name)}</h4>
        <span class="pill">${escapeHtml(lesson.attendance_status || "Completed")}</span>
      </div>
      <p>${formatDateTime(lesson.start_at || lesson.completed_at)} / ${lesson.duration_minutes || 0} mins</p>
      ${personalWorkspace ? "" : `<p><strong>Tutor:</strong> ${escapeHtml(lesson.tutor_name)}</p>`}
      <p><strong>Lesson notes:</strong> ${escapeHtml(lesson.parent_summary || "No notes recorded.")}</p>
      <p>${emailed ? "Notes emailed to parent" : "Notes not emailed to parent"}</p>
    </article>
  `;
}

function bookingItem(booking) {
  return `
    <article class="item">
      <div class="item-head"><h4>${escapeHtml(booking.student_name)}</h4><span class="pill">${escapeHtml(booking.status)}</span></div>
      <p>${formatDateTime(booking.start_at)} / ${booking.duration_minutes} mins</p>
      ${personalWorkspace ? "" : `<p>${escapeHtml(booking.tutor_name)}</p>`}
      <button type="button" data-open-calendar>Open Calendar</button>
    </article>
  `;
}

async function loadTimesheet() {
  const tutorQuery = !personalWorkspace && currentUser.role === "Master" && els.timesheetTutor.value ? `&tutor_id=${encodeURIComponent(els.timesheetTutor.value)}` : "";
  const data = await api(`/api/timesheet?month=${encodeURIComponent(els.timesheetMonth.value)}${tutorQuery}`);
  const rows = data.lessons;
  const total = rows.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes || 0) / 60) * Number(lesson.tutor_rate || 0), 0);
  els.timesheetSummary.textContent = `${rows.length} completed lessons / ${money(total)} ${personalWorkspace ? "income" : "total"}`;
  els.timesheetList.innerHTML = rows.length ? rows.map((lesson) => lessonItem(lesson, "tutor_rate")).join("") : `<div class="notice">No completed lessons for this period.</div>`;
}

function lessonItem(lesson, rateKey) {
  const fee = (Number(lesson.duration_minutes || 0) / 60) * Number(lesson[rateKey] || 0);
  return `
    <article class="item">
      <div class="item-head"><h4>${escapeHtml(lesson.student_name)}</h4><span class="pill">${money(fee)}</span></div>
      <p>${formatDateTime(lesson.start_at || lesson.completed_at)} / ${lesson.duration_minutes || 0} mins${personalWorkspace ? "" : ` / ${escapeHtml(lesson.tutor_name)} / ${escapeHtml(lesson.timesheet_status || "Draft")}`}</p>
      ${lesson.parent_summary ? `<p>${escapeHtml(lesson.parent_summary)}</p>` : ""}
    </article>
  `;
}

function downloadTimesheetFile(format) {
  const tutorQuery = !personalWorkspace && currentUser.role === "Master" && els.timesheetTutor.value ? `&tutor_id=${encodeURIComponent(els.timesheetTutor.value)}` : "";
  const link = document.createElement("a");
  link.href = `/api/timesheet?month=${encodeURIComponent(els.timesheetMonth.value)}${tutorQuery}&format=${encodeURIComponent(format)}`;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openTimesheetDownload() {
  downloadTimesheetFile("csv");
}

function openTimesheetPdf() {
  downloadTimesheetFile("pdf");
}

async function submitTimesheet() {
  try {
    await api("/api/timesheet/submit", { method: "POST", body: JSON.stringify({ month: els.timesheetMonth.value }) });
    els.timesheetSummary.textContent = "Timesheet marked as submitted to Scott.";
    await loadTimesheet();
  } catch (error) {
    els.timesheetSummary.textContent = error.message;
  }
}

async function setTimesheetStatus(status) {
  if (currentUser.role !== "Master" || !els.timesheetTutor.value) return;
  try {
    await api("/api/timesheet/status", {
      method: "POST",
      body: JSON.stringify({ month: els.timesheetMonth.value, tutor_id: els.timesheetTutor.value, status }),
    });
    await loadTimesheet();
  } catch (error) {
    els.timesheetSummary.textContent = error.message;
  }
}

async function loadReports() {
  const qs = new URLSearchParams({ month: els.reportMonth.value });
  if (!personalWorkspace && els.reportTutor.value) qs.set("tutor_id", els.reportTutor.value);
  if (els.reportStudent.value) qs.set("student_id", els.reportStudent.value);
  const data = await api(`/api/reports/lessons?${qs.toString()}`);
  lessons = data.lessons;
  const rateKey = currentUser.role === "Master" ? "student_rate" : "tutor_rate";
  const totalFees = lessons.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes || 0) / 60) * Number(lesson[rateKey] || 0), 0);
  const totalTutorPay = lessons.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes || 0) / 60) * Number(lesson.tutor_rate || 0), 0);
  const byTutor = {};
  const byStudent = {};
  lessons.forEach((lesson) => {
    byTutor[lesson.tutor_name] = (byTutor[lesson.tutor_name] || 0) + 1;
    byStudent[lesson.student_name] = (byStudent[lesson.student_name] || 0) + 1;
  });
  const summary = personalWorkspace ? `
    <div class="notice">
      ${lessons.length} lessons / ${money(totalFees)} income.
      Students: ${Object.entries(byStudent).map(([name, count]) => `${escapeHtml(name)} (${count})`).join(", ") || "none"}.
    </div>
  ` : `
    <div class="notice">
      ${lessons.length} lessons / ${money(totalFees)} charged / ${money(totalTutorPay)} tutor pay / ${money(totalFees - totalTutorPay)} gross margin.
      Tutors: ${Object.entries(byTutor).map(([name, count]) => `${escapeHtml(name)} (${count})`).join(", ") || "none"}.
      Students: ${Object.entries(byStudent).map(([name, count]) => `${escapeHtml(name)} (${count})`).join(", ") || "none"}.
    </div>
  `;
  els.reportList.innerHTML = lessons.length ? summary + lessons.map((lesson) => lessonItem(lesson, rateKey)).join("") : `<div class="notice">No lesson records match this report.</div>`;
}

function downloadReports() {
  const qs = new URLSearchParams({ month: els.reportMonth.value, format: "csv" });
  if (!personalWorkspace && els.reportTutor.value) qs.set("tutor_id", els.reportTutor.value);
  if (els.reportStudent.value) qs.set("student_id", els.reportStudent.value);
  window.open(`/api/reports/lessons?${qs.toString()}`, "_blank");
}

function financeQuery(format = "") {
  const qs = new URLSearchParams({
    period: els.financePeriod.value,
    anchor: els.financeAnchor.value,
  });
  if (format) qs.set("format", format);
  return qs.toString();
}

async function loadFinance() {
  if (currentUser.role !== "Master") return;
  const data = await api(`/api/finance/summary?${financeQuery()}`);
  const summary = data.summary;
  const vat = data.vat;
  els.financePeriodLabel.textContent = data.period_label;
  els.financeStats.innerHTML = personalWorkspace ? `
    <article class="stat"><span class="eyebrow">Income</span><strong>${money(summary.gross_income)}</strong><small>${summary.lesson_count} completed lessons</small></article>
    <article class="stat"><span class="eyebrow">Expenses</span><strong>${money(summary.expenses)}</strong><small>Saved in TutorFlow</small></article>
    <article class="stat"><span class="eyebrow">Net Income</span><strong>${money(summary.net_income)}</strong><small>Income less expenses</small></article>
  ` : `
    <article class="stat"><span class="eyebrow">Gross Income</span><strong>${money(summary.gross_income)}</strong><small>${summary.lesson_count} completed lessons</small></article>
    <article class="stat"><span class="eyebrow">Tutor Costs</span><strong>${money(summary.tutor_costs)}</strong><small>Payable to tutors</small></article>
    <article class="stat"><span class="eyebrow">Other Expenses</span><strong>${money(summary.expenses)}</strong><small>Saved in TutorFlow</small></article>
    <article class="stat"><span class="eyebrow">Net Income</span><strong>${money(summary.net_income)}</strong><small>Income less tutor costs and expenses</small></article>
  `;
  const vatPosition = vat.over_threshold
    ? `${money(Math.abs(vat.headroom))} above the configured threshold`
    : `${money(vat.headroom)} remaining below the configured threshold`;
  els.vatSummary.innerHTML = `
    <strong>${money(vat.turnover)}</strong> rolling turnover from ${escapeHtml(vat.rolling_start)} to ${escapeHtml(vat.rolling_end)}.
    ${escapeHtml(vatPosition)} (${vat.percent}%).
    <progress max="100" value="${Math.min(Math.max(vat.percent, 0), 100)}" aria-label="VAT threshold usage"></progress>
  `;
  const chartMaximum = Math.max(...vat.series.map((point) => Number(point.turnover || 0)), 1);
  els.vatHistory.innerHTML = vat.series.map((point) => {
    const height = Math.max((Number(point.turnover || 0) / chartMaximum) * 100, point.turnover ? 3 : 0);
    const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(`${point.month}-01T00:00:00`));
    return `
      <div class="vat-bar-column" title="${escapeHtml(monthLabel)}: ${escapeHtml(money(point.turnover))}">
        <span class="vat-bar-value">${money(point.turnover)}</span>
        <div class="vat-bar-track"><div class="vat-bar" style="height:${height.toFixed(1)}%"></div></div>
        <span class="vat-bar-month">${escapeHtml(monthLabel)}</span>
      </div>
    `;
  }).join("");
  els.expenseList.innerHTML = data.expenses.length ? data.expenses.map((expense) => `
    <article class="item">
      <div class="item-head"><h4>${escapeHtml(expense.description)}</h4><strong>${money(expense.amount)}</strong></div>
      <p>${escapeHtml(expense.expense_date)} / ${escapeHtml(expense.category)}</p>
      <button class="danger" type="button" data-delete-expense="${expense.expense_id}">Delete Expense</button>
    </article>
  `).join("") : `<div class="notice">No expenses saved for this period.</div>`;
  $$("[data-delete-expense]").forEach((button) => button.addEventListener("click", () => deleteExpense(Number(button.dataset.deleteExpense))));
}

function downloadFinanceReport() {
  window.open(`/api/finance/summary?${financeQuery("csv")}`, "_blank");
}

async function saveExpense(event) {
  event.preventDefault();
  els.expenseMessage.textContent = "Saving expense...";
  await api("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      expense_date: els.expenseDate.value,
      category: els.expenseCategory.value,
      description: els.expenseDescription.value,
      amount: els.expenseAmount.value,
    }),
  });
  els.expenseDescription.value = "";
  els.expenseAmount.value = "";
  els.expenseMessage.textContent = "Expense saved.";
  await loadFinance();
}

async function deleteExpense(expenseId) {
  if (!confirm("Delete this expense? This cannot be undone.")) return;
  await api(`/api/expenses/${expenseId}/delete`, { method: "POST", body: "{}" });
  await loadFinance();
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
els.showPasswordReset.addEventListener("click", showPasswordResetRequest);
els.cancelPasswordResetRequest.addEventListener("click", hidePasswordResetRequest);
els.passwordResetRequestForm.addEventListener("submit", requestPasswordReset);
els.passwordResetCompleteForm.addEventListener("submit", completePasswordReset);
els.logoutButton.addEventListener("click", logout);
els.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
els.tutorForm.addEventListener("submit", saveTutor);
els.studentForm.addEventListener("submit", saveStudent);
els.bookingForm.addEventListener("submit", saveBooking);
els.bookingEditForm.addEventListener("submit", saveBookingEdit);
els.closeBookingDialog.addEventListener("click", () => els.bookingDialog.close());
els.closeBookingDialogX.addEventListener("click", () => els.bookingDialog.close());
els.completeBookingFromDialog.addEventListener("click", () => {
  const bookingId = Number(els.bookingEditId.value);
  els.bookingDialog.close();
  openCompleteDialog(bookingId);
});
els.cancelBookingButton.addEventListener("click", cancelBooking);
els.deleteBookingButton.addEventListener("click", deleteBooking);
els.calendarMonth.addEventListener("change", loadCalendar);
els.toggleMonthLock.addEventListener("click", toggleMonthLock);
els.homeMonth.addEventListener("change", loadHome);
els.completedPeriod.addEventListener("change", () => {
  updateCompletedPeriodFields();
  loadCompletedLessons();
});
els.completedMonth.addEventListener("change", loadCompletedLessons);
els.completedDay.addEventListener("change", loadCompletedLessons);
els.completedStart.addEventListener("change", loadCompletedLessons);
els.completedEnd.addEventListener("change", loadCompletedLessons);
els.completedTutor.addEventListener("change", loadCompletedLessons);
els.completedStudent.addEventListener("change", loadCompletedLessons);
els.completedSort.addEventListener("change", loadCompletedLessons);
els.loadCompletedLessons.addEventListener("click", loadCompletedLessons);
els.completeForm.addEventListener("submit", completeLesson);
els.cancelComplete.addEventListener("click", () => els.completeDialog.close());
els.closeCompleteDialogX.addEventListener("click", () => els.completeDialog.close());
els.loadTimesheet.addEventListener("click", loadTimesheet);
els.timesheetMonth.addEventListener("change", loadTimesheet);
els.timesheetTutor.addEventListener("change", loadTimesheet);
els.downloadTimesheet.addEventListener("click", openTimesheetDownload);
els.downloadTimesheetPdf.addEventListener("click", openTimesheetPdf);
els.submitTimesheet.addEventListener("click", submitTimesheet);
els.approveTimesheet.addEventListener("click", () => setTimesheetStatus("Approved"));
els.queryTimesheet.addEventListener("click", () => setTimesheetStatus("Queried"));
els.loadReports.addEventListener("click", loadReports);
els.downloadReports.addEventListener("click", downloadReports);
els.financePeriod.addEventListener("change", loadFinance);
els.financeAnchor.addEventListener("change", loadFinance);
els.loadFinance.addEventListener("click", loadFinance);
els.downloadFinance.addEventListener("click", downloadFinanceReport);
els.expenseForm.addEventListener("submit", saveExpense);
els.studentEditForm.addEventListener("submit", saveStudentEdit);
els.closeStudentEditX.addEventListener("click", () => els.studentEditDialog.close());
els.cancelStudentEdit.addEventListener("click", () => els.studentEditDialog.close());
els.studentRemovalForm.addEventListener("submit", removeStudent);
els.closeStudentRemovalX.addEventListener("click", () => els.studentRemovalDialog.close());
els.cancelStudentRemoval.addEventListener("click", () => els.studentRemovalDialog.close());
els.tutorDocumentForm.addEventListener("submit", saveTutorDocument);
els.closeTutorDocumentsX.addEventListener("click", () => els.tutorDocumentsDialog.close());
els.closeTutorDocuments.addEventListener("click", () => els.tutorDocumentsDialog.close());
els.passwordForm.addEventListener("submit", changePassword);
els.downloadBackup.addEventListener("click", downloadBackup);

start().catch((error) => {
  els.loginForm.hidden = false;
  els.loginMessage.textContent = error.message;
});

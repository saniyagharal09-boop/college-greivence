const API_BASE = "/api";
const getToken = () => localStorage.getItem("cg_token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("cg_user") || "null"); } catch { return null; } };
async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
function saveSession(data) {
  localStorage.setItem("cg_token", data.token);
  localStorage.setItem("cg_user", JSON.stringify(data.user));
  localStorage.setItem("cg_role", data.user.role);
  localStorage.setItem("cg_email", data.user.email);
}
function requireSession(roles = []) {
  const user = getUser();
  if (!getToken() || !user || (roles.length && !roles.includes(user.role))) {
    window.location.href = "../login.html";
    return null;
  }
  return user;
}
function logout() {
  ["cg_token", "cg_user", "cg_role", "cg_email"].forEach(k => localStorage.removeItem(k));
  window.location.href = location.pathname.includes("/student/") || location.pathname.includes("/faculty/") || location.pathname.includes("/admin/") ? "../login.html" : "login.html";
}
function dateText(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function statusClass(status) {
  if (status === "Resolved") return "status-resolved";
  if (status === "Under Review") return "status-review";
  if (status === "Rejected") return "status-rejected";
  return "status-pending";
}
function statusBadge(status) { return `<span class="status ${statusClass(status)}">${status || "Submitted"}</span>`; }
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function showError(err) { alert(err.message || "Something went wrong."); }

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) toggle.addEventListener("click", () => nav.classList.toggle("open"));

  const registerForm = document.getElementById("registerForm");
  if (registerForm) registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;
    if (password !== confirm) return alert("Passwords do not match.");
    if (password.length < 8) return alert("Password must contain at least 8 characters.");
    const body = {
      name: document.getElementById("regName").value.trim(),
      studentId: document.getElementById("regStudentId").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      department: document.getElementById("regDepartment").value,
      year: document.getElementById("regYear").value,
      password
    };
    try {
      const data = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(body) });
      saveSession(data);
      alert(data.message);
      location.href = "student/dashboard.html";
    } catch (err) { showError(err); }
  });

  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const body = {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value,
      role: document.getElementById("loginRole").value
    };
    try {
      const data = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(body) });
      saveSession(data);
      const pages = { student: "student/dashboard.html", faculty: "faculty/dashboard.html", admin: "admin/dashboard.html" };
      location.href = pages[data.user.role];
    } catch (err) { showError(err); }
  });

  document.querySelectorAll(".sidebar-logout").forEach(a => {
    a.addEventListener("click", e => { e.preventDefault(); logout(); });
  });

  const grievanceForm = document.getElementById("grievanceForm");
  if (grievanceForm) {
    requireSession(["student"]);
    grievanceForm.addEventListener("submit", async e => {
      e.preventDefault();
      const body = new FormData();
      body.append("title", document.getElementById("complaintTitle").value.trim());
      body.append("category", document.getElementById("complaintCategory").value);
      body.append("description", document.getElementById("complaintDescription").value.trim());
      body.append("department", document.getElementById("complaintDepartment").value);
      body.append("anonymous", document.getElementById("anonymous").checked ? "true" : "false");
      const file = document.getElementById("complaintFile");
      if (file && file.files[0]) body.append("attachment", file.files[0]);
      try {
        const data = await apiRequest("/grievances", { method: "POST", body });
        alert(`${data.message}\nTicket ID: ${data.grievance.ticketId}`);
        location.href = "my-grievances.html";
      } catch (err) { showError(err); }
    });
  }

  const mineTable = document.getElementById("grievanceTable");
  if (mineTable) {
    const user = requireSession(["student"]);
    if (user) loadMyGrievances(mineTable);
    const filter = document.getElementById("statusFilter");
    if (filter) filter.addEventListener("change", () => {
      mineTable.querySelectorAll("tbody tr").forEach(row => {
        row.style.display = filter.value === "all" || row.dataset.status === filter.value ? "" : "none";
      });
    });
  }

  const dashboardPath = location.pathname.toLowerCase();
  if (dashboardPath.includes("/student/dashboard.html")) {
    const user = requireSession(["student"]);
    const heading = document.querySelector(".dashboard-header h1");
    if (user && heading) heading.textContent = `Welcome, ${user.name}`;
  }
  if (dashboardPath.includes("/faculty/dashboard.html")) {
    const user = requireSession(["faculty"]);
    if (user) { loadStaffDashboard("faculty"); loadNotifications(); }
  }
  if (dashboardPath.includes("/admin/dashboard.html")) {
    const user = requireSession(["admin"]);
    if (user) {
      loadStaffDashboard("admin");
      loadAdminGrievances();
      loadNotifications();
      loadEscalations();
      const refresh = document.getElementById("refreshAdminGrievances");
      if (refresh) refresh.addEventListener("click", loadAdminGrievances);
    }
  }
  if (dashboardPath.includes("/student/dashboard.html")) {
    const user = getUser();
    if (user) { loadStudentDashboard(); loadNotifications(); }
  }
  document.querySelectorAll("[data-demo-alert]").forEach(el => {
    el.addEventListener("click", e => { if (el.tagName === "A") e.preventDefault(); alert(el.dataset.demoAlert); });
  });
});

async function loadMyGrievances(table) {
  try {
    const data = await apiRequest("/grievances/mine");
    const items = data.grievances || [];
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    if (!items.length) tbody.innerHTML = '<tr><td colspan="6">No grievances submitted yet.</td></tr>';
    items.forEach(g => {
      const tr = document.createElement("tr");
      tr.dataset.status = g.status;
      tr.tabIndex = 0;
      tr.style.cursor = "pointer";
      tr.innerHTML = `<td><strong>${safe(g.ticketId)}</strong></td><td><strong>${safe(g.title)}</strong><br><small>${safe(g.description || "")}</small></td><td>${safe(g.category)}</td><td>${safe(g.department)}</td><td>${statusBadge(g.status)}</td><td>${dateText(g.createdAt)}</td>`;
      const showDetails = () => showStudentTicketDetails(g);
      tr.addEventListener("click", showDetails);
      tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showDetails(); } });
      tbody.appendChild(tr);
    });
    const p = document.querySelector(".filter-bar p");
    if (p) p.textContent = `Showing ${items.length} grievance(s) from the database. Select a row to view its history.`;
    const filter = document.getElementById("statusFilter");
    if (filter) filter.onchange = () => tbody.querySelectorAll("tr[data-status]").forEach(row => { row.style.display = filter.value === "all" || row.dataset.status === filter.value ? "" : "none"; });
    if (items.length) showStudentTicketDetails(items[0]);
    else {
      const heading = document.querySelector("#ticketDetails h2"); if (heading) heading.textContent = "No grievance submitted";
      const summary = document.getElementById("actionSummary"); if (summary) summary.textContent = "Submit a grievance to begin tracking its status.";
    }
  } catch (err) { showError(err); }
}

function showStudentTicketDetails(g) {
  const card = document.getElementById("ticketDetails");
  if (!card) return;
  const heading = card.querySelector("h2");
  if (heading) heading.textContent = `${g.ticketId} — ${g.title}`;
  const intro = card.querySelector("div > p");
  if (intro) intro.innerHTML = `Current status: ${statusBadge(g.status)} · Department: ${safe(g.department)}`;
  const summary = document.getElementById("actionSummary");
  if (summary) summary.textContent = g.actionSummary ? `Latest action: ${g.actionSummary}` : "No action summary has been added yet.";
  const timeline = document.getElementById("ticketTimeline");
  if (!timeline) return;
  timeline.innerHTML = "";
  const history = (g.history || []).slice().sort((a,b) => new Date(a.changedAt) - new Date(b.changedAt));
  if (!history.length) {
    timeline.innerHTML = `<div class="timeline-item current"><span>●</span><div><strong>${safe(g.status)}</strong><small>Last updated ${dateText(g.updatedAt || g.createdAt)}</small></div></div>`;
    return;
  }
  history.forEach((h, i) => {
    if (i) { const line = document.createElement("div"); line.className = "timeline-line"; timeline.appendChild(line); }
    const item = document.createElement("div"); item.className = `timeline-item ${i === history.length - 1 ? "current" : "done"}`;
    item.innerHTML = `<span>${i === history.length - 1 ? "●" : "✓"}</span><div><strong>${safe(h.status)}</strong><small>${dateText(h.changedAt)} · ${safe(h.note || "Status updated")}</small></div>`;
    timeline.appendChild(item);
  });
}

const DEPARTMENTS = ["IT Department", "Examination Department", "Accounts Department", "Hostel Administration", "Maintenance", "Academic Department", "Administration"];

async function loadFacultyOptions(select, department, selectedId = "") {
  select.innerHTML = '<option value="">No specific faculty / department queue</option>';
  if (!department) return;
  try {
    const data = await apiRequest(`/grievances/faculty?department=${encodeURIComponent(department)}`);
    (data.faculty || []).forEach(person => {
      const option = document.createElement("option");
      option.value = person._id;
      option.textContent = `${person.name} (${person.email})`;
      if (String(person._id) === String(selectedId || "")) option.selected = true;
      select.appendChild(option);
    });
  } catch (err) { showError(err); }
}

async function loadAdminGrievances() {
  const table = document.getElementById("adminGrievanceTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = '<tr><td colspan="6">Loading grievances...</td></tr>';
  try {
    const data = await apiRequest("/grievances");
    const items = data.grievances || [];
    tbody.innerHTML = "";
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6">No grievances submitted yet.</td></tr>';
      return;
    }
    for (const g of items) {
      const tr = document.createElement("tr");
      const departmentOptions = DEPARTMENTS.map(d => `<option value="${safe(d)}" ${d === g.department ? "selected" : ""}>${safe(d)}</option>`).join("");
      tr.innerHTML = `<td><strong>${safe(g.ticketId)}</strong><br><small>${safe(g.studentName || (g.anonymous ? "Anonymous" : "Student"))}</small><br><small>${dateText(g.createdAt)}</small></td>
        <td><strong>${safe(g.title)}</strong><br><small>${safe(g.category)}</small><br>${safe(g.description)}</td>
        <td>${statusBadge(g.status)}</td>
        <td><select class="admin-department" aria-label="Department for ${safe(g.ticketId)}">${departmentOptions}</select></td>
        <td><select class="admin-faculty" aria-label="Faculty for ${safe(g.ticketId)}"><option value="">Loading faculty...</option></select></td>
        <td><button type="button" class="table-btn" data-assign-id="${safe(g._id)}">Save assignment</button><br><small>${g.assignedTo ? `Currently: ${safe(g.assignedTo.name)}` : "Not assigned to a specific faculty"}</small></td>`;
      tbody.appendChild(tr);
      const departmentSelect = tr.querySelector(".admin-department");
      const facultySelect = tr.querySelector(".admin-faculty");
      await loadFacultyOptions(facultySelect, departmentSelect.value, g.assignedTo?._id || "");
      departmentSelect.addEventListener("change", () => loadFacultyOptions(facultySelect, departmentSelect.value));
      tr.querySelector("[data-assign-id]").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const result = await apiRequest(`/grievances/${encodeURIComponent(g._id)}/assign`, {
            method: "PATCH",
            body: JSON.stringify({ department: departmentSelect.value, facultyId: facultySelect.value || null })
          });
          alert(result.message);
          await loadAdminGrievances();
          await loadStaffDashboard("admin");
        } catch (err) { showError(err); button.disabled = false; }
      });
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${safe(err.message)}. Check login and Backend.</td></tr>`;
  }
}

async function loadStudentDashboard() {
  try {
    const data = await apiRequest("/grievances/mine");
    const items = data.grievances || [];
    const counts = {
      total: items.length,
      pending: items.filter(g => ["Submitted", "Pending"].includes(g.status)).length,
      review: items.filter(g => g.status === "Under Review").length,
      resolved: items.filter(g => g.status === "Resolved").length
    };
    const cards = document.querySelectorAll(".stats-grid .stat-card strong");
    if (cards[0]) cards[0].textContent = counts.total;
    if (cards[1]) cards[1].textContent = counts.pending;
    if (cards[2]) cards[2].textContent = counts.review;
    if (cards[3]) cards[3].textContent = counts.resolved;
    const tbody = document.querySelector(".dashboard-section table tbody");
    if (tbody) {
      tbody.innerHTML = "";
      items.slice(0, 5).forEach(g => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${safe(g.ticketId)}</strong></td><td>${safe(g.title)}</td><td>${safe(g.department)}</td><td>${statusBadge(g.status)}</td><td>${dateText(g.createdAt)}</td>`;
        tbody.appendChild(tr);
      });
      if (!items.length) tbody.innerHTML = '<tr><td colspan="5">No grievances submitted yet.</td></tr>';
    }
  } catch (err) { showError(err); }
}

async function loadStaffDashboard(role) {
  try {
    const [itemsData, stats] = await Promise.all([
      apiRequest("/grievances"),
      apiRequest("/grievances/stats/summary")
    ]);
    const items = itemsData.grievances || [];
    const user = getUser();
    const name = document.getElementById("currentUserName");
    if (name && user) name.textContent = user.name;
    const dept = document.getElementById("currentUserDepartment");
    if (dept && user) dept.textContent = user.department || "Faculty Account";
    const cards = document.querySelectorAll(".stats-grid .stat-card strong");
    if (cards[0]) cards[0].textContent = stats.total ?? items.length;
    if (cards[1]) cards[1].textContent = (stats.counts?.Submitted || 0) + (stats.counts?.Pending || 0);
    if (cards[2]) cards[2].textContent = stats.counts?.["Under Review"] || 0;
    if (cards[3]) cards[3].textContent = stats.counts?.Resolved || 0;

    if (role === "faculty") {
      const table = document.getElementById("facultyGrievanceTable");
      const tbody = table?.querySelector("tbody");
      if (tbody) {
        tbody.innerHTML = "";
        if (!items.length) tbody.innerHTML = '<tr><td colspan="6">No grievances are currently in your department queue.</td></tr>';
        items.forEach(g => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td><strong>${safe(g.ticketId)}</strong><br><small>${safe(g.studentName || (g.anonymous ? "Anonymous" : "Student"))}</small></td><td><strong>${safe(g.title)}</strong><br><small>${safe(g.description)}</small>${g.attachment ? `<br><small>Attachment uploaded</small>` : ""}</td><td>${safe(g.category)}</td><td>${statusBadge(g.status)}</td><td>${dateText(g.createdAt)}</td><td><button class="table-btn" data-update-id="${safe(g._id)}">Update</button></td>`;
          tbody.appendChild(tr);
        });
        tbody.querySelectorAll("[data-update-id]").forEach(btn => btn.addEventListener("click", async () => {
          const current = items.find(g => String(g._id) === String(btn.dataset.updateId));
          const status = prompt("Enter status exactly: Pending, Under Review, Resolved, or Rejected", current?.status === "Submitted" ? "Under Review" : current?.status || "Under Review");
          if (!status) return;
          if (!["Pending", "Under Review", "Resolved", "Rejected"].includes(status)) return alert("Invalid status. Use Pending, Under Review, Resolved, or Rejected.");
          const actionSummary = prompt("Describe the action taken (recommended; required by your workflow before resolving):", current?.actionSummary || "") || "";
          if (status === "Resolved" && !actionSummary.trim()) return alert("Please enter an action summary before marking this grievance Resolved.");
          btn.disabled = true;
          try {
            const result = await apiRequest(`/grievances/${encodeURIComponent(btn.dataset.updateId)}/status`, { method: "PATCH", body: JSON.stringify({ status, actionSummary }) });
            alert(result.message || "Grievance status updated.");
            await loadStaffDashboard("faculty");
          } catch (err) { showError(err); btn.disabled = false; }
        }));
      }
      const refresh = document.getElementById("refreshFacultyGrievances");
      if (refresh && !refresh.dataset.bound) { refresh.dataset.bound = "1"; refresh.addEventListener("click", () => loadStaffDashboard("faculty")); }
    } else {
      const table = document.getElementById("departmentPerformanceTable");
      const tbody = table?.querySelector("tbody");
      if (tbody) {
        tbody.innerHTML = "";
        (stats.departments || []).forEach(d => {
          const rate = d.total ? Math.round(d.resolved * 100 / d.total) : 0;
          const tr = document.createElement("tr");
          tr.innerHTML = `<td><strong>${safe(d._id || "Unassigned")}</strong></td><td>${d.total}</td><td>${d.pending}</td><td>${d.resolved}</td><td><div class="rate"><span style="width:${rate}%"></span></div><b>${rate}%</b></td>`;
          tbody.appendChild(tr);
        });
        if (!tbody.children.length) tbody.innerHTML = '<tr><td colspan="5">No grievance data available yet.</td></tr>';
      }
      const activity = document.getElementById("adminActivityList");
      if (activity) {
        activity.innerHTML = "";
        items.slice(0, 8).forEach(g => {
          const row = document.createElement("div");
          row.innerHTML = `<span class="activity-icon">✓</span><div><strong>${safe(g.ticketId)} — ${safe(g.title)}</strong><small>${safe(g.department)} · ${safe(g.status)} · ${dateText(g.updatedAt || g.createdAt)}</small></div>`;
          activity.appendChild(row);
        });
        if (!items.length) activity.textContent = "No grievances submitted yet.";
      }
    }
  } catch (err) { showError(err); }
}


async function loadNotifications() {
  const main = document.querySelector(".dashboard-main");
  if (!main || document.getElementById("voiceboxNotifications")) return;
  const section = document.createElement("section");
  section.className = "dashboard-section";
  section.id = "voiceboxNotifications";
  section.innerHTML = '<div class="section-title"><div><h2>Notifications</h2><p>Assignment, status and escalation updates.</p></div><button class="btn btn-primary small-btn" id="refreshNotifications" type="button">Refresh</button></div><div id="notificationList" class="activity-list">Loading notifications...</div>';
  const header = main.querySelector(".dashboard-header");
  if (header && header.nextSibling) main.insertBefore(section, header.nextSibling); else main.prepend(section);
  const render = async () => {
    const list = section.querySelector("#notificationList");
    try {
      const data = await apiRequest("/grievances/notifications");
      list.innerHTML = "";
      if (!(data.notifications || []).length) { list.textContent = "No notifications yet."; return; }
      data.notifications.forEach(n => {
        const row = document.createElement("div");
        row.innerHTML = `<span class="activity-icon">${n.type === "escalation" ? "!" : "✓"}</span><div><strong>${safe(n.message)}</strong><small>${dateText(n.createdAt)} · ${n.readAt ? "Read" : "Unread"}</small>${n.readAt ? "" : `<button class="table-btn" data-read-id="${safe(n._id)}">Mark read</button>`}</div>`;
        list.appendChild(row);
      });
      list.querySelectorAll("[data-read-id]").forEach(button => button.addEventListener("click", async () => {
        try { await apiRequest(`/grievances/notifications/${encodeURIComponent(button.dataset.readId)}/read`, { method: "PATCH" }); await render(); }
        catch (err) { showError(err); }
      }));
    } catch (err) { list.textContent = `Could not load notifications: ${err.message}`; }
  };
  section.querySelector("#refreshNotifications").addEventListener("click", render);
  await render();
}

async function loadEscalations() {
  const main = document.querySelector(".dashboard-main");
  if (!main || document.getElementById("slaEscalations")) return;
  const section = document.createElement("section");
  section.className = "dashboard-section";
  section.id = "slaEscalations";
  section.innerHTML = '<div class="section-title"><div><h2>SLA escalation watch</h2><p>Open grievances past their due date are flagged for administration.</p></div><button class="btn btn-primary small-btn" id="refreshEscalations" type="button">Refresh</button></div><div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Grievance</th><th>Department</th><th>Assigned faculty</th><th>Due date</th></tr></thead><tbody><tr><td colspan="5">Loading...</td></tr></tbody></table></div>';
  const allSection = document.getElementById("all-grievances");
  if (allSection) main.insertBefore(section, allSection); else main.appendChild(section);
  const render = async () => {
    const tbody = section.querySelector("tbody");
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
      const data = await apiRequest("/grievances/escalations");
      tbody.innerHTML = "";
      (data.escalations || []).forEach(g => {
        const row = document.createElement("tr");
        row.innerHTML = `<td><strong>${safe(g.ticketId)}</strong></td><td>${safe(g.title)}<br><small>${safe(g.status)}</small></td><td>${safe(g.department)}</td><td>${safe(g.assignedTo?.name || "Department queue")}</td><td>${dateText(g.dueAt)}</td>`;
        tbody.appendChild(row);
      });
      if (!tbody.children.length) tbody.innerHTML = '<tr><td colspan="5">No overdue grievances. Great!</td></tr>';
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5">${safe(err.message)}</td></tr>`; }
  };
  section.querySelector("#refreshEscalations").addEventListener("click", render);
  await render();
}

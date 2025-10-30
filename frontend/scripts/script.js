/************************************************************
 * GLOBAL CONSTANTS
 ************************************************************/
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

let refreshInterval = null;

/************************************************************
 * UTILITIES
 ************************************************************/
function redirectTo(page) {
  window.location.href = `/${page}`;
}

function showAlert(msg) {
  alert(msg);
}

/************************************************************
 * REGISTER FORM
 ************************************************************/
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const roleSelect = document.getElementById("role");
    const role = roleSelect ? roleSelect.value : "user";

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      showAlert("✅ Registration successful! Redirecting...");
      redirectTo("login.html");
    } catch (err) {
      showAlert("Error: " + err.message);
    }
  });
}

/************************************************************
 * LOGIN FORM
 ************************************************************/
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);
      localStorage.setItem("role", data.role);

      if (data.role === "superadmin") {
        redirectTo("superadmin-dashboard.html");
      } else if (data.role === "admin") {
        redirectTo("admin-dashboard.html");
      } else {
        redirectTo("dashboard.html");
      }
    } catch (err) {
      showAlert("Error: " + err.message);
    }
  });
}

/************************************************************
 * DASHBOARD USERNAME + LOGOUT
 ************************************************************/
const userName = document.getElementById("userName");
if (userName) userName.textContent = "👤 " + (localStorage.getItem("name") || "User");

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    redirectTo("login.html");
  });
}

/************************************************************
 * USER REPORT SUBMISSION
 ************************************************************/
const reportForm = document.getElementById("newReportForm");
if (reportForm) {
  if (!token) redirectTo("login.html");

  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value;

    if (!title || !description || !category)
      return showAlert("⚠️ Please fill in all fields.");

    try {
      const res = await fetch(`${API_URL}/users/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert("✅ Report submitted successfully!");
      reportForm.reset();
      await refreshReports();
    } catch (err) {
      showAlert("Error submitting report: " + err.message);
    }
  });

  // Initial load
  refreshReports();

  // 🔁 Auto refresh every 30 seconds (avoid duplicates)
  if (!refreshInterval) {
    refreshInterval = setInterval(refreshReports, 30000);
    console.log("⏱️ Auto-refresh enabled every 30 seconds");
  }
}

/************************************************************
 * LOAD USER REPORTS
 ************************************************************/
async function refreshReports() {
  await loadReports();
  await loadReportAnalytics();
}

async function loadReports() {
  const reportsDiv =
    document.getElementById("reportsContainer") ||
    document.getElementById("reports");
  if (!reportsDiv) return;

  try {
    const res = await fetch(`${API_URL}/users/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);
    const reports = await res.json();

    if (!Array.isArray(reports)) throw new Error("Invalid response from server");

    if (reports.length === 0) {
      reportsDiv.innerHTML = "<p>No reports submitted yet.</p>";
      return;
    }

    reportsDiv.innerHTML = reports
      .map(
        (r) => `
        <div class="report-card">
          <h3>${r.title}</h3>
          <p>${r.description}</p>
          <p><strong>Category:</strong> ${r.category}</p>
          <p><strong>Status:</strong> 
            <span style="color:${
              r.status === "Approved"
                ? "green"
                : r.status === "Rejected"
                ? "red"
                : "#FF0B55"
            };">${r.status}</span>
          </p>
          <p><small>${new Date(r.createdAt).toLocaleString()}</small></p>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading reports:", err);
    reportsDiv.innerHTML = `<p style="color:red;">Error loading reports: ${err.message}</p>`;
  }
}

/************************************************************
 * REQUEST ADMIN ACCESS
 ************************************************************/
const requestAdminBtn = document.getElementById("requestAdminBtn");
if (requestAdminBtn) {
  requestAdminBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_URL}/users/request-admin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert(data.message);
      requestAdminBtn.disabled = true;
      requestAdminBtn.textContent = "Request Pending";
    } catch (err) {
      showAlert("Error sending request: " + err.message);
    }
  });
}

/************************************************************
 * REPORT FILTER + ANALYTICS
 ************************************************************/
const filterBtn = document.getElementById("filterBtn");
if (filterBtn) filterBtn.addEventListener("click", loadReportAnalytics);

async function loadReportAnalytics() {
  const category = document.getElementById("categoryFilter")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "";
  const container = document.getElementById("reportsContainer");

  try {
    const res = await fetch(`${API_URL}/users/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const reports = await res.json();
    if (!Array.isArray(reports)) throw new Error("Invalid report data.");

    let filtered = reports;
    if (category) filtered = filtered.filter((r) => r.category === category);
    if (status) filtered = filtered.filter((r) => r.status === status);

    renderReports(filtered);
    renderAnalyticsChart(filtered);
  } catch (err) {
    console.error("Report analytics error:", err);
    container.innerHTML = `<p style="color:red;">Error loading reports: ${err.message}</p>`;
  }
}

function renderReports(reports) {
  const container = document.getElementById("reportsContainer");
  if (!reports || reports.length === 0) {
    container.innerHTML = "<p>No reports found.</p>";
    return;
  }

  container.innerHTML = reports
    .map(
      (r) => `
      <div class="report-card">
        <h3>${r.title}</h3>
        <p>${r.description}</p>
        <p><strong>Category:</strong> ${r.category}</p>
        <p><strong>Status:</strong> 
          <span style="color:${
            r.status === "Approved"
              ? "green"
              : r.status === "Rejected"
              ? "red"
              : "#FF0B55"
          };">${r.status}</span>
        </p>
      </div>`
    )
    .join("");
}

let chartInstance;
function renderAnalyticsChart(reports) {
  const ctx = document.getElementById("reportAnalyticsChart");
  if (!ctx) return;

  const categories = [
    "Finance Report",
    "Sales Report",
    "Resources Report",
    "Inventory Report",
    "Status Report",
  ];

  const counts = categories.map(
    (cat) => reports.filter((r) => r.category === cat).length
  );

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories,
      datasets: [
        {
          label: "Reports by Category",
          data: counts,
          backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47", "#FFC2C2", "#FF7B9E"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "📊 Report Overview (Auto-refreshing)" },
      },
      animation: { duration: 800, easing: "easeOutBounce" },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

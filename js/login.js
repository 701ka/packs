const API = "http://localhost:4000/api";

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

// ===== NAV USER =====
function renderNavUser() {
  const user = getUser();
  const navUser = document.getElementById("navUser");
  if (!navUser) return;

  if (user) {
    const initials = user.name
      ? user.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";
    navUser.innerHTML = `
      <div class="nav-avatar" onclick="toggleDropdown()">
        <div class="avatar-circle">${initials}</div>
      </div>
      <div class="nav-dropdown" id="navDropdown">
        <div class="dropdown-header">
          <div class="dropdown-avatar">${initials}</div>
          <div>
            <div class="dropdown-name">${user.name}</div>
            <div class="dropdown-email">${user.email}</div>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        ${user.role === "admin" ? `<a href="/pages/admin-panel.html" class="dropdown-item">⚙️ Admin Panel</a>` : ""}
        ${user.role === "uploader" || user.role === "admin" ? `<a href="/pages/uploader-panel.html" class="dropdown-item">📤 Uploader Panel</a>` : ""}
        ${user.role === "admin" || user.role === "uploader" ? `<div class="dropdown-divider"></div>` : ""}
        <a href="#" class="dropdown-item">👤 Profile</a>
        <a href="#" class="dropdown-item">📦 My Packs</a>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item danger" onclick="logout()">🚪 Logout</a>
      </div>
    `;
  } else {
    navUser.innerHTML = `
      <a href="/pages/login.html" class="nav-btn-outline">Log In</a>
      <a href="/pages/signup.html" class="nav-btn">Sign Up Free</a>
    `;
  }
}

function toggleDropdown() {
  const dd = document.getElementById("navDropdown");
  if (dd) dd.classList.toggle("show");
}

function logout() {
  showConfirm({
    title: "Chiqish",
    message: "Akkauntdan chiqmoqchimisiz?",
    confirmText: "Ha, chiqish",
    cancelText: "Bekor",
    type: "warning",
    onConfirm: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    },
  });
}

document.addEventListener("click", function (e) {
  const avatar = document.querySelector(".nav-avatar");
  const dropdown = document.getElementById("navDropdown");
  if (dropdown && avatar && !avatar.contains(e.target)) {
    dropdown.classList.remove("show");
  }
});

// ===== ROLE SYNC =====
async function syncUserRole() {
  const token = localStorage.getItem("token");
  if (!token) {
    renderNavUser();
    return;
  }
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (res.ok) {
      const fresh = await res.json();
      const stored = getUser();
      if (stored && stored.role !== fresh.role) {
        localStorage.setItem("user", JSON.stringify({ ...stored, ...fresh }));
      }
    }
  } catch {}
  renderNavUser();
}

// ===== PACK THUMB =====
function packThumb(p) {
  if (p.img)
    return `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
  return `<div style="width:100%;height:100%;background:linear-gradient(135deg,#7c3aed,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${p.name[0]}</div>`;
}

function goToDetail(id) {
  if (!getUser()) {
    localStorage.setItem("redirect", `/pages/detail.html?id=${id}`);
    window.location.href = "/pages/login.html";
    return;
  }
  window.location.href = `/pages/detail.html?id=${id}`;
}

// ===== MAIN DATA LOAD =====
let allPacks = [];

async function loadLandingData() {
  try {
    const res = await fetch(`${API}/packs`);
    allPacks = await res.json();

    // Stats
    const totalEl = document.getElementById("statTotal");
    const freeEl = document.getElementById("statFree");
    if (totalEl) totalEl.textContent = allPacks.length + "+";
    if (freeEl)
      freeEl.textContent =
        allPacks.filter((p) => p.price === "Free" || p.price === "$0").length +
        "+";

    // Category counts
    ["CapCut", "After Effects", "Premiere", "DaVinci", "Final Cut"].forEach(
      (app) => {
        const el = document.getElementById(`count-${app}`);
        if (el)
          el.textContent =
            allPacks.filter((p) =>
              (Array.isArray(p.apps)
                ? p.apps
                : JSON.parse(p.apps || "[]")
              ).includes(app),
            ).length + " packs";
      },
    );
    const freeCountEl = document.getElementById("count-Free");
    if (freeCountEl)
      freeCountEl.textContent =
        allPacks.filter((p) => p.price === "Free" || p.price === "$0").length +
        " packs";

    loadPackOfWeek();
    loadTrending();
  } catch (e) {
    console.error("Landing data yuklanmadi:", e);
  }
}

// ===== PACK OF THE WEEK =====
function loadPackOfWeek() {
  // Narxli packlar orasidan birinchi (yoki random) bitta tanlash
  const paid = allPacks.filter(
    (p) => p.price !== "Free" && p.price !== "$0" && p.price,
  );
  const potw = paid.length ? paid[0] : allPacks[0];
  if (!potw) return;

  const nameEl = document.getElementById("potwName");
  const descEl = document.getElementById("potwDesc");
  const imgEl = document.getElementById("potwImg");
  const priceEl = document.getElementById("potwPrice");

  if (nameEl) nameEl.textContent = potw.name;
  if (descEl)
    descEl.textContent = potw.desc ? potw.desc.slice(0, 80) + "..." : "";
  if (priceEl) priceEl.textContent = potw.price || "$12";
  if (imgEl) {
    if (potw.img)
      imgEl.innerHTML = `<img src="${potw.img}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
    else imgEl.textContent = potw.name[0];
  }

  window._potwId = potw.id;
}

function potwDownload() {
  if (!getUser()) {
    localStorage.setItem("redirect", window.location.href);
    window.location.href = "/pages/login.html";
    return;
  }
  if (window._potwId) goToDetail(window._potwId);
}

// Pack of the week countdown
function startPotwTimer() {
  const el = document.getElementById("potwTimer");
  if (!el) return;

  // Haftaning oxirigacha hisoblash
  function update() {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 0);
    const diff = endOfWeek - now;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}k ${h}s ${m}d`;
  }
  update();
  setInterval(update, 60000);
}

// ===== TRENDING =====
function loadTrending() {
  const container = document.getElementById("trendingList");
  if (!container) return;

  // Download sonini simulatsiya (DB da yo'q, keyinchalik qo'shsa bo'ladi)
  const fakeCounts = [2340, 1890, 1420, 1100, 890];
  const sorted = [...allPacks].slice(0, 5);

  if (!sorted.length) {
    container.innerHTML =
      '<div style="color:var(--muted);text-align:center;padding:40px">Hozircha packlar yo\'q</div>';
    return;
  }

  container.innerHTML = sorted
    .map((p, i) => {
      const apps = Array.isArray(p.apps) ? p.apps : JSON.parse(p.apps || "[]");
      const isFree = p.price === "Free" || p.price === "$0";
      return `
      <div class="trending-item" onclick="goToDetail(${p.id})">
        <div class="trending-rank ${i < 3 ? "top" : ""}">${i + 1}</div>
        <div class="trending-thumb">
          ${p.img ? `<img src="${p.img}">` : `<span>${p.name[0]}</span>`}
        </div>
        <div class="trending-info">
          <div class="trending-name">${p.name}</div>
          <div class="trending-count">${(fakeCounts[i] || 500).toLocaleString()} downloads bu hafta · ${apps.slice(0, 2).join(", ")}</div>
        </div>
        <div class="trending-price ${isFree ? "free" : ""}">${isFree ? "Free" : p.price}</div>
        ${p.badge ? `<span class="pack-badge badge-${p.badge}" style="position:static;margin-left:8px">${p.badge}</span>` : ""}
      </div>
    `;
    })
    .join("");
}

// ===== QUIZ =====
const quizAnswers = {};

function quizAnswer(step, value) {
  quizAnswers[step] = value;
  const current = document.getElementById(`qStep${step}`);
  const next = document.getElementById(`qStep${step + 1}`);
  if (current) current.classList.remove("active");
  if (next) {
    next.classList.add("active");
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  const result = document.getElementById("qResult");
  if (result) result.classList.add("active");

  const app = quizAnswers[0] || "All";
  const price = quizAnswers[2];

  let filtered = [...allPacks];
  if (app !== "All") {
    filtered = filtered.filter((p) =>
      (Array.isArray(p.apps) ? p.apps : JSON.parse(p.apps || "[]")).includes(
        app,
      ),
    );
  }
  if (price === "free") {
    filtered = filtered.filter((p) => p.price === "Free" || p.price === "$0");
  } else if (price === "cheap") {
    filtered = filtered.filter((p) => {
      const num = parseFloat((p.price || "").replace("$", ""));
      return !isNaN(num) && num <= 10;
    });
  }

  if (!filtered.length) filtered = allPacks.slice(0, 3);
  const top3 = filtered.slice(0, 3);

  const subEl = document.getElementById("quizResultSub");
  if (subEl) subEl.textContent = `${app} uchun ${top3.length} ta pack topildi`;

  const gridEl = document.getElementById("quizResultGrid");
  if (gridEl) {
    gridEl.innerHTML = top3
      .map((p) => {
        const isFree = p.price === "Free" || p.price === "$0";
        return `
        <div class="quiz-result-card" onclick="goToDetail(${p.id})">
          <div class="quiz-result-img">
            ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover">` : p.name[0]}
          </div>
          <div class="quiz-result-name">${p.name.slice(0, 30)}${p.name.length > 30 ? "..." : ""}</div>
          <div class="quiz-result-price">${isFree ? "Free" : p.price}</div>
        </div>
      `;
      })
      .join("");
  }
}

function quizRestart() {
  Object.keys(quizAnswers).forEach((k) => delete quizAnswers[k]);
  document
    .querySelectorAll(".quiz-step")
    .forEach((s) => s.classList.remove("active"));
  const first = document.getElementById("qStep0");
  if (first) first.classList.add("active");
}

// ===== NEWSLETTER =====
function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById("nlEmail").value;
  if (!email) return;

  // Local storage da saqlash (backend endpoint bo'lmasa)
  const subs = JSON.parse(localStorage.getItem("ep_subscribers") || "[]");
  if (subs.includes(email)) {
    showToast("Bu email allaqachon obuna bo'lgan!", "info");
    return;
  }
  subs.push(email);
  localStorage.setItem("ep_subscribers", JSON.stringify(subs));

  document.getElementById("nlEmail").value = "";
  showToast(
    "✅ Obuna bo'ldingiz! Yangi packlar haqida xabar oласиz.",
    "success",
  );
}

function showToast(msg, type = "success") {
  if (
    typeof window.showToast === "function" &&
    window.showToast !== showToast
  ) {
    window.showToast(msg, type);
    return;
  }
  const colors = {
    success: "#4ade80",
    error: "#ef4444",
    info: "#38bdf8",
    warning: "#fb923c",
  };
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--surface);border:1px solid var(--border);border-left:3px solid ${colors[type] || colors.success};border-radius:10px;padding:12px 20px;font-size:14px;color:var(--text);opacity:0;transition:all 0.25s;z-index:9999;white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
  }, 10);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ===== INIT =====
loadLandingData();
syncUserRole();
startPotwTimer();
async function login(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error");
  errorEl.style.display = "none";

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    const redirect = localStorage.getItem("redirect");
    if (redirect) {
      localStorage.removeItem("redirect");
      window.location.href = redirect;
    } else window.location.href = "/";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
}

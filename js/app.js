/* ===========================
   EditorPack — app.js
   =========================== */

const API = "http://localhost:4000/api";

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function requireLogin() {
  if (!getUser()) {
    localStorage.setItem("redirect", window.location.href);
    window.location.href = "/pages/login.html";
    return false;
  }
  return true;
}

const GRAD_PAIRS = [
  ["#7c3aed", "#0ea5e9"],
  ["#db2777", "#7c3aed"],
  ["#0ea5e9", "#10b981"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
];

function packThumb(p) {
  if (p.img) {
    return `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  const col = GRAD_PAIRS[p.id % GRAD_PAIRS.length];
  return `<div style="width:100%;height:100%;background:linear-gradient(135deg,${col[0]},${col[1]});display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${p.name[0]}</div>`;
}

let currentFilter = "All";
let currentSearch = "";
let allPacks = [];

async function loadPacksFromAPI() {
  try {
    const params = new URLSearchParams();
    if (currentFilter === "Free") params.set("free", "true");
    else if (currentFilter !== "All") params.set("app", currentFilter);
    if (currentSearch) params.set("search", currentSearch);

    const res = await fetch(`${API}/packs?${params}`);
    const packs = await res.json();
    allPacks = packs;
    renderPackGrid(packs);
  } catch {
    const grid = document.getElementById("packGrid");
    if (grid)
      grid.innerHTML =
        '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">Packlar yuklanmadi. Server ishlayaptimi?</p>';
  }
}

function renderPackGrid(packs) {
  const grid = document.getElementById("packGrid");
  if (!grid) return;

  if (!packs || packs.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">No packs found.</p>';
    return;
  }

  grid.innerHTML = packs
    .map(
      (p) => `
    <div class="pack-card" onclick="openDetail(${p.id})">
      <div class="pack-thumb">
        ${packThumb(p)}
        ${p.badge ? `<span class="pack-badge badge-${p.badge}">${p.badge}</span>` : ""}
      </div>
      <div class="pack-info">
        <div class="pack-app-tags">
          ${(Array.isArray(p.apps) ? p.apps : JSON.parse(p.apps || "[]")).map((a) => `<span class="app-tag">${a}</span>`).join("")}
        </div>
        <div class="pack-name">${p.name}</div>
        <div class="pack-desc">${p.desc}</div>
        <div class="pack-footer">
          <span class="pack-price ${p.price === "Free" || p.price === "$0" ? "free" : ""}">
            ${p.price === "$0" ? "Free" : p.price}
          </span>
          <button class="pack-dl-btn">
            ${p.price === "Free" || p.price === "$0" ? "Download" : "Get Pack"}
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function openDetail(id) {
  if (!requireLogin()) return;
  window.location.href = "/pages/detail.html?id=" + id;
}

function setFilter(f, btn) {
  currentFilter = f;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadPacksFromAPI();
}

function filterPacks(q) {
  currentSearch = q;
  loadPacksFromAPI();
}

// NAV USER
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

// Ishga tushirish
loadPacksFromAPI();
renderNavUser();

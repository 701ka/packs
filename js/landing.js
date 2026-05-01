const API = "http://localhost:4000/api";

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

// Nav user
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

// Pack data
function packThumb(p) {
  if (p.img) {
    return `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  return `<div style="width:100%;height:100%;background:linear-gradient(135deg,#7c3aed,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${p.name[0]}</div>`;
}

async function loadLandingData() {
  try {
    const res = await fetch(`${API}/packs`);
    const packs = await res.json();

    // Stats
    const totalEl = document.getElementById("statTotal");
    const freeEl = document.getElementById("statFree");
    if (totalEl) totalEl.textContent = packs.length + "+";
    if (freeEl)
      freeEl.textContent =
        packs.filter((p) => p.price === "Free" || p.price === "$0").length +
        "+";

    // Category counts
    const apps = [
      "CapCut",
      "After Effects",
      "Premiere",
      "DaVinci",
      "Final Cut",
    ];
    apps.forEach((app) => {
      const el = document.getElementById(`count-${app}`);
      if (el) {
        const count = packs.filter((p) =>
          (Array.isArray(p.apps)
            ? p.apps
            : JSON.parse(p.apps || "[]")
          ).includes(app),
        ).length;
        el.textContent = count + " packs";
      }
    });
    const freeCountEl = document.getElementById("count-Free");
    if (freeCountEl) {
      const count = packs.filter(
        (p) => p.price === "Free" || p.price === "$0",
      ).length;
      freeCountEl.textContent = count + " packs";
    }

    // Trending
    const trendingGrid = document.getElementById("trendingGrid");
    if (trendingGrid) {
      const trending = packs
        .filter((p) => p.badge === "hot" || p.badge === "new")
        .slice(0, 4);
      renderTrendingGrid(
        trendingGrid,
        trending.length ? trending : packs.slice(0, 4),
      );
    }
  } catch (e) {
    console.error("Landing data yuklanmadi:", e);
  }
}

function renderTrendingGrid(grid, packs) {
  if (!packs.length) {
    grid.innerHTML =
      '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:20px">Hozircha packlar yo\'q.</p>';
    return;
  }

  grid.innerHTML = packs
    .map(
      (p) => `
    <div class="pack-card" onclick="goToDetail(${p.id})">
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

function goToDetail(id) {
  const user = getUser();
  if (!user) {
    localStorage.setItem("redirect", `/pages/detail.html?id=${id}`);
    window.location.href = "/pages/login.html";
    return;
  }
  window.location.href = `/pages/detail.html?id=${id}`;
}

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
    if (!res.ok) {
      renderNavUser();
      return;
    }
    const fresh = await res.json();
    const stored = getUser();
    if (stored && stored.role !== fresh.role) {
      localStorage.setItem("user", JSON.stringify({ ...stored, ...fresh }));
    }
  } catch {}
  renderNavUser();
}

// Init
loadLandingData();
syncUserRole(); // renderNavUser() o'rniga — role ni yangilab ko'rsatadi

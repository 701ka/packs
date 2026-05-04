/* ===========================
   EditorPack — nav.js
   Shared nav component
   =========================== */

function renderNavUser() {
  const user = EP.getUser();
  const navUser = document.getElementById("navUser");
  if (!navUser) return;

  if (user) {
    const ini = user.name
      ? user.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

    navUser.innerHTML = `
      <div class="nav-avatar" onclick="toggleDropdown()">
        <div class="avatar-circle">${ini}</div>
      </div>
      <div class="nav-dropdown" id="navDropdown">
        <div class="dropdown-header">
          <div class="dropdown-avatar">${ini}</div>
          <div>
            <div class="dropdown-name">${user.name}</div>
            <div class="dropdown-email">${user.email}</div>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        ${user.role === "admin" ? `<a href="/pages/admin-panel.html" class="dropdown-item">⚙️ Admin Panel</a>` : ""}
        ${user.role === "uploader" || user.role === "admin" ? `<a href="/pages/uploader-panel.html" class="dropdown-item">📤 Uploader Panel</a>` : ""}
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item">👤 Profil</a>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item danger" onclick="epLogout()">🚪 Chiqish</a>
      </div>`;
  } else {
    navUser.innerHTML = `
      <a href="/pages/login.html" class="nav-btn-outline">Kirish</a>
      <a href="/pages/signup.html" class="nav-btn">Ro'yxatdan o'tish</a>`;
  }
}

function toggleDropdown() {
  document.getElementById("navDropdown")?.classList.toggle("show");
}

document.addEventListener("click", (e) => {
  const avatar = document.querySelector(".nav-avatar");
  const dd = document.getElementById("navDropdown");
  if (dd && avatar && !avatar.contains(e.target)) dd.classList.remove("show");
});

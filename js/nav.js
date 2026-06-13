/* ===========================
   EditorPack — nav.js
   Shared nav component
   =========================== */

function _esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function _navAvatarHtml(user) {
  const ini = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  if (user.avatar)
    return `<img src="${user.avatar}" class="avatar-circle avatar-img" alt="${ini}" />`;
  return `<div class="avatar-circle">${ini}</div>`;
}

function renderNavUser() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navUser = document.getElementById("navUser");
  if (!navUser) return;

  if (user) {
    const ini = user.name
      ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";
    const avatarHtml = _navAvatarHtml(user);

    navUser.innerHTML = `
      <div class="nav-avatar" onclick="toggleDropdown()">
        ${avatarHtml}
      </div>
      <div class="nav-dropdown" id="navDropdown">
        <div class="dropdown-header">
          ${avatarHtml.replace('class="avatar-circle', 'class="dropdown-avatar avatar-circle')}
          <div>
            <div class="dropdown-name">${_esc(user.name)}</div>
            <div class="dropdown-email">${_esc(user.email)}</div>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="/pages/profile.html" class="dropdown-item">👤 Profil</a>
        ${user.role === "admin" ? `<a href="/pages/admin-panel.html" class="dropdown-item">⚙️ Admin Panel</a>` : ""}
        ${user.role === "uploader" || user.role === "admin" ? `<a href="/pages/uploader-panel.html" class="dropdown-item">📤 Uploader Panel</a>` : ""}
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

const API = "http://localhost:4000/api";
let allUsers = [],
  allPacks = [];
let searchQuery = "",
  packStatusFilter = "all",
  packNameFilter = "";

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}
function getToken() {
  return localStorage.getItem("token");
}

const me = getUser();
if (!me || me.role !== "admin") window.location.href = "/";

function initials(name) {
  return name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
}

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ===== TABS =====
function switchTab(tab) {
  document.getElementById("tab-users").style.display =
    tab === "users" ? "block" : "none";
  document.getElementById("tab-packs").style.display =
    tab === "packs" ? "block" : "none";
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    b.classList.toggle(
      "active",
      (i === 0 && tab === "users") || (i === 1 && tab === "packs"),
    );
  });
  if (tab === "packs") fetchPacks();
}

// ===== USERS =====
async function fetchUsers() {
  try {
    const res = await fetch(`${API}/admin/users`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (res.status === 401) {
      window.location.href = "/pages/login.html";
      return;
    }
    if (!res.ok) throw new Error(`${res.status}`);
    allUsers = await res.json();
    updateStats();
    renderTable();
  } catch (e) {
    document.getElementById("tableWrap").innerHTML =
      `<div class="empty-state">Xatolik: ${e.message}. <a href="#" onclick="fetchUsers()" style="color:var(--accent)">Qayta urinish</a></div>`;
  }
}

function updateStats() {
  document.getElementById("totalUsers").textContent = allUsers.length;
  document.getElementById("totalUploaders").textContent = allUsers.filter(
    (u) => u.role === "uploader",
  ).length;
  document.getElementById("totalAdmins").textContent = allUsers.filter(
    (u) => u.role === "admin",
  ).length;
}

function renderTable() {
  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery),
  );
  if (filtered.length === 0) {
    document.getElementById("tableWrap").innerHTML =
      '<div class="empty-state">Foydalanuvchi topilmadi.</div>';
    return;
  }
  document.getElementById("tableWrap").innerHTML = `
    <table>
      <thead><tr>
        <th>Foydalanuvchi</th><th>Role</th><th>Role o'zgartirish</th><th>Qo'shilgan</th><th>Amal</th>
      </tr></thead>
      <tbody>
        ${filtered
          .map(
            (u) => `
          <tr id="row-${u.id}">
            <td>
              <div class="user-info">
                <div class="user-avatar">${initials(u.name)}</div>
                <div>
                  <div class="user-name">${u.name}</div>
                  <div class="user-email">${u.email}</div>
                </div>
              </div>
            </td>
            <td><span class="role-badge role-${u.role}">${u.role}</span></td>
            <td>
              <select class="role-select" onchange="changeRole(${u.id}, this.value)"
                ${u.email === "karimovbdulloh@gmail.com" ? "disabled" : ""}>
                <option value="user"     ${u.role === "user" ? "selected" : ""}>User</option>
                <option value="uploader" ${u.role === "uploader" ? "selected" : ""}>Uploader</option>
                <option value="admin"    ${u.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </td>
            <td class="joined-date">${formatDate(u.created_at)}</td>
            <td>
              ${
                u.email !== "karimovbdulloh@gmail.com"
                  ? `<button class="delete-btn" onclick="deleteUser(${u.id})">O'chirish</button>`
                  : '<span style="color:var(--muted);font-size:13px">Himoyalangan</span>'
              }
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function filterUsers(q) {
  searchQuery = q.toLowerCase();
  renderTable();
}

async function changeRole(id, role) {
  try {
    const res = await fetch(`${API}/admin/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error();
    const u = allUsers.find((x) => x.id === id);
    if (u) u.role = role;
    updateStats();
    renderTable();
    showToast("Role muvaffaqiyatli o'zgartirildi!", "success");
  } catch {
    showToast("Xatolik yuz berdi!", "error");
  }
}

async function deleteUser(id) {
  showConfirm({
    title: "Foydalanuvchini o'chirish",
    message: "Bu foydalanuvchini o'chirsangiz qaytarib bo'lmaydi!",
    confirmText: "O'chirish",
    cancelText: "Bekor",
    type: "danger",
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/admin/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + getToken() },
        });
        if (!res.ok) throw new Error();
        allUsers = allUsers.filter((x) => x.id !== id);
        updateStats();
        renderTable();
        showToast("Foydalanuvchi o'chirildi.", "success");
      } catch {
        showToast("Xatolik yuz berdi!", "error");
      }
    },
  });
}

// ===== PACKS =====
async function fetchPacks() {
  document.getElementById("packsTableWrap").innerHTML =
    '<div class="empty-state">Yuklanmoqda...</div>';
  try {
    const res = await fetch(`${API}/admin/packs`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    allPacks = await res.json();
    updatePackStats();
    renderPacksTable();
  } catch (e) {
    document.getElementById("packsTableWrap").innerHTML =
      `<div class="empty-state">Xatolik: ${e.message}. <a href="#" onclick="fetchPacks()" style="color:var(--accent)">Qayta urinish</a></div>`;
  }
}

function updatePackStats() {
  document.getElementById("totalPacks").textContent = allPacks.length;
  document.getElementById("pendingPacks").textContent = allPacks.filter(
    (p) => p.status === "pending",
  ).length;
  document.getElementById("livePacks").textContent = allPacks.filter(
    (p) => p.status === "live",
  ).length;
}

function filterPacksByStatus(v) {
  packStatusFilter = v;
  renderPacksTable();
}
function filterPacksByName(v) {
  packNameFilter = v.toLowerCase();
  renderPacksTable();
}

function renderPacksTable() {
  let filtered = allPacks;
  if (packStatusFilter !== "all")
    filtered = filtered.filter((p) => p.status === packStatusFilter);
  if (packNameFilter)
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(packNameFilter),
    );

  if (filtered.length === 0) {
    document.getElementById("packsTableWrap").innerHTML =
      '<div class="empty-state">Pack topilmadi.</div>';
    return;
  }

  document.getElementById("packsTableWrap").innerHTML = `
    <table>
      <thead><tr>
        <th>Pack</th><th>Uploader</th><th>Status</th><th>Narx</th><th>Amallar</th>
      </tr></thead>
      <tbody>
        ${filtered
          .map(
            (p) => `
          <tr>
            <td>
              <div class="user-info">
                ${
                  p.img
                    ? `<img src="${p.img}" style="width:40px;height:40px;border-radius:8px;object-fit:cover"/>`
                    : '<div class="user-avatar">📦</div>'
                }
                <div>
                  <div class="user-name">${p.name}</div>
                  <div class="user-email">${(p.desc || "").slice(0, 45)}${(p.desc || "").length > 45 ? "..." : ""}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="user-name">${p.uploader_name || "—"}</div>
              <div class="user-email">${p.uploader_email || ""}</div>
            </td>
            <td><span class="role-badge status-${p.status}">${
              p.status === "live"
                ? "✅ Live"
                : p.status === "pending"
                  ? "⏳ Pending"
                  : "❌ Rad"
            }</span></td>
            <td style="color:var(--accent);font-weight:600">${p.price || "Free"}</td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${
                  p.status === "pending"
                    ? `
                  <button class="approve-btn" onclick="changePackStatus(${p.id},'live')">✓ Tasdiqlash</button>
                  <button class="reject-btn"  onclick="changePackStatus(${p.id},'rejected')">✗ Rad</button>`
                    : ""
                }
                ${
                  p.status === "live"
                    ? `
                  <button class="reject-btn" onclick="changePackStatus(${p.id},'pending')">Pendingga</button>`
                    : ""
                }
                ${
                  p.status === "rejected"
                    ? `
                  <button class="approve-btn" onclick="changePackStatus(${p.id},'live')">✓ Tasdiqlash</button>`
                    : ""
                }
                <button class="edit-btn"   onclick="openPackEdit(${p.id})">✏️</button>
                <button class="delete-btn" onclick="deletePack(${p.id})">🗑️</button>
              </div>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

async function changePackStatus(id, status) {
  try {
    const res = await fetch(`${API}/admin/packs/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error();
    const p = allPacks.find((x) => x.id === id);
    if (p) p.status = status;
    updatePackStats();
    renderPacksTable();
    showToast(
      status === "live"
        ? "✅ Pack tasdiqlandi!"
        : status === "rejected"
          ? "❌ Pack rad etildi."
          : "Pack pending qilindi.",
      "success",
    );
  } catch {
    showToast("Xatolik yuz berdi!", "error");
  }
}

async function deletePack(id) {
  showConfirm({
    title: "Packni o'chirish",
    message: "Bu packni o'chirsangiz qaytarib bo'lmaydi!",
    confirmText: "O'chirish",
    cancelText: "Bekor",
    type: "danger",
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/admin/packs/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + getToken() },
        });
        if (!res.ok) throw new Error();
        allPacks = allPacks.filter((x) => x.id !== id);
        updatePackStats();
        renderPacksTable();
        showToast("Pack o'chirildi.", "success");
      } catch {
        showToast("Xatolik yuz berdi!", "error");
      }
    },
  });
}

function openPackEdit(id) {
  const p = allPacks.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("editName").value = p.name;
  document.getElementById("editDesc").value = p.desc || "";
  document.getElementById("editPrice").value = p.price || "Free";
  document.getElementById("editImg").value = p.img || "";
  document.getElementById("editDownload").value = p.download_url || "";
  document.getElementById("editBadge").value = p.badge || "";
  document.getElementById("editStatus").value = p.status;
  document.getElementById("editModal").style.display = "flex";
}

function closeModal(e) {
  if (e.target.id === "editModal")
    document.getElementById("editModal").style.display = "none";
}

async function savePack() {
  const id = document.getElementById("editId").value;
  const body = {
    name: document.getElementById("editName").value,
    desc: document.getElementById("editDesc").value,
    price: document.getElementById("editPrice").value,
    img: document.getElementById("editImg").value,
    download_url: document.getElementById("editDownload").value,
    badge: document.getElementById("editBadge").value,
    status: document.getElementById("editStatus").value,
    apps: [],
  };
  try {
    const res = await fetch(`${API}/admin/packs/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    document.getElementById("editModal").style.display = "none";
    fetchPacks();
    showToast("Pack saqlandi!", "success");
  } catch {
    showToast("Xatolik!", "error");
  }
}

// ===== INIT =====
fetchUsers();
setInterval(fetchUsers, 10000);

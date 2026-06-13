const API = window.API_BASE || "/api";

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}
function getToken() {
  return localStorage.getItem("token");
}

function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function starsHtml(r) {
  return "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
}

function timeSince(iso) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "bugun";
  if (days < 30) return `${days} kun oldin`;
  if (days < 365) return `${Math.floor(days / 30)} oy oldin`;
  return `${Math.floor(days / 365)} yil oldin`;
}

// ===== LOAD PAGE =====
async function loadProfile() {
  const user = getUser();
  if (!user) {
    localStorage.setItem("redirect", window.location.href);
    window.location.href = "/pages/login.html";
    return;
  }

  // Populate name edit input
  document.getElementById("editName").value = user.name || "";

  // Render nav
  if (typeof renderNavUser === "function") renderNavUser();

  // Avatar
  renderAvatar(user);

  // Identity
  document.getElementById("profileName").textContent = user.name || "Foydalanuvchi";
  document.getElementById("profileEmail").textContent = user.email || "";
  const roleLabels = { admin: "Admin", uploader: "Uploader", user: "User" };
  const roleBadge = document.getElementById("profileRoleBadge");
  roleBadge.textContent = roleLabels[user.role] || user.role;
  roleBadge.className = `profile-role-badge role-${user.role}`;
  if (user.created_at) {
    document.getElementById("profileSince").textContent =
      "A'zo bo'lgan: " + new Date(user.created_at).toLocaleDateString("uz-UZ");
  }

  // Load packs
  const [allRes] = await Promise.all([fetch(`${API}/packs`)]);
  const allPacks = allRes.ok ? await allRes.json() : [];

  // My packs (uploaded_by check not exposed in publicPack — filter by uploader_name won't work)
  // Use uploader/packs if uploader/admin, else show nothing for regular users
  let myPacks = [];
  if (user.role === "uploader" || user.role === "admin") {
    const myRes = await fetch(`${API}/uploader/packs`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    myPacks = myRes.ok ? await myRes.json() : [];
    // Compute total downloads from my packs
    const totalDl = myPacks.reduce((s, p) => s + (p.downloads || 0), 0);
    document.getElementById("statDownloads").textContent = totalDl;
  } else {
    document.getElementById("myPacksSection").style.display = "none";
    document.getElementById("statDownloads").textContent = "—";
  }

  document.getElementById("statPacks").textContent = myPacks.length;

  // My reviews count
  const reviewsRes = await Promise.all(
    allPacks.slice(0, 20).map((p) =>
      fetch(`${API}/packs/${p.id}/reviews`).then((r) => (r.ok ? r.json() : [])),
    ),
  );
  const myReviewCount = reviewsRes
    .flat()
    .filter((r) => r.user_id === user.id).length;
  document.getElementById("statReviews").textContent = myReviewCount;

  // Render my packs
  renderMyPacks(myPacks);

  // Top downloaded
  const sorted = [...allPacks].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 10);
  renderTopPacks(sorted);
}

function renderAvatar(user) {
  const el = document.getElementById("profileAvatar");
  if (!el) return;
  if (user.avatar) {
    el.innerHTML = `<img src="${user.avatar}" alt="${user.name}" />`;
    el.classList.add("has-img");
  } else {
    const ini = (user.name || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    el.textContent = ini;
    el.classList.remove("has-img");
  }
}

function renderMyPacks(packs) {
  const el = document.getElementById("myPacksList");
  if (!packs.length) {
    el.innerHTML = '<div class="profile-empty">Hali pack yuklamagansiz</div>';
    return;
  }
  el.innerHTML = packs
    .map(
      (p) => `
    <div class="profile-pack-row" onclick="window.location.href='/pages/detail.html?id=${p.id}'">
      ${p.img ? `<img class="profile-pack-img" src="${p.img}" alt="${p.name}" />` : `<div class="profile-pack-img-ph">PACK</div>`}
      <div class="profile-pack-info">
        <div class="profile-pack-name">${esc(p.name)}</div>
        <div class="profile-pack-meta">
          <span class="status-badge status-${esc(p.status)}">${esc(p.status)}</span>
          <span>${p.downloads || 0} yuklanish</span>
          ${p.avg_rating ? `<span>${starsHtml(p.avg_rating)} ${p.avg_rating}</span>` : ""}
        </div>
      </div>
      <div class="profile-pack-price ${p.price === "Free" ? "free" : ""}">${esc(p.price || "Free")}</div>
    </div>`,
    )
    .join("");
}

function renderTopPacks(packs) {
  const el = document.getElementById("topPacksList");
  if (!packs.length || !packs[0].downloads) {
    el.innerHTML = '<div class="profile-empty">Hali yuklanish statistikasi yo\'q</div>';
    return;
  }
  el.innerHTML = packs
    .filter((p) => p.downloads > 0)
    .map(
      (p, i) => `
    <div class="profile-pack-row top-pack" onclick="window.location.href='/pages/detail.html?id=${p.id}'">
      <div class="top-pack-rank">#${i + 1}</div>
      ${p.img ? `<img class="profile-pack-img" src="${p.img}" alt="${p.name}" />` : `<div class="profile-pack-img-ph">PACK</div>`}
      <div class="profile-pack-info">
        <div class="profile-pack-name">${esc(p.name)}</div>
        <div class="profile-pack-meta">
          <span>${p.downloads} yuklanish</span>
          ${p.avg_rating ? `<span>${starsHtml(p.avg_rating)} ${p.avg_rating}</span>` : ""}
        </div>
      </div>
    </div>`,
    )
    .join("") || '<div class="profile-empty">Hali yuklanish yo\'q</div>';
}

// ===== SAVE NAME =====
async function saveProfile() {
  const name = document.getElementById("editName").value.trim();
  if (!name) return showNotify("Ism kiriting", "warn");
  try {
    const res = await fetch(`${API}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
    const updated = await res.json();
    localStorage.setItem("user", JSON.stringify(updated));
    document.getElementById("profileName").textContent = updated.name;
    if (typeof renderNavUser === "function") renderNavUser();
    showNotify("Ism saqlandi", "success");
  } catch (err) {
    showNotify(err.message, "error");
  }
}

// ===== AVATAR UPLOAD =====
function handleAvatarFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return showNotify("Rasm 5MB dan kichik bo'lsin", "warn");
  const reader = new FileReader();
  reader.onload = (e) => resizeAndSaveAvatar(e.target.result);
  reader.readAsDataURL(file);
}

function resizeAndSaveAvatar(src) {
  const img = new Image();
  img.onload = async () => {
    const SIZE = 200;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    // Center-crop to square
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    await uploadAvatar(dataUrl);
  };
  img.src = src;
}

async function uploadAvatar(dataUrl) {
  try {
    const res = await fetch(`${API}/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ avatar: dataUrl }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
    const updated = await res.json();
    localStorage.setItem("user", JSON.stringify(updated));
    renderAvatar(updated);
    if (typeof renderNavUser === "function") renderNavUser();
    showNotify("Rasm yangilandi", "success");
  } catch (err) {
    showNotify(err.message, "error");
  }
}

function showNotify(msg, type = "info") {
  if (typeof showToast === "function") showToast(msg, type);
  else alert(msg);
}

// ===== INIT =====
loadProfile();

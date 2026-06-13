const API = window.API_BASE || "/api";
let myPacks = [];
let editingId = null;
let uploadedImgBase64 = null;
let selectedCoverImage = null;
let selectedPackFile = null;

const MAX_PACK_FILE_SIZE = 250 * 1024 * 1024;
const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_COVER_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const ALLOWED_PACK_EXTENSIONS = new Set([
  "zip",
  "rar",
  "7z",
  "cpt",
  "ccproject",
  "aep",
  "aepx",
  "ffx",
  "mogrt",
  "prproj",
  "prfpset",
  "epr",
  "cube",
  "3dl",
  "look",
  "drp",
  "drfx",
  "setting",
  "fcpxml",
  "motn",
  "mp4",
  "mov",
  "webm",
]);

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}
function getToken() {
  return localStorage.getItem("token");
}

const me = getUser();
if (!me) {
  localStorage.setItem("redirect", "/pages/uploader-panel.html");
  window.location.href = "/pages/login.html";
  throw new Error("Login required");
}

function renderUploaderAccessPage(user) {
  document.body.innerHTML = `
    <main class="uploader-access-page">
      <div class="uploader-access-box">
        <a href="/" class="sidebar-logo">EditorPack</a>
        <div class="uploader-access-kicker">Uploader access</div>
        <h1>Uploader bo'lish kerak</h1>
        <p>
          Salom, ${user.name || "user"}. Siz oddiy user sifatida kirgansiz.
          Pack joylash uchun admin bilan bog'lanib, akkauntingizni uploader
          roliga o'tkazishni so'rang.
        </p>
        <div class="uploader-access-actions">
          <a class="btn-save" href="mailto:karimovbdulloh@gmail.com?subject=EditorPack uploader role request">
            Adminga yozish
          </a>
          <a class="btn-cancel" href="/">Saytga qaytish</a>
        </div>
      </div>
    </main>
  `;
}

if (me.role !== "uploader" && me.role !== "admin") {
  renderUploaderAccessPage(me);
  throw new Error("Uploader role required");
}

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

document.getElementById("sidebarUser").innerHTML = `
  <div class="sidebar-avatar">${initials(me.name)}</div>
  <div>
    <div class="sidebar-name">${me.name}</div>
    <div class="sidebar-role">${me.role}</div>
  </div>
`;
document.getElementById("welcomeMsg").textContent =
  `Salom, ${me.name}! Packlaringizni bu yerdan boshqaring.`;

// ===== PAGES =====
function showPage(name, btn) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".sidebar-item")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  if (btn) btn.classList.add("active");
}

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ===== MY PACKS =====
async function fetchMyPacks() {
  try {
    const res = await fetch(`${API}/uploader/packs`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/pages/login.html";
      return;
    }
    if (!res.ok) throw new Error("Packlar yuklanmadi");
    myPacks = await res.json();
    updateStats();
    renderMyPacks();
  } catch (err) {
    document.getElementById("myPacksWrap").innerHTML =
      `<div class="empty-state">Xatolik: ${err.message}</div>`;
  }
}

async function apiError(res, fallback) {
  try {
    const data = await res.json();
    return new Error(data.error || data.detail || fallback);
  } catch {
    return new Error(fallback);
  }
}

function updateStats() {
  document.getElementById("myTotal").textContent = myPacks.length;
  document.getElementById("myLive").textContent = myPacks.filter(
    (p) => p.status === "live",
  ).length;
  document.getElementById("myPending").textContent = myPacks.filter(
    (p) => p.status === "pending",
  ).length;
}

function renderMyPacks() {
  if (!myPacks.length) {
    document.getElementById("myPacksWrap").innerHTML =
      '<div class="empty-state">Hali pack yuklamagansiz. "+ Yangi Pack" tugmasini bosing!</div>';
    return;
  }
  document.getElementById("myPacksWrap").innerHTML = `
    <table>
      <thead><tr>
        <th>Pack</th><th>Narx</th><th>Status</th><th>Sana</th><th>Amallar</th>
      </tr></thead>
      <tbody>
        ${myPacks
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
                  <div class="user-email">${(p.desc || "").slice(0, 50)}${(p.desc || "").length > 50 ? "..." : ""}</div>
                </div>
              </div>
            </td>
            <td style="color:var(--accent)">${p.price || "Free"}</td>
            <td>
              <span class="role-badge status-${p.status}">
                ${p.status === "pending" ? "⏳ Pending" : p.status === "live" ? "✅ Live" : "❌ Rad etilgan"}
              </span>
            </td>
            <td class="joined-date">${formatDate(p.created_at)}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="edit-btn" onclick="openEdit(${p.id})">✏️</button>
                <button class="delete-btn" onclick="deletePack(${p.id})">🗑️</button>
              </div>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

// ===== PRICE INPUT =====
function handlePriceInput(el) {
  const onlyNums = el.value.replace(/[^0-9.]/g, "");
  const prefix = document.getElementById("pricePrefix");

  if (onlyNums && onlyNums !== "0") {
    el.value = onlyNums;
    el.classList.add("has-dollar");
    prefix.style.display = "block";
  } else {
    el.value = onlyNums;
    el.classList.remove("has-dollar");
    prefix.style.display = "none";
  }
  updatePreview();
}

function getPriceValue() {
  const raw = document.getElementById("packPrice").value.trim();
  if (!raw || raw === "0") return "Free";
  return "$" + raw;
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function setPriceField(price) {
  const el = document.getElementById("packPrice");
  const prefix = document.getElementById("pricePrefix");
  if (!price || price === "Free" || price === "$0") {
    el.value = "";
    el.classList.remove("has-dollar");
    prefix.style.display = "none";
  } else {
    const num = price.replace("$", "");
    el.value = num;
    el.classList.add("has-dollar");
    prefix.style.display = "block";
  }
}

// ===== APP PILLS =====
function toggleApp(el) {
  el.classList.toggle("active");
  updatePreview();
}

function getSelectedApps() {
  return [...document.querySelectorAll("#appsCheck .app-pill.active")].map(
    (el) => el.textContent.trim(),
  );
}

function getSelectedTags() {
  return parseList(document.getElementById("packTags").value).map((tag) => tag.toLowerCase());
}

function getImageValue() {
  const url = document.getElementById("packImgUrl").value.trim();
  return url || "";
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function formatFileSize(bytes) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, exp)).toFixed(exp ? 1 : 0)} ${units[exp]}`;
}

function setPackFilePreview(name, size, fromServer = false) {
  document.getElementById("packFileArea").style.display = "none";
  document.getElementById("packFilePreview").style.display = "flex";
  document.getElementById("packFileName").textContent = name || "Pack fayli";
  document.getElementById("packFileMeta").textContent = fromServer
    ? "Oldin yuklangan fayl. Yangisini tanlasangiz almashtiriladi."
    : `${formatFileSize(size)} - yuborishga tayyor`;
}

function handlePackFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const ext = getFileExtension(file.name);
  if (!ALLOWED_PACK_EXTENSIONS.has(ext)) {
    showToast(
      "Bu fayl turi qabul qilinmaydi. Faqat preset/pack yoki video yuklang.",
      "warning",
    );
    input.value = "";
    return;
  }

  if (file.size > MAX_PACK_FILE_SIZE) {
    showToast("Pack fayli 250MB dan katta bo'lmasin!", "warning");
    input.value = "";
    return;
  }

  selectedPackFile = file;
  setPackFilePreview(file.name, file.size);
}

function removePackFile() {
  selectedPackFile = null;
  document.getElementById("packFile").value = "";
  document.getElementById("packFileArea").style.display = "block";
  document.getElementById("packFilePreview").style.display = "none";
  document.getElementById("packFileName").textContent = "";
  document.getElementById("packFileMeta").textContent = "";
}

function handleImgUrlInput() {
  uploadedImgBase64 = null;
  updatePreview();
}

// ===== IMAGE UPLOAD =====
function handleImgUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("Rasm 5MB dan katta bo'lmasin!", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImgBase64 = e.target.result;
    document.getElementById("imgUploadArea").style.display = "none";
    document.getElementById("imgPreviewWrap").style.display = "flex";
    document.getElementById("imgPreviewSmall").src = uploadedImgBase64;
    updatePreview();
  };
  reader.readAsDataURL(file);
}

function removeImg() {
  uploadedImgBase64 = null;
  document.getElementById("packImgUrl").value = "";
  document.getElementById("imgFile").value = "";
  document.getElementById("imgUploadArea").style.display = "block";
  document.getElementById("imgPreviewWrap").style.display = "none";
  updatePreview();
}

// ===== LIVE PREVIEW =====
function updatePreview() {
  const name =
    document.getElementById("packName").value || "Pack nomi bu yerda";
  const desc =
    document.getElementById("packDesc").value ||
    "Pack tavsifi bu yerda ko'rinadi...";
  const priceRaw = document.getElementById("packPrice").value.trim();
  const isFree = !priceRaw || priceRaw === "0";
  const displayPrice = isFree ? "Free" : "$" + priceRaw;
  const badge = document.getElementById("packBadge").value;
  const apps = getSelectedApps();
  const tags = getSelectedTags();

  document.getElementById("previewName").textContent = name;
  document.getElementById("previewDesc").textContent = desc;

  const priceEl = document.getElementById("previewPrice");
  priceEl.textContent = displayPrice;
  priceEl.className = "preview-price" + (isFree ? " free" : "");

  document.getElementById("previewBtn").textContent = isFree
    ? "Download"
    : "Get Pack";

  const badgeEl = document.getElementById("previewBadge");
  if (badge) {
    badgeEl.textContent = badge;
    badgeEl.className = `pack-badge preview-badge badge-${badge}`;
    badgeEl.style.display = "inline-block";
  } else {
    badgeEl.style.display = "none";
  }

  document.getElementById("previewTags").innerHTML = apps
    .concat(tags.map((tag) => `#${tag}`))
    .map((a) => `<span class="preview-tag">${a}</span>`)
    .join("");

  const thumb = document.getElementById("previewThumb");
  const existingImg = thumb.querySelector("img.preview-main-img");
  const imgSource = getImageValue() || uploadedImgBase64;
  if (imgSource) {
    if (existingImg) {
      existingImg.src = imgSource;
    } else {
      const img = document.createElement("img");
      img.className = "preview-main-img";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;position:absolute;inset:0";
      img.src = imgSource;
      thumb.appendChild(img);
    }
    thumb.querySelector(".preview-thumb-placeholder").style.display = "none";
  } else {
    if (existingImg) existingImg.remove();
    thumb.querySelector(".preview-thumb-placeholder").style.display = "block";
  }
}

// ===== RESET FORM =====
function resetForm() {
  editingId = null;
  uploadedImgBase64 = null;
  document.getElementById("packId").value = "";
  document.getElementById("packName").value = "";
  document.getElementById("packDesc").value = "";
  document.getElementById("packBadge").value = "";
  document.getElementById("packTags").value = "";
  document.getElementById("packImgUrl").value = "";
  document.getElementById("imgFile").value = "";
  removePackFile();
  document.getElementById("imgUploadArea").style.display = "block";
  document.getElementById("imgPreviewWrap").style.display = "none";
  document
    .querySelectorAll("#appsCheck .app-pill")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("uploadPageTitle").textContent =
    "📤 Yangi Pack yuklash";
  setPriceField("");
  updatePreview();
}

// ===== OPEN EDIT =====
function openEdit(id) {
  const p = myPacks.find((x) => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById("uploadPageTitle").textContent =
    "✏️ Packni tahrirlash";
  document.getElementById("packId").value = p.id;
  document.getElementById("packName").value = p.name;
  document.getElementById("packDesc").value = p.desc || "";
  document.getElementById("packBadge").value = p.badge || "";
  document.getElementById("packTags").value = parseList(p.tags).join(", ");
  document.getElementById("packImgUrl").value = p.img || "";
  setPriceField(p.price || "");
  selectedPackFile = null;
  document.getElementById("packFile").value = "";
  if (p.file_name || p.download_url) {
    setPackFilePreview(p.file_name || "Pack fayli", p.file_size || 0, true);
  } else {
    removePackFile();
  }

  if (p.img) {
    uploadedImgBase64 = null;
    document.getElementById("imgUploadArea").style.display = "none";
    document.getElementById("imgPreviewWrap").style.display = "flex";
    document.getElementById("imgPreviewSmall").src = p.img;
  } else {
    uploadedImgBase64 = null;
    document.getElementById("imgUploadArea").style.display = "block";
    document.getElementById("imgPreviewWrap").style.display = "none";
  }

  const apps = Array.isArray(p.apps) ? p.apps : JSON.parse(p.apps || "[]");
  document.querySelectorAll("#appsCheck .app-pill").forEach((pill) => {
    pill.classList.toggle("active", apps.includes(pill.textContent.trim()));
  });

  updatePreview();
  showPage("upload", document.querySelectorAll(".sidebar-item")[1]);
}

// ===== SUBMIT PACK =====
async function submitPack() {
  const name = document.getElementById("packName").value.trim();
  const desc = document.getElementById("packDesc").value.trim();
  if (!name || !desc) {
    showToast("Nomi va tavsif majburiy!", "warning");
    return;
  }

  if (!editingId && !selectedPackFile) {
    showToast("Pack fayli yoki video yuklash majburiy!", "warning");
    return;
  }

  const packData = {
    name,
    desc,
    price: getPriceValue(),
    img: getImageValue(),
    badge: document.getElementById("packBadge").value,
    apps: getSelectedApps(),
    tags: getSelectedTags(),
    status: me.role === "admin" ? "live" : "pending",
    uploaded_by: me.id,
    uploader_name: me.name,
    uploader_email: me.email,
  };

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Saqlanmoqda...";

  try {
    const form = new FormData();
    Object.entries(packData).forEach(([key, value]) => {
      form.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
    });
    if (selectedPackFile) form.append("pack_file", selectedPackFile);

    if (editingId) {
      const res = await fetch(`${API}/uploader/packs/${editingId}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + getToken(),
        },
        body: form,
      });
      if (!res.ok) throw await apiError(res, "Saqlanmadi");
      showToast("✅ Saqlandi!", "success");
    } else {
      const res = await fetch(`${API}/uploader/packs`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + getToken(),
        },
        body: form,
      });
      if (!res.ok) throw await apiError(res, "Yuborilmadi");
      showToast(
        me.role === "admin"
          ? "✅ Pack qo'shildi!"
          : "✅ Yuborildi! Admin tekshiradi.",
        "success",
      );
    }

    resetForm();
    showPage("dashboard", document.querySelectorAll(".sidebar-item")[0]);
    await fetchMyPacks();
  } catch (err) {
    showToast("Xatolik: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? "💾 Saqlash" : "📤 Yuborish";
  }
}
// ===== DELETE PACK =====
async function deletePack(id) {
  showConfirm({
    title: "Packni o'chirish",
    message: "Bu packni o'chirsangiz qaytarib bo'lmaydi!",
    confirmText: "O'chirish",
    cancelText: "Bekor",
    type: "danger",
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/uploader/packs/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + getToken() },
        });
        if (!res.ok) throw new Error();
        myPacks = myPacks.filter((x) => x.id !== id);
        updateStats();
        renderMyPacks();
        showToast("Pack o'chirildi.", "success");
      } catch {
        showToast("Xatolik yuz berdi!", "error");
      }
    },
  });
}

// ===== INIT =====
fetchMyPacks();


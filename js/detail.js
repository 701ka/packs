const API = window.API_BASE || "/api";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function getToken() {
  return localStorage.getItem("token");
}

function renderStars(rating, interactive = false, onRate = null) {
  if (interactive) {
    return [1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<span class="star-btn ${i <= rating ? "filled" : ""}" data-v="${i}" onclick="(${onRate})(${i})">${i <= rating ? "★" : "☆"}</span>`,
      )
      .join("");
  }
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "★" : "") + "☆".repeat(empty);
}

function renderNavUser() {
  const user = getUser();
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
        ${user.role === "admin" ? `<a href="/pages/admin-panel.html" class="dropdown-item">Admin Panel</a>` : ""}
        ${user.role === "uploader" || user.role === "admin" ? `<a href="/pages/uploader-panel.html" class="dropdown-item">Uploader Panel</a>` : ""}
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item danger" onclick="logoutUser()">Logout</a>
      </div>`;
  } else {
    navUser.innerHTML = `
      <a href="/pages/login.html" class="nav-btn-outline">Log In</a>
      <a href="/pages/signup.html" class="nav-btn">Sign Up Free</a>`;
  }
}

function toggleDropdown() {
  document.getElementById("navDropdown")?.classList.toggle("show");
}

function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

document.addEventListener("click", (e) => {
  const avatar = document.querySelector(".nav-avatar");
  const dd = document.getElementById("navDropdown");
  if (dd && avatar && !avatar.contains(e.target)) dd.classList.remove("show");
});

// ===== CURRENT PACK =====
let currentPack = null;
let currentReviews = [];
let selectedPayMethod = null;
let myRating = 0;

async function loadDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const mode = params.get("mode"); // "download" mode

  if (!id) {
    window.location.href = "/";
    return;
  }

  // Login tekshirish
  if (!getUser()) {
    localStorage.setItem("redirect", window.location.href);
    window.location.href = "/pages/login.html";
    return;
  }

  try {
    const [packRes, reviewsRes] = await Promise.all([
      fetch(`${API}/packs/${id}`),
      fetch(`${API}/packs/${id}/reviews`),
    ]);
    if (!packRes.ok) throw new Error("Pack topilmadi");
    currentPack = await packRes.json();
    currentReviews = reviewsRes.ok ? await reviewsRes.json() : [];

    if (mode === "download") {
      renderDownloadPage(currentPack);
      return;
    }

    renderDetailPage(currentPack);
    renderReviews(currentReviews);
    loadSimilar(id);
  } catch (err) {
    document.getElementById("detailPage").innerHTML =
      `<div style="text-align:center;padding:80px 20px;color:var(--muted)">${err.message}</div>`;
  }
}

function renderDetailPage(p) {
  const isFree = p.price === "Free" || p.price === "$0" || !p.price;
  const rating = p.avg_rating || 0;
  const reviews = p.review_count || 0;
  const apps = Array.isArray(p.apps) ? p.apps : JSON.parse(p.apps || "[]");
  const params = new URLSearchParams(window.location.search);
  const scannerEffects = params.get("from") === "scanner" ? params.get("effects") || "" : "";
  const scannerBadge = scannerEffects
    ? `<div class="scanner-match-box">
        <div class="scanner-match-title">Scanner tavsiyasi</div>
        <div class="scanner-match-text">Bu pack videongizdagi ${esc(scannerEffects)} effektlariga mos deb topildi.</div>
      </div>`
    : "";

  document.title = esc(p.name) + " - EditorPack";

  const badgeHtml = p.badge
    ? `<span class="detail-badge-tag badge-${esc(p.badge)}">${esc(p.badge)}</span>`
    : "";

  document.getElementById("detailPage").innerHTML = `
    <div class="detail-layout">

      <!-- LEFT -->
      <div class="detail-left">
        <div class="detail-cover">
          ${
            p.img
              ? `<img src="${p.img}" alt="${p.name}">`
              : `<div class="detail-cover-placeholder">PACK</div>`
          }
        </div>

        ${badgeHtml}

        <div class="detail-tags">
          ${apps.map((a) => `<span class="detail-tag">${esc(a)}</span>`).join("")}
        </div>

        <div class="detail-name">${esc(p.name)}</div>
        ${scannerBadge}

        <div class="detail-rating">
          <span class="stars">${rating ? renderStars(rating) : "☆☆☆☆☆"}</span>
          ${rating ? `<span class="rating-num">${rating}</span>` : ""}
          <span class="rating-reviews">${reviews ? `(${reviews} sharh)` : "Hali sharh yo'q"}</span>
        </div>

        <div class="detail-desc">${esc(p.desc) || "Tavsif yo'q."}</div>
      </div>

      <!-- RIGHT -->
      <div class="detail-right">
        <div class="detail-action-card">
          <div class="action-price ${isFree ? "free" : ""}">
            ${isFree ? "Free" : p.price}
          </div>
          <div class="action-price-sub">
            ${isFree ? "Bepul yuklab oling" : "Bir martalik to'lov"}
          </div>

          ${
            isFree
              ? `<button class="action-btn action-btn-primary" onclick="handleFreeDownload()">Yuklab olish</button>`
              : `<button class="action-btn action-btn-primary" onclick="handleBuyPack()">Sotib olish</button>
               <button class="action-btn action-btn-outline" onclick="handleFreePreview()">Bepul ko'rish</button>`
          }

          <div class="action-divider"></div>

          <div class="action-features">
            <div class="action-feature">
              <span class="action-feature-icon">OK</span>
              <span>Bir marta sotib ol, umr bo'yi ishla</span>
            </div>
            <div class="action-feature">
              <span class="action-feature-icon">UP</span>
              <span>Yangilanishlar bepul</span>
            </div>
            <div class="action-feature">
              <span class="action-feature-icon">SUP</span>
              <span>Qo'llab-quvvatlash mavjud</span>
            </div>
            ${
              apps.length
                ? `<div class="action-feature">
              <span class="action-feature-icon">APP</span>
              <span>${apps.join(", ")} uchun mos</span>
            </div>`
                : ""
            }
          </div>
        </div>
      </div>

    </div>

    <!-- REVIEWS -->
    <div class="reviews-section" id="reviewsSection"></div>

    <!-- SIMILAR -->
    <div class="similar-section" id="similarSection"></div>
  `;
}

// ===== DOWNLOAD PAGE =====
function renderDownloadPage(p) {
  document.title = "Yuklab olish - " + p.name;
  document.getElementById("detailPage").innerHTML = `
    <div class="download-page">
      <div class="download-icon">OK</div>
      <div class="download-title">Tayyor! Yuklab oling</div>
      <div class="download-sub">
        Pack muvaffaqiyatli ochildi. Quyidagi tugma orqali yuklab oling.
      </div>
      <div class="download-card">
        <div class="download-pack-name">${p.name}</div>
        <div class="download-pack-desc">${p.desc || ""}</div>
        <button class="download-btn-big" onclick="downloadCurrentPack()">Yuklab olish</button>
      </div>
      <button class="download-back" onclick="history.back()">&larr; Orqaga qaytish</button>
    </div>
  `;
}

async function downloadCurrentPack() {
  if (!currentPack) return;
  try {
    const res = await fetch(`${API}/packs/${currentPack.id}/download`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (!res.ok) {
      let msg = "Yuklab bo'lmadi";
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const fileName =
      disposition.match(/filename="([^"]+)"/)?.[1] ||
      currentPack.file_name ||
      `${currentPack.name || "pack"}.zip`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showInfo({
      title: "Yuklab bo'lmadi",
      message: err.message,
      btnText: "OK",
    });
  }
}

// ===== REVIEWS =====
function renderReviews(reviews) {
  const section = document.getElementById("reviewsSection");
  if (!section) return;
  const user = getUser();
  const myReview = reviews.find((r) => r.user_id === user?.id);
  if (myReview) myRating = myReview.rating;

  const starsHtml = (r) =>
    "★".repeat(r) + "☆".repeat(5 - r);

  const reviewCards = reviews
    .map(
      (r) => `
    <div class="review-card" data-id="${r.id}">
      <div class="review-top">
        <div class="review-avatar">${esc(r.user_name?.[0]?.toUpperCase() || "?")}</div>
        <div class="review-meta">
          <div class="review-name">${esc(r.user_name || "Foydalanuvchi")}</div>
          <div class="review-stars">${starsHtml(r.rating)}</div>
        </div>
        ${user && (user.id === r.user_id || user.role === "admin") ? `<button class="review-delete" onclick="deleteReview(${Number(r.id)})">✕</button>` : ""}
      </div>
      ${r.comment ? `<div class="review-comment">${esc(r.comment)}</div>` : ""}
    </div>`,
    )
    .join("");

  const writeForm = user
    ? `<div class="review-form">
        <div class="review-form-title">${myReview ? "Sharhingizni tahrirlash" : "Sharh yozish"}</div>
        <div class="review-stars-pick" id="starPicker">
          ${[1, 2, 3, 4, 5].map((i) => `<span class="star-pick ${i <= myRating ? "on" : ""}" onclick="setMyRating(${i})">${i <= myRating ? "★" : "☆"}</span>`).join("")}
        </div>
        <textarea id="reviewComment" class="review-textarea" placeholder="Fikringizni yozing (ixtiyoriy)..." maxlength="500">${myReview?.comment || ""}</textarea>
        <button class="review-submit-btn" onclick="submitReview()">Yuborish</button>
      </div>`
    : `<div class="review-login-hint"><a href="/pages/login.html">Kirish</a> qilib sharh yozing</div>`;

  section.innerHTML = `
    <div class="reviews-title">Sharhlar ${reviews.length ? `(${reviews.length})` : ""}</div>
    ${writeForm}
    <div id="reviewCards">${reviewCards || '<div class="reviews-empty">Hali sharh yo\'q. Birinchi bo\'ling!</div>'}</div>
  `;
}

function setMyRating(val) {
  myRating = val;
  document.querySelectorAll(".star-pick").forEach((s, i) => {
    s.textContent = i < val ? "★" : "☆";
    s.classList.toggle("on", i < val);
  });
}

async function submitReview() {
  if (!myRating) return notify("Avval yulduzcha tanlang", "warn");
  const comment = document.getElementById("reviewComment")?.value.trim() || "";
  try {
    const res = await fetch(`${API}/packs/${currentPack.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ rating: myRating, comment }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
    currentReviews = await (await fetch(`${API}/packs/${currentPack.id}/reviews`)).json();
    // Refresh pack to update avg_rating
    const p = await (await fetch(`${API}/packs/${currentPack.id}`)).json();
    document.querySelector(".detail-rating").innerHTML = `
      <span class="stars">${p.avg_rating ? "★".repeat(Math.round(p.avg_rating)) + "☆".repeat(5 - Math.round(p.avg_rating)) : "☆☆☆☆☆"}</span>
      ${p.avg_rating ? `<span class="rating-num">${p.avg_rating}</span>` : ""}
      <span class="rating-reviews">${p.review_count ? `(${p.review_count} sharh)` : "Hali sharh yo'q"}</span>`;
    renderReviews(currentReviews);
    notify("Sharh qabul qilindi", "success");
  } catch (err) {
    notify(err.message, "error");
  }
}

async function deleteReview(id) {
  try {
    const res = await fetch(`${API}/reviews/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
    currentReviews = currentReviews.filter((r) => r.id !== id);
    renderReviews(currentReviews);
  } catch (err) {
    notify(err.message, "error");
  }
}

function notify(msg, type = "info") {
  if (typeof showToast === "function") showToast(msg, type);
  else alert(msg);
}

// ===== SIMILAR PACKS =====
async function loadSimilar(currentId) {
  try {
    const res = await fetch(`${API}/packs`);
    const all = await res.json();
    const similar = all.filter((x) => x.id !== Number(currentId)).slice(0, 4);

    const section = document.getElementById("similarSection");
    if (!section || !similar.length) return;

    section.innerHTML = `
      <div class="similar-title">O'xshash packlar</div>
      <div class="similar-grid">
        ${similar
          .map((s) => {
            const sFree = s.price === "Free" || s.price === "$0" || !s.price;
            return `
            <div class="similar-card" onclick="window.location.href='/pages/detail.html?id=${s.id}'">
              ${
                s.img
                  ? `<img class="similar-img" src="${s.img}" alt="${s.name}">`
                  : `<div class="similar-img-placeholder">PACK</div>`
              }
              <div class="similar-info">
                <div class="similar-name">${esc(s.name)}</div>
                <div class="similar-price ${sFree ? "free" : ""}">${sFree ? "Free" : esc(s.price)}</div>
              </div>
            </div>`;
          })
          .join("")}
      </div>`;
  } catch {}
}

// ===== FREE DOWNLOAD =====
function handleFreeDownload() {
  if (!currentPack) return;
  if (!currentPack.has_download) {
    showInfo({
      title: "Fayl yo'q",
      message: "Bu pack uchun hali fayl yuklanmagan.",
      btnText: "OK",
    });
    return;
  }
  // Download sahifasiga o'tish
  window.location.href = `/pages/detail.html?id=${currentPack.id}&mode=download`;
}

// ===== FREE PREVIEW (pullik pack uchun) =====
function handleFreePreview() {
  showInfo({
    title: "Bepul ko'rish",
    message:
      "Trial versiyasi hozircha mavjud emas. To'liq versiyani sotib oling.",
    btnText: "OK",
  });
}

// ===== PAYMENT =====
function handleBuyPack() {
  if (!currentPack) return;
  document.getElementById("paymentPackName").textContent = currentPack.name;
  document.getElementById("paymentAmount").textContent = currentPack.price;
  selectedPayMethod = null;
  document
    .querySelectorAll(".pay-method-btn")
    .forEach((b) => b.classList.remove("selected"));
  document.getElementById("cardForm").style.display = "none";
  document.getElementById("paymentNote").style.display = "none";
  document.getElementById("payBtn").style.display = "none";
  document.getElementById("paymentOverlay").classList.add("show");
}

function closePayment() {
  document.getElementById("paymentOverlay").classList.remove("show");
}

document.getElementById("paymentOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "paymentOverlay") closePayment();
});

function selectPayMethod(btn, method) {
  selectedPayMethod = method;
  document
    .querySelectorAll(".pay-method-btn")
    .forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");

  const cardForm = document.getElementById("cardForm");
  const note = document.getElementById("paymentNote");
  const payBtn = document.getElementById("payBtn");

  if (method === "card") {
    cardForm.style.display = "flex";
    note.style.display = "none";
  } else {
    cardForm.style.display = "none";
    const msgs = {
      click:
        "Click ilovasi orqali to'lov amalga oshiriladi. Davom etish uchun tugmani bosing.",
      payme:
        "Payme ilovasi orqali to'lov amalga oshiriladi. Davom etish uchun tugmani bosing.",
      uzum: "Uzum Bank ilovasi orqali to'lov amalga oshiriladi. Davom etish uchun tugmani bosing.",
    };
    note.textContent = msgs[method] || "";
    note.style.display = "block";
  }

  payBtn.style.display = "block";
}

function formatCard(el) {
  let val = el.value.replace(/\D/g, "").slice(0, 16);
  el.value = val.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(el) {
  let val = el.value.replace(/\D/g, "").slice(0, 4);
  if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2);
  el.value = val;
}

function processPayment() {
  closePayment();
  // Demo: to'lov muvaffaqiyatli bo'lgandek ko'rsatish
  setTimeout(() => {
    showInfo({
      title: "To'lov muvaffaqiyatli!",
      message: "To'lovingiz qabul qilindi. Pack yuklab olinmoqda...",
      btnText: "Yuklab olish",
    });
  }, 300);
}

// ===== INIT =====
renderNavUser();
loadDetail();


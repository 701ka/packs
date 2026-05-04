/* ===========================
   EditorPack — app.js
   localStorage version
   =========================== */

const GRAD_PAIRS = [
  ["#7c3aed", "#0ea5e9"],
  ["#db2777", "#7c3aed"],
  ["#0ea5e9", "#10b981"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
];

function packThumb(p) {
  if (p.img)
    return `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
  const col = GRAD_PAIRS[p.id % GRAD_PAIRS.length];
  return `<div style="width:100%;height:100%;background:linear-gradient(135deg,${col[0]},${col[1]});display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${p.name[0]}</div>`;
}

function isFree(p) {
  return !p.price || p.price === "Free" || p.price === "$0";
}

let currentFilter = "All";
let currentSearch = "";

function loadPacks() {
  let packs = EP.getLivePacks();

  if (currentFilter === "Free") packs = packs.filter((p) => isFree(p));
  else if (currentFilter !== "All")
    packs = packs.filter((p) => (p.apps || []).includes(currentFilter));

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    packs = packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.desc || "").toLowerCase().includes(q),
    );
  }

  renderPackGrid(packs);
  updateCategoryCounts();
}

function renderPackGrid(packs) {
  const grid = document.getElementById("packGrid");
  if (!grid) return;

  if (!packs.length) {
    grid.innerHTML =
      '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">Pack topilmadi.</p>';
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
          ${(p.apps || []).map((a) => `<span class="app-tag">${a}</span>`).join("")}
        </div>
        <div class="pack-name">${p.name}</div>
        <div class="pack-desc">${p.desc}</div>
        <div class="pack-footer">
          <span class="pack-price ${isFree(p) ? "free" : ""}">
            ${isFree(p) ? "Free" : p.price}
          </span>
          <button class="pack-dl-btn">${isFree(p) ? "Download" : "Get Pack"}</button>
        </div>
      </div>
    </div>`,
    )
    .join("");
}

function openDetail(id) {
  const user = EP.getUser();
  if (!user) {
    localStorage.setItem("ep_redirect", `/pages/detail.html?id=${id}`);
    window.location.href = "/pages/login.html";
    return;
  }
  window.location.href = `/pages/detail.html?id=${id}`;
}

function setFilter(f, btn) {
  currentFilter = f;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // URL filter bo'lsa scroll
  const grid = document.getElementById("packGrid");
  if (grid) grid.scrollIntoView({ behavior: "smooth" });

  loadPacks();
}

function filterPacks(q) {
  currentSearch = q;
  loadPacks();
}

function updateCategoryCounts() {
  const packs = EP.getLivePacks();
  const apps = ["CapCut", "After Effects", "Premiere", "DaVinci", "Final Cut"];
  apps.forEach((app) => {
    const el = document.getElementById(`count-${app}`);
    if (el)
      el.textContent =
        packs.filter((p) => (p.apps || []).includes(app)).length + " packs";
  });
  const freeEl = document.getElementById("count-Free");
  if (freeEl)
    freeEl.textContent = packs.filter((p) => isFree(p)).length + " packs";
}

function loadTrending() {
  const grid = document.getElementById("trendingGrid");
  if (!grid) return;
  const packs = EP.getLivePacks()
    .filter((p) => p.badge === "hot" || p.badge === "new")
    .slice(0, 4);
  const show = packs.length ? packs : EP.getLivePacks().slice(0, 4);

  grid.innerHTML = show
    .map(
      (p) => `
    <div class="pack-card" onclick="openDetail(${p.id})">
      <div class="pack-thumb">
        ${packThumb(p)}
        ${p.badge ? `<span class="pack-badge badge-${p.badge}">${p.badge}</span>` : ""}
      </div>
      <div class="pack-info">
        <div class="pack-app-tags">
          ${(p.apps || []).map((a) => `<span class="app-tag">${a}</span>`).join("")}
        </div>
        <div class="pack-name">${p.name}</div>
        <div class="pack-desc">${p.desc}</div>
        <div class="pack-footer">
          <span class="pack-price ${isFree(p) ? "free" : ""}">${isFree(p) ? "Free" : p.price}</span>
          <button class="pack-dl-btn">${isFree(p) ? "Download" : "Get Pack"}</button>
        </div>
      </div>
    </div>`,
    )
    .join("");
}

function loadStats() {
  const packs = EP.getLivePacks();
  const totalEl = document.getElementById("statTotal");
  const freeEl = document.getElementById("statFree");
  if (totalEl) totalEl.textContent = packs.length + "+";
  if (freeEl) freeEl.textContent = packs.filter((p) => isFree(p)).length + "+";
}

// URL dan filter olish
const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get("filter");
if (urlFilter) currentFilter = urlFilter;

loadStats();
loadTrending();
loadPacks();
renderNavUser();

const API = window.API_BASE || "/api";

const GRAD_PAIRS = [
  ["#7c3aed", "#0ea5e9"],
  ["#db2777", "#7c3aed"],
  ["#0ea5e9", "#10b981"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
];

let allPacks = [];
let currentFilter = "All";
let currentSearch = "";

function parseApps(apps) {
  return Array.isArray(apps) ? apps : JSON.parse(apps || "[]");
}

function packThumb(p) {
  if (p.img)
    return `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`;
  const col = GRAD_PAIRS[p.id % GRAD_PAIRS.length];
  return `<div style="width:100%;height:100%;background:linear-gradient(135deg,${col[0]},${col[1]});display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${p.name[0]}</div>`;
}

function isFree(p) {
  return !p.price || p.price === "Free" || p.price === "$0";
}

function loadPacks() {
  let packs = [...allPacks];

  if (currentFilter === "Free") packs = packs.filter((p) => isFree(p));
  else if (currentFilter !== "All")
    packs = packs.filter((p) => parseApps(p.apps).includes(currentFilter));

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
          ${parseApps(p.apps).map((a) => `<span class="app-tag">${a}</span>`).join("")}
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
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) {
    localStorage.setItem("redirect", `/pages/detail.html?id=${id}`);
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

  const grid = document.getElementById("packGrid");
  if (grid) grid.scrollIntoView({ behavior: "smooth" });

  loadPacks();
}

function filterPacks(q) {
  currentSearch = q;
  loadPacks();
}

function updateCategoryCounts() {
  const apps = ["CapCut", "After Effects", "Premiere", "DaVinci", "Final Cut"];
  apps.forEach((app) => {
    const el = document.getElementById(`count-${app}`);
    if (el)
      el.textContent =
        allPacks.filter((p) => parseApps(p.apps).includes(app)).length +
        " packs";
  });
  const freeEl = document.getElementById("count-Free");
  if (freeEl)
    freeEl.textContent = allPacks.filter((p) => isFree(p)).length + " packs";
}

function loadTrending() {
  const grid = document.getElementById("trendingGrid");
  if (!grid) return;
  const packs = allPacks
    .filter((p) => p.badge === "hot" || p.badge === "new")
    .slice(0, 4);
  const show = packs.length ? packs : allPacks.slice(0, 4);

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
          ${parseApps(p.apps).map((a) => `<span class="app-tag">${a}</span>`).join("")}
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
  const totalEl = document.getElementById("statTotal");
  const freeEl = document.getElementById("statFree");
  if (totalEl) totalEl.textContent = allPacks.length + "+";
  if (freeEl)
    freeEl.textContent = allPacks.filter((p) => isFree(p)).length + "+";
}

const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get("filter");
if (urlFilter) currentFilter = urlFilter;

async function initPacksPage() {
  try {
    const res = await fetch(`${API}/packs`);
    if (!res.ok) throw new Error("Packlar yuklanmadi");
    allPacks = await res.json();
  } catch (err) {
    console.error(err);
    allPacks = [];
  }
  loadStats();
  loadTrending();
  loadPacks();
  renderNavUser();
}

initPacksPage();

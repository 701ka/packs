function showToast(msg, type = "success") {
  const existing = document.querySelector(".ep-toast");
  if (existing) existing.remove();

  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const colors = {
    success: "#4ade80",
    error: "#ef4444",
    info: "#38bdf8",
    warning: "#fb923c",
  };

  const toast = document.createElement("div");
  toast.className = "ep-toast";
  toast.innerHTML = `
    <span class="ep-toast-icon">${icons[type] || icons.success}</span>
    <span class="ep-toast-msg">${msg}</span>
    <button class="ep-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  toast.style.setProperty("--toast-color", colors[type] || colors.success);
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showConfirm({
  title,
  message,
  confirmText = "Tasdiqlash",
  cancelText = "Bekor",
  type = "danger",
  onConfirm,
}) {
  const existing = document.querySelector(".ep-confirm-overlay");
  if (existing) existing.remove();

  const icons = { danger: "🗑️", warning: "⚠️", info: "ℹ️" };
  const colors = { danger: "#ef4444", warning: "#fb923c", info: "#38bdf8" };

  const overlay = document.createElement("div");
  overlay.className = "ep-confirm-overlay";
  overlay.innerHTML = `
    <div class="ep-confirm-box">
      <div class="ep-confirm-icon" style="color:${colors[type]}">${icons[type]}</div>
      <div class="ep-confirm-title">${title}</div>
      <div class="ep-confirm-msg">${message}</div>
      <div class="ep-confirm-actions">
        <button class="ep-confirm-cancel">${cancelText}</button>
        <button class="ep-confirm-ok" style="background:${colors[type]}">${confirmText}</button>
      </div>
    </div>
  `;

  overlay.querySelector(".ep-confirm-cancel").onclick = () => overlay.remove();
  overlay.querySelector(".ep-confirm-ok").onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add("show"), 10);
}

function showInfo({ title, message, btnText = "OK" }) {
  const existing = document.querySelector(".ep-confirm-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "ep-confirm-overlay";
  overlay.innerHTML = `
    <div class="ep-confirm-box">
      <div class="ep-confirm-icon">ℹ️</div>
      <div class="ep-confirm-title">${title}</div>
      <div class="ep-confirm-msg">${message}</div>
      <div class="ep-confirm-actions">
        <button class="ep-confirm-ok" style="background:var(--accent)">${btnText}</button>
      </div>
    </div>
  `;

  overlay.querySelector(".ep-confirm-ok").onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add("show"), 10);
}

["ep_packs", "ep_users", "ep_user", "ep_redirect", "ep_subscribers"].forEach(
  (key) => localStorage.removeItem(key),
);

function getStoredUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function getStoredToken() {
  return localStorage.getItem("token");
}

function epLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

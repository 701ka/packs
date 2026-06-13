const API = window.API_BASE || "/api";

async function login(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error");
  errorEl.style.display = "none";

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    const redirect = localStorage.getItem("redirect");
    if (redirect) {
      localStorage.removeItem("redirect");
      window.location.href = redirect;
    } else {
      window.location.href = "/";
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
}

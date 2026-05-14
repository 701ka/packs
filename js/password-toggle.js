const eyeOpenIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

const eyeClosedIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18"></path>
    <path d="M10.6 10.6A2.9 2.9 0 0 0 12 15a3 3 0 0 0 2.4-1.2"></path>
    <path d="M9.4 5.4A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1"></path>
    <path d="M6.5 6.8C3.6 8.7 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.1-.8"></path>
  </svg>
`;

function togglePassword(button, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  button.innerHTML = isHidden ? eyeClosedIcon : eyeOpenIcon;
  button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.innerHTML = eyeOpenIcon;
  });
});

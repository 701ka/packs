function togglePassword(button, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  button.textContent = isHidden ? "hide" : "eye";
  button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
}

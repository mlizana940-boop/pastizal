import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const submitButton = form.querySelector("button[type=submit]");

if (!firebaseConfigReady) {
  message.textContent = "Configura la aplicación web de Firebase antes de iniciar sesión.";
  message.classList.add("notice-error");
  submitButton.disabled = true;
} else {
  const auth = getAuth(initializeApp(firebaseConfig));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Validando acceso…";
    message.className = "notice";
    submitButton.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
      window.location.assign("/admin/");
    } catch (error) {
      message.textContent = error.code === "auth/invalid-credential"
        ? "Correo o contraseña incorrectos."
        : "No se pudo iniciar sesión. Revisa los datos e inténtalo nuevamente.";
      message.classList.add("notice-error");
      submitButton.disabled = false;
    }
  });
}
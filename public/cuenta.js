import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const form = document.querySelector("#account-form");
const message = document.querySelector("#account-message");
const submitButton = document.querySelector("#account-submit");
const emailInput = document.querySelector("#account-email");
const passwordInput = document.querySelector("#account-password");
const passwordConfirmInput = document.querySelector("#account-password-confirm");
const passwordConfirmLabel = document.querySelector("#password-confirm-label");
const passwordHint = document.querySelector("#password-hint");
const loginModeButton = document.querySelector("#login-mode");
const registerModeButton = document.querySelector("#register-mode");
const accountMode = document.querySelector("#account-mode");
const signedInView = document.querySelector("#signed-in-view");
const accountUserEmail = document.querySelector("#account-user-email");
const logoutButton = document.querySelector("#account-logout");
const accountDescription = document.querySelector("#account-description");
const params = new URLSearchParams(window.location.search);
const requestedNext = params.get("next");

function getSafeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/cliente/";
  }
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return "/cliente/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/cliente/";
  }
}

const nextPath = getSafeNext(requestedNext);
const isAdminDestination = nextPath === "/admin" || nextPath.startsWith("/admin/");
let isRegisterMode = params.get("modo") === "registro";
let authFlowInProgress = false;
let lastCheckedUserUid = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "notice notice-error" : "notice";
}

function setMode(register) {
  isRegisterMode = register;
  passwordInput.autocomplete = register ? "new-password" : "current-password";
  passwordHint.hidden = !register;
  passwordConfirmLabel.hidden = !register;
  passwordConfirmInput.hidden = !register;
  passwordConfirmInput.required = register;
  passwordConfirmInput.value = "";
  passwordConfirmInput.setCustomValidity("");
  document.querySelector("#account-heading").textContent = register ? "Crea tu cuenta" : "Inicia sesión";
  document.querySelector("#account-description").textContent = register
    ? "Regístrate para solicitar una reserva. También puedes usar esta cuenta para iniciar sesión."
    : "Ingresa a tu cuenta para solicitar una reserva o acceder al panel si eres administrador.";
  submitButton.textContent = register ? "Crear cuenta" : "Iniciar sesión";
  loginModeButton.classList.toggle("is-active", !register);
  registerModeButton.classList.toggle("is-active", register);
  loginModeButton.setAttribute("aria-pressed", String(!register));
  registerModeButton.setAttribute("aria-pressed", String(register));
  showMessage("");
}

function validatePasswordConfirmation() {
  if (!isRegisterMode || !passwordConfirmInput.value) {
    passwordConfirmInput.setCustomValidity("");
    return;
  }
  passwordConfirmInput.setCustomValidity(
    passwordConfirmInput.value === passwordInput.value ? "" : "Las contraseñas no coinciden."
  );
}

function showAccountState(user) {
  const isSignedIn = Boolean(user);
  accountMode.hidden = isSignedIn;
  form.hidden = isSignedIn;
  signedInView.hidden = !isSignedIn;

  if (isSignedIn) {
    document.querySelector("#account-heading").textContent = "Mi cuenta";
    accountDescription.textContent = "Tu sesión está activa. Desde aquí puedes revisar tus solicitudes, volver a explorar las cabañas o cerrar sesión.";
    accountUserEmail.textContent = user.email || "Cuenta de usuario";
    return;
  }

  accountDescription.textContent = isRegisterMode
    ? "Regístrate para solicitar una reserva. También puedes usar esta cuenta para iniciar sesión."
    : "Ingresa a tu cuenta para solicitar una reserva o acceder al panel si eres administrador.";
  document.querySelector("#account-heading").textContent = isRegisterMode ? "Crea tu cuenta" : "Inicia sesión";
}

async function continueAfterAuthentication(user) {
  if (isAdminDestination) {
    showMessage("Comprobando acceso de administrador…");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 403) {
        if (authFlowInProgress) {
          // A valid customer account submitted the shared sign-in form. Let
          // them continue to reservations instead of treating it as a login error.
          window.location.replace("/cliente/");
          return;
        }

        // An already signed-in customer chose the admin link. Keep them on
        // the admin entry page and let them sign in with a different account.
        showAccountState(null);
        document.querySelector("#account-heading").textContent = "Acceso administrador";
        accountDescription.textContent = "La sesión actual es de cliente. Ingresa con una cuenta administradora para abrir el panel.";
        showMessage("La cuenta con sesión activa no tiene acceso al panel. Puedes iniciar sesión con otra cuenta.", true);
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        showMessage(result.error || "No se pudo validar el acceso al panel.", true);
        return;
      }
    } catch {
      showMessage("No se pudo validar el acceso al panel. Inténtalo nuevamente.", true);
      return;
    }
  }
  window.location.replace(nextPath);
}

function authErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
    "auth/invalid-email": "Ingresa un correo electrónico válido.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/invalid-login-credentials": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-disabled": "Esta cuenta está deshabilitada. Contacta al administrador.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/operation-not-allowed": "El registro con correo y contraseña no está habilitado.",
    "auth/too-many-requests": "Hubo demasiados intentos. Espera un momento e inténtalo otra vez."
  };
  return messages[error.code] || "No se pudo completar el acceso. Revisa los datos e inténtalo nuevamente.";
}

loginModeButton.addEventListener("click", () => setMode(false));
registerModeButton.addEventListener("click", () => setMode(true));
emailInput.addEventListener("blur", () => { emailInput.value = emailInput.value.trim(); });
passwordConfirmInput.addEventListener("input", validatePasswordConfirmation);
passwordInput.addEventListener("input", validatePasswordConfirmation);

if (!firebaseConfigReady) {
  showMessage("La aplicación de Firebase no está configurada.", true);
  form.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
} else {
  const auth = getAuth(initializeApp(firebaseConfig));

  onAuthStateChanged(auth, (user) => {
    if (!authFlowInProgress) showAccountState(user);

    // Keep a signed-in customer on Mi Cuenta. Only the admin entry point
    // should automatically continue from an existing session.
    if (user && !authFlowInProgress && isAdminDestination && lastCheckedUserUid !== user.uid) {
      lastCheckedUserUid = user.uid;
      void continueAfterAuthentication(user);
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await signOut(auth);
      window.location.replace("/cliente/");
    } catch {
      showMessage("No se pudo cerrar la sesión. Inténtalo nuevamente.", true);
      logoutButton.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    validatePasswordConfirmation();
    if (!form.reportValidity()) return;
    authFlowInProgress = true;
    submitButton.disabled = true;
    showMessage(isRegisterMode ? "Creando tu cuenta…" : "Iniciando sesión…");

    try {
      const email = emailInput.value.trim();
      let user;
      if (isRegisterMode) {
        const credential = await createUserWithEmailAndPassword(auth, email, passwordInput.value);
        user = credential.user;
        await signOut(auth);
        lastCheckedUserUid = null;
        setMode(false);
        emailInput.value = email;
        passwordInput.value = "";
        showMessage("Cuenta creada. Ahora inicia sesión para continuar con tu reserva.");
        return;
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, passwordInput.value);
        user = credential.user;
      }
      lastCheckedUserUid = user.uid;
      await continueAfterAuthentication(user);
    } catch (error) {
      showMessage(authErrorMessage(error), true);
    } finally {
      authFlowInProgress = false;
      submitButton.disabled = false;
    }
  });
}

setMode(isRegisterMode);

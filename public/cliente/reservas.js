import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const message = document.querySelector("#reservations-message");
const reservationsList = document.querySelector("#reservations-list");
const loadMoreButton = document.querySelector("#load-more-reservations");
const adminPanelLink = document.querySelector("#admin-panel-link");
const statusLabels = {
  pendiente: "Pendiente de revisión",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  cancelada: "Cancelada"
};
let currentUser = null;
let nextCursor = null;
let isLoading = false;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "notice notice-error" : "notice";
}

function detail(label, value) {
  const item = document.createElement("div");
  item.className = "reservation-detail";
  const name = document.createElement("span");
  name.className = "muted";
  name.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value || "—";
  item.append(name, content);
  return item;
}

function formatDate(value, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {})
  }).format(date);
}

function renderReservation(reservation) {
  const card = document.createElement("article");
  card.className = "reservation-card";
  const heading = document.createElement("div");
  heading.className = "reservation-card-heading";
  const title = document.createElement("h2");
  title.textContent = reservation.cabanaNombre || "Cabaña";
  const status = document.createElement("span");
  status.className = `reservation-status status-${reservation.estado}`;
  status.textContent = statusLabels[reservation.estado] || reservation.estado || "Estado desconocido";
  heading.append(title, status);

  const details = document.createElement("div");
  details.className = "reservation-details";
  details.append(
    detail("Entrada", formatDate(`${reservation.fechaEntrada}T12:00:00`)),
    detail("Salida", formatDate(`${reservation.fechaSalida}T12:00:00`)),
    detail("Correo de la reserva", reservation.cliente?.email),
    detail("Teléfono de contacto", reservation.cliente?.telefono),
    detail("Huéspedes", String(reservation.huespedes ?? "—")),
    detail("Noches", String(reservation.cantidadNoches ?? "—")),
    detail("Precio por noche", `$${Number(reservation.precioPorNoche || 0).toLocaleString("es-CL")} CLP`),
    detail("Total estimado", `$${Number(reservation.totalEstimado || 0).toLocaleString("es-CL")} CLP`),
    detail("Solicitud enviada", formatDate(reservation.createdAt, true))
  );
  card.append(heading, details);
  return card;
}

async function revealAdminPanelLink(user) {
  adminPanelLink.hidden = true;
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/admin/session", {
      headers: { Authorization: `Bearer ${token}` }
    });
    adminPanelLink.hidden = !response.ok;
  } catch {
    adminPanelLink.hidden = true;
  }
}

async function loadReservations() {
  if (!currentUser || isLoading) return;
  isLoading = true;
  loadMoreButton.disabled = true;
  showMessage("Cargando tus reservas…");
  try {
    const params = new URLSearchParams();
    if (nextCursor) params.set("cursor", nextCursor);
    const query = params.toString();
    const token = await currentUser.getIdToken();
    const response = await fetch(`/api/mis-reservas${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.replace("/cuenta.html?next=%2Fcliente%2Freservas.html");
      return;
    }
    if (!response.ok) throw new Error(result.error || "No se pudieron cargar tus reservas.");

    const items = Array.isArray(result.data) ? result.data : [];
    if (!nextCursor && items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Todavía no has enviado solicitudes de reserva.";
      reservationsList.replaceChildren(empty);
    } else {
      reservationsList.append(...items.map(renderReservation));
    }

    nextCursor = result.nextCursor || null;
    loadMoreButton.hidden = !nextCursor;
    showMessage(items.length ? "Aquí puedes revisar el estado de tus solicitudes." : "");
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    isLoading = false;
    loadMoreButton.disabled = false;
  }
}

loadMoreButton.addEventListener("click", loadReservations);

if (!firebaseConfigReady) {
  showMessage("La aplicación de Firebase no está configurada.", true);
} else {
  const auth = getAuth(initializeApp(firebaseConfig));
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
      window.location.replace("/cuenta.html?next=%2Fcliente%2Freservas.html");
      return;
    }
    void revealAdminPanelLink(user);
    void loadReservations();
  });
}

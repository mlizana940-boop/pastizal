import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const searchForm = document.querySelector("#search-form");
const cabinsList = document.querySelector("#cabins-list");
const pageMessage = document.querySelector("#page-message");
const bookingPanel = document.querySelector("#booking-panel");
const bookingForm = document.querySelector("#booking-form");
const bookingMessage = document.querySelector("#booking-message");
const draftKey = "cabanas.reservaPendiente";
let auth = null;
let currentUser = null;
let cabins = [];

function showMessage(target, text, isError = false) {
  target.textContent = text;
  target.className = isError ? "notice notice-error" : "notice";
}

function todayInChile() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToDateKey(value, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function syncDateConstraints(entryInput, exitInput, optionalPair = false) {
  const today = todayInChile();
  const entry = entryInput.value;
  const exit = exitInput.value;
  entryInput.min = today;
  exitInput.min = entry ? addDaysToDateKey(entry, 1) : today;
  exitInput.max = entry ? addDaysToDateKey(entry, 30) : "";

  let entryError = entry && entry < today ? "La entrada no puede ser anterior a hoy." : "";
  let exitError = "";
  if (optionalPair && Boolean(entry) !== Boolean(exit)) {
    if (entry) exitError = "Indica la fecha de salida.";
    else entryError = "Indica la fecha de entrada.";
  } else if (entry && exit && exit <= entry) {
    exitError = "La salida debe ser posterior a la entrada.";
  } else if (entry && exit && exit > addDaysToDateKey(entry, 30)) {
    exitError = "La estadía no puede superar 30 noches.";
  } else if (exit && exit < today) {
    exitError = "La salida no puede ser anterior a hoy.";
  }

  entryInput.setCustomValidity(entryError);
  exitInput.setCustomValidity(exitError);
}

const searchEntryInput = document.querySelector("#search-entry");
const searchExitInput = document.querySelector("#search-exit");
const bookingEntryInput = document.querySelector("#booking-entry");
const bookingExitInput = document.querySelector("#booking-exit");
searchEntryInput.addEventListener("input", () => syncDateConstraints(searchEntryInput, searchExitInput, true));
searchExitInput.addEventListener("input", () => syncDateConstraints(searchEntryInput, searchExitInput, true));
bookingEntryInput.addEventListener("input", () => syncDateConstraints(bookingEntryInput, bookingExitInput));
bookingExitInput.addEventListener("input", () => syncDateConstraints(bookingEntryInput, bookingExitInput));
syncDateConstraints(searchEntryInput, searchExitInput, true);
syncDateConstraints(bookingEntryInput, bookingExitInput);

const bookingNameInput = document.querySelector("#booking-name");
const bookingPhoneInput = document.querySelector("#booking-phone");
const bookingGuestsInput = document.querySelector("#booking-guests");
const bookingGuestsHint = document.querySelector("#booking-guests-hint");
const fullNamePattern = /^[\p{L}\p{M}]+(?:[ .'-’][\p{L}\p{M}]+)*$/u;

function validateBookingName() {
  const normalized = bookingNameInput.value.trim().replace(/\s+/g, " ");
  const valid = normalized.length >= 2 && normalized.length <= 120 && fullNamePattern.test(normalized);
  bookingNameInput.setCustomValidity(valid ? "" : "Ingresa un nombre de 2 a 120 caracteres, usando letras y separadores comunes.");
}

function validateBookingPhone() {
  const compact = bookingPhoneInput.value.trim().replace(/[()\s.-]/g, "");
  const valid = /^\+?\d{8,15}$/.test(compact);
  bookingPhoneInput.setCustomValidity(valid ? "" : "Ingresa un teléfono con 8 a 15 dígitos; puedes incluir el código de país.");
}

function validateBookingGuests() {
  if (!bookingGuestsInput.value) {
    bookingGuestsInput.setCustomValidity("");
    return;
  }
  const guests = Number(bookingGuestsInput.value);
  const maximum = Number(bookingGuestsInput.max) || 30;
  const valid = Number.isInteger(guests) && guests >= 1 && guests <= maximum;
  bookingGuestsInput.setCustomValidity(valid ? "" : `La cantidad debe ser un entero entre 1 y ${maximum}, según la capacidad de esta cabaña.`);
}

bookingNameInput.addEventListener("input", validateBookingName);
bookingPhoneInput.addEventListener("input", validateBookingPhone);
bookingGuestsInput.addEventListener("input", validateBookingGuests);

function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    return draft && typeof draft === "object" ? draft : null;
  } catch {
    sessionStorage.removeItem(draftKey);
    return null;
  }
}

const savedDraft = readDraft();
if (savedDraft) {
  document.querySelector("#search-entry").value = savedDraft.fechaEntrada || "";
  document.querySelector("#search-exit").value = savedDraft.fechaSalida || "";
  document.querySelector("#search-guests").value = savedDraft.huespedes || 2;
  syncDateConstraints(searchEntryInput, searchExitInput, true);
}

function renderCabins(items) {
  cabins = items;
  cabinsList.replaceChildren();
  document.querySelector("#results-count").textContent = `${items.length} ${items.length === 1 ? "cabaña" : "cabañas"}`;

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No encontramos cabañas para esos filtros. Prueba con otras fechas o menos huéspedes.";
    cabinsList.append(empty);
    return;
  }

  items.forEach((cabin) => {
    const card = document.createElement("article");
    card.className = "cabin-card";
    const hasValidImageUrl = typeof cabin.imagenUrl === "string" && (
      /^https:\/\//i.test(cabin.imagenUrl)
      || /^\/uploads\/[A-Za-z0-9_-]{1,150}\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(cabin.imagenUrl)
    );
    if (hasValidImageUrl) {
      const image = document.createElement("img");
      image.className = "cabin-image";
      image.src = cabin.imagenUrl;
      image.alt = cabin.nombre ? `Cabaña ${cabin.nombre}` : "Cabaña en Chiloé";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        const fallback = document.createElement("div");
        fallback.className = "cabin-image-fallback";
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = "C";
        image.replaceWith(fallback);
      }, { once: true });
      card.append(image);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "cabin-image-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = "C";
      card.append(fallback);
    }

    const content = document.createElement("div");
    content.className = "cabin-card-content";
    const top = document.createElement("div");
    top.className = "cabin-card-top";
    const title = document.createElement("h3");
    title.textContent = cabin.nombre || "Cabaña";
    const price = document.createElement("div");
    price.className = "cabin-price";
    price.textContent = `$${Number(cabin.precioPorNoche).toLocaleString("es-CL")}`;
    const priceLabel = document.createElement("small");
    priceLabel.textContent = "por noche";
    price.append(priceLabel);
    top.append(title, price);

    const description = document.createElement("p");
    description.className = "cabin-description";
    description.textContent = cabin.descripcion || "Un lugar para descansar y disfrutar de Chiloé.";

    const amenities = document.createElement("ul");
    amenities.className = "cabin-meta";
    const capacity = document.createElement("li");
    capacity.textContent = `Hasta ${cabin.capacidad} huéspedes`;
    amenities.append(capacity);
    (Array.isArray(cabin.comodidades) ? cabin.comodidades : []).slice(0, 5).forEach((item) => {
      const amenity = document.createElement("li");
      amenity.textContent = item;
      amenities.append(amenity);
    });

    const reserve = document.createElement("button");
    reserve.className = "button";
    reserve.type = "button";
    reserve.dataset.reserveCabin = cabin.id;
    reserve.textContent = "Solicitar reserva";
    content.append(top, description, amenities, reserve);
    card.append(content);
    cabinsList.append(card);
  });
}

async function loadCabins(event) {
  if (event) event.preventDefault();
  const fechaEntrada = document.querySelector("#search-entry").value;
  const fechaSalida = document.querySelector("#search-exit").value;
  const huespedes = document.querySelector("#search-guests").value;

  if (Boolean(fechaEntrada) !== Boolean(fechaSalida)) {
    showMessage(pageMessage, "Indica tanto la entrada como la salida.", true);
    return;
  }

  const params = new URLSearchParams();
  if (fechaEntrada) params.set("fechaEntrada", fechaEntrada);
  if (fechaSalida) params.set("fechaSalida", fechaSalida);
  if (huespedes) params.set("huespedes", huespedes);

  showMessage(pageMessage, "Buscando cabañas…");
  try {
    const response = await fetch(`/api/cabanas?${params.toString()}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudieron cargar las cabañas.");
    renderCabins(result.data || []);
    showMessage(pageMessage, "");
  } catch (error) {
    cabinsList.replaceChildren();
    document.querySelector("#results-count").textContent = "";
    showMessage(pageMessage, error.message, true);
  }
}

function saveDraft(draft) {
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
}

function openBooking(draft, user = currentUser) {
  if (!draft?.cabanaId) return;
  document.querySelector("#booking-cabin-id").value = draft.cabanaId;
  document.querySelector("#selected-cabin").textContent = `Cabaña: ${draft.cabanaNombre || "seleccionada"}`;
  document.querySelector("#booking-name").value = user?.displayName || draft.nombre || "";
  document.querySelector("#booking-email").value = user?.email || "";
  document.querySelector("#booking-phone").value = draft.telefono || "";
  document.querySelector("#booking-entry").value = draft.fechaEntrada || "";
  document.querySelector("#booking-exit").value = draft.fechaSalida || "";
  syncDateConstraints(bookingEntryInput, bookingExitInput);
  const selectedCabin = cabins.find((item) => item.id === draft.cabanaId);
  const cabinCapacity = Number(selectedCabin?.capacidad ?? draft.capacidad);
  bookingGuestsInput.max = String(Number.isInteger(cabinCapacity) && cabinCapacity >= 1 ? Math.min(30, cabinCapacity) : 30);
  bookingGuestsInput.value = draft.huespedes || 2;
  bookingGuestsHint.textContent = `Esta cabaña admite hasta ${bookingGuestsInput.max} huéspedes.`;
  validateBookingGuests();
  validateBookingName();
  validateBookingPhone();
  validateBookingGuests();
  showMessage(bookingMessage, "");
  bookingPanel.hidden = false;
  bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

cabinsList.addEventListener("click", (event) => {
  const cabinId = event.target.closest("[data-reserve-cabin]")?.dataset.reserveCabin;
  if (!cabinId) return;
  const fechaEntrada = document.querySelector("#search-entry").value;
  const fechaSalida = document.querySelector("#search-exit").value;
  if (!fechaEntrada || !fechaSalida) {
    showMessage(pageMessage, "Elige las fechas de entrada y salida antes de solicitar una reserva.", true);
    document.querySelector("#search-entry").focus();
    return;
  }

  const cabin = cabins.find((item) => item.id === cabinId);
  if (!cabin) return;
  const draft = {
    cabanaId: cabin.id,
    cabanaNombre: cabin.nombre,
    capacidad: cabin.capacidad,
    fechaEntrada,
    fechaSalida,
    huespedes: Number(document.querySelector("#search-guests").value) || 1
  };
  saveDraft(draft);

  if (!currentUser) {
    showMessage(pageMessage, "Para reservar, inicia sesión o crea una cuenta. Conservamos tu selección.");
    window.location.assign("/cuenta.html?modo=registro&next=%2Fcliente%2F");
    return;
  }
  openBooking(draft, currentUser);
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showMessage(bookingMessage, "Inicia sesión para enviar la solicitud.", true);
    window.location.assign("/cuenta.html?next=%2Fcliente%2F");
    return;
  }

  validateBookingName();
  validateBookingPhone();
  syncDateConstraints(bookingEntryInput, bookingExitInput);
  if (!bookingForm.reportValidity()) return;

  const submitButton = document.querySelector("#submit-booking");
  submitButton.disabled = true;
  showMessage(bookingMessage, "Enviando solicitud…");
  const payload = {
    cabanaId: document.querySelector("#booking-cabin-id").value,
    cliente: {
      nombre: document.querySelector("#booking-name").value.trim(),
      email: currentUser.email,
      telefono: document.querySelector("#booking-phone").value.trim()
    },
    fechaEntrada: document.querySelector("#booking-entry").value,
    fechaSalida: document.querySelector("#booking-exit").value,
    huespedes: Number(document.querySelector("#booking-guests").value)
  };

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo enviar la solicitud.");
    sessionStorage.removeItem(draftKey);
    bookingPanel.hidden = true;
    bookingForm.reset();
    showMessage(pageMessage, "Solicitud enviada. El equipo revisará la disponibilidad y se pondrá en contacto contigo.");
  } catch (error) {
    showMessage(bookingMessage, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#close-booking").addEventListener("click", () => {
  bookingPanel.hidden = true;
  sessionStorage.removeItem(draftKey);
});
searchForm.addEventListener("submit", loadCabins);
document.querySelector("#logout-button").addEventListener("click", async () => {
  if (auth) await signOut(auth);
  window.location.reload();
});

if (firebaseConfigReady) {
  auth = getAuth(initializeApp(firebaseConfig));
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    document.querySelector("#account-link").hidden = Boolean(user);
    document.querySelector("#reservations-link").hidden = !user;
    document.querySelector("#logout-button").hidden = !user;
    if (user && savedDraft) openBooking(savedDraft, user);
  });
}

void loadCabins();

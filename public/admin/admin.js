import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const message = document.querySelector("#page-message");
const cabinsTable = document.querySelector("#cabins-table");
const reservationsTable = document.querySelector("#reservations-table");
const cabinForm = document.querySelector("#cabin-form");
const cabinImageInput = document.querySelector("#cabin-image-file");
const cabinImageUrlInput = document.querySelector("#cabin-image-url");
const cabinImagePreview = document.querySelector("#cabin-image-preview");
const cabinImagePreviewImage = document.querySelector("#cabin-image-preview-img");
const cabinImageDetails = document.querySelector("#cabin-image-details");
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
let auth;
let currentUser = null;
let cabins = [];
let reservations = [];
let reservationPage = 0;
let reservationCursors = [null];
let reservationNextCursor = null;
let previewObjectUrl = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "notice notice-error" : "notice";
}

async function api(path, options = {}) {
  const token = await currentUser.getIdToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`/api/admin/${path}`, {
    ...options,
    headers
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");
  return result;
}

function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text ?? "—";
  row.append(td);
  return td;
}

function isCabinImageUrl(value) {
  return typeof value === "string" && (
    /^https:\/\//i.test(value)
    || /^\/uploads\/[A-Za-z0-9_-]{1,150}\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(value)
  );
}

function clearCabinImagePreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  cabinImagePreviewImage.onload = null;
  cabinImagePreviewImage.onerror = null;
  cabinImagePreviewImage.removeAttribute("src");
  cabinImagePreview.hidden = true;
  cabinImageDetails.textContent = "";
}

function showCabinImagePreview(source, description = "") {
  cabinImagePreview.hidden = false;
  cabinImageDetails.textContent = description;
  cabinImagePreviewImage.onload = () => {
    const dimensions = `${cabinImagePreviewImage.naturalWidth} × ${cabinImagePreviewImage.naturalHeight} px`;
    cabinImageDetails.textContent = description ? `${dimensions} · ${description}` : dimensions;
  };
  cabinImagePreviewImage.onerror = () => {
    cabinImageDetails.textContent = "No se pudo cargar la vista previa.";
  };
  cabinImagePreviewImage.src = source;
}

function showCurrentCabinImage() {
  clearCabinImagePreview();
  if (isCabinImageUrl(cabinImageUrlInput.value)) {
    showCabinImagePreview(cabinImageUrlInput.value, "Imagen actual");
  }
}

function handleCabinImageSelection() {
  const file = cabinImageInput.files?.[0];
  if (!file) {
    showCurrentCabinImage();
    return;
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    cabinImageInput.value = "";
    showCurrentCabinImage();
    showMessage("Selecciona una imagen JPG, PNG o WebP.", true);
    return;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    cabinImageInput.value = "";
    showCurrentCabinImage();
    showMessage("La imagen no puede superar los 3 MB.", true);
    return;
  }

  clearCabinImagePreview();
  previewObjectUrl = URL.createObjectURL(file);
  showCabinImagePreview(previewObjectUrl, `Imagen seleccionada · ${(file.size / 1024).toFixed(0)} KB`);
  showMessage("");
}

function renderCabins() {
  cabinsTable.replaceChildren();
  document.querySelector("#active-count").textContent = cabins.filter((cabin) => cabin.activa).length;
  if (!cabins.length) {
    const row = document.createElement("tr");
    const td = cell(row, "Todavía no hay cabañas registradas.");
    td.colSpan = 5;
    cabinsTable.append(row);
    return;
  }

  cabins.forEach((cabin) => {
    const row = document.createElement("tr");
    cell(row, cabin.nombre);
    cell(row, `$${Number(cabin.precioPorNoche).toLocaleString("es-CL")}`);
    cell(row, `${cabin.capacidad} personas`);
    cell(row, cabin.activa ? "Activa" : "Inactiva");
    const actions = document.createElement("td");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.className = "text-button";
    edit.type = "button";
    edit.textContent = "Editar";
    edit.dataset.editCabin = cabin.id;
    actions.append(edit);
    const remove = document.createElement("button");
    remove.className = "text-button danger-text";
    remove.type = "button";
    remove.textContent = "Eliminar";
    remove.dataset.deleteCabin = cabin.id;
    actions.append(remove);
    row.append(actions);
    cabinsTable.append(row);
  });
}

function renderReservations() {
  reservationsTable.replaceChildren();
  document.querySelector("#reservation-count").textContent = reservations.length;
  document.querySelector("#pending-count").textContent = reservations.filter((item) => item.estado === "pendiente").length;
  if (!reservations.length) {
    const row = document.createElement("tr");
    const td = cell(row, "No hay reservas para mostrar.");
    td.colSpan = 7;
    reservationsTable.append(row);
    return;
  }

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");
    cell(row, `${reservation.cliente?.nombre || ""} · ${reservation.cliente?.email || ""}`);
    cell(row, reservation.cabanaNombre);
    cell(row, `${reservation.fechaEntrada} → ${reservation.fechaSalida}`);
    cell(row, String(reservation.huespedes));
    cell(row, `$${Number(reservation.totalEstimado).toLocaleString("es-CL")}`);
    const statusCell = cell(row, reservation.estado);
    const isOverdue = reservation.pendienteAntigua === true;
    if (isOverdue) {
      statusCell.classList.add("reservation-overdue");
      statusCell.title = "Solicitud pendiente hace más de 24 horas";
      statusCell.textContent = "Pendiente · más de 24 h";
    }
    const actions = document.createElement("td");
    if (reservation.estado === "pendiente" || reservation.estado === "confirmada") {
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Nuevo estado para reserva de ${reservation.cliente?.nombre || "cliente"}`);
      select.dataset.reservationState = reservation.id;
      const choices = reservation.estado === "pendiente"
        ? [["pendiente", "Pendiente"], ["confirmada", "Confirmar"], ["rechazada", "Rechazar"], ["cancelada", "Cancelar"]]
        : [["confirmada", "Confirmada"], ["cancelada", "Cancelar"]];
      choices.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
      });
      const save = document.createElement("button");
      save.className = "text-button";
      save.type = "button";
      save.textContent = "Actualizar";
      save.dataset.updateReservation = reservation.id;
      actions.append(select, save);
    } else {
      actions.textContent = "—";
    }
    row.append(actions);
    reservationsTable.append(row);
  });
}

async function loadData() {
  showMessage("Cargando información…");
  document.querySelector("#reservations-previous").disabled = true;
  document.querySelector("#reservations-next").disabled = true;
  try {
    const reservationParams = new URLSearchParams();
    const filter = document.querySelector("#reservation-filter").value;
    const cursor = reservationCursors[reservationPage];
    if (filter) reservationParams.set("estado", filter);
    if (cursor) reservationParams.set("cursor", cursor);
    const reservationQuery = reservationParams.toString();
    const [cabinData, reservationData] = await Promise.all([
      api("cabanas"),
      api(`reservas${reservationQuery ? `?${reservationQuery}` : ""}`)
    ]);
    cabins = cabinData.data || [];
    reservations = reservationData.data || [];
    reservationNextCursor = reservationData.nextCursor || null;
    document.querySelector("#pending-alert").hidden = !reservationData.hasOverduePending;
    document.querySelector("#reservations-page").textContent = `Página ${reservationPage + 1}`;
    document.querySelector("#reservations-previous").disabled = reservationPage === 0;
    document.querySelector("#reservations-next").disabled = !reservationNextCursor;
    renderCabins();
    renderReservations();
    showMessage("");
  } catch (error) {
    showMessage(error.message, true);
    if (error.message.includes("permisos de administrador")) {
      await signOut(auth);
      window.location.replace("/admin/login.html");
    }
  }
}

function resetCabinForm() {
  clearCabinImagePreview();
  cabinForm.reset();
  document.querySelector("#cabin-id").value = "";
  cabinImageUrlInput.value = "";
  document.querySelector("#save-cabin").textContent = "Guardar cabaña";
  document.querySelector("#cancel-edit").hidden = true;
}

cabinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#cabin-id").value;
  const imageFile = cabinImageInput.files?.[0] || null;
  const saveButton = document.querySelector("#save-cabin");
  const data = {
    nombre: document.querySelector("#cabin-name").value,
    precioPorNoche: Number(document.querySelector("#cabin-price").value),
    capacidad: Number(document.querySelector("#cabin-capacity").value),
    descripcion: document.querySelector("#cabin-description").value,
    imagenUrl: cabinImageUrlInput.value,
    comodidades: document.querySelector("#cabin-amenities").value.split(",").map((item) => item.trim()).filter(Boolean)
  };
  saveButton.disabled = true;
  try {
    const savedCabin = await api(id ? `cabanas/${encodeURIComponent(id)}` : "cabanas", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    const savedCabinId = savedCabin.data?.id || id;

    if (imageFile) {
      const formData = new FormData();
      formData.append("imagen", imageFile);
      try {
        await api(`cabanas/${encodeURIComponent(savedCabinId)}/imagen`, {
          method: "POST",
          body: formData
        });
      } catch (uploadError) {
        document.querySelector("#cabin-id").value = savedCabinId;
        document.querySelector("#save-cabin").textContent = "Reintentar guardado";
        await loadData();
        showMessage(`La cabaña se guardó, pero no se pudo subir la imagen: ${uploadError.message} Puedes volver a guardar para reintentar sin crear otra cabaña.`, true);
        return;
      }
    }

    resetCabinForm();
    showMessage(id ? "Cabaña actualizada." : "Cabaña creada.");
    await loadData();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

cabinImageInput.addEventListener("change", handleCabinImageSelection);

document.querySelector("#cancel-edit").addEventListener("click", resetCabinForm);
cabinsTable.addEventListener("click", async (event) => {
  const editId = event.target.dataset.editCabin;
  const deleteId = event.target.dataset.deleteCabin;
  if (editId) {
    const cabin = cabins.find((item) => item.id === editId);
    if (!cabin) return;
    resetCabinForm();
    document.querySelector("#cabin-id").value = cabin.id;
    document.querySelector("#cabin-name").value = cabin.nombre || "";
    document.querySelector("#cabin-price").value = cabin.precioPorNoche || "";
    document.querySelector("#cabin-capacity").value = cabin.capacidad || "";
    document.querySelector("#cabin-description").value = cabin.descripcion || "";
    cabinImageUrlInput.value = cabin.imagenUrl || "";
    document.querySelector("#cabin-amenities").value = (cabin.comodidades || []).join(", ");
    document.querySelector("#save-cabin").textContent = "Guardar cambios";
    document.querySelector("#cancel-edit").hidden = false;
    showCurrentCabinImage();
    document.querySelector("#cabin-name").focus();
  }
  const cabin = cabins.find((item) => item.id === deleteId);
  const confirmed = deleteId && cabin && window.confirm(
    `¿Eliminar permanentemente “${cabin.nombre}”? Se conservarán las reservas históricas. No se puede eliminar si tiene reservas pendientes o confirmadas.`
  );
  if (confirmed) {
    try {
      await api(`cabanas/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      showMessage("Cabaña eliminada.");
      await loadData();
    } catch (error) {
      showMessage(error.message, true);
    }
  }
});

reservationsTable.addEventListener("click", async (event) => {
  const id = event.target.dataset.updateReservation;
  if (!id) return;
  const select = reservationsTable.querySelector(`[data-reservation-state="${CSS.escape(id)}"]`);
  try {
    await api(`reservas/${encodeURIComponent(id)}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado: select.value })
    });
    showMessage("Estado de la reserva actualizado.");
    await loadData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.querySelector("#reservation-filter").addEventListener("change", () => {
  reservationPage = 0;
  reservationCursors = [null];
  reservationNextCursor = null;
  loadData();
});
document.querySelector("#reservations-previous").addEventListener("click", () => {
  if (reservationPage === 0) return;
  reservationPage -= 1;
  loadData();
});
document.querySelector("#reservations-next").addEventListener("click", () => {
  if (!reservationNextCursor) return;
  reservationPage += 1;
  reservationCursors[reservationPage] = reservationNextCursor;
  loadData();
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("/admin/login.html");
});

if (!firebaseConfigReady) {
  showMessage("Configura la aplicación web de Firebase antes de usar el panel.", true);
} else {
  auth = getAuth(initializeApp(firebaseConfig));
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("/admin/login.html");
      return;
    }
    currentUser = user;
    document.querySelector("#admin-email").textContent = user.email || "Administrador";
    await loadData();
  });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigReady } from "/admin/firebase-config.js";

const message = document.querySelector("#page-message");
const cabinsTable = document.querySelector("#cabins-table");
const reservationsTable = document.querySelector("#reservations-table");
const cabinForm = document.querySelector("#cabin-form");
let auth;
let currentUser = null;
let cabins = [];
let reservations = [];

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "notice notice-error" : "notice";
}

async function api(path, options = {}) {
  const token = await currentUser.getIdToken();
  const response = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");
  return result.data;
}

function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text ?? "—";
  row.append(td);
  return td;
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
    if (cabin.activa) {
      const deactivate = document.createElement("button");
      deactivate.className = "text-button danger-text";
      deactivate.type = "button";
      deactivate.textContent = "Desactivar";
      deactivate.dataset.deactivateCabin = cabin.id;
      actions.append(deactivate);
    }
    row.append(actions);
    cabinsTable.append(row);
  });
}

function renderReservations() {
  const filter = document.querySelector("#reservation-filter").value;
  const visible = reservations.filter((reservation) => !filter || reservation.estado === filter);
  reservationsTable.replaceChildren();
  document.querySelector("#reservation-count").textContent = reservations.length;
  document.querySelector("#pending-count").textContent = reservations.filter((item) => item.estado === "pendiente").length;
  if (!visible.length) {
    const row = document.createElement("tr");
    const td = cell(row, "No hay reservas para mostrar.");
    td.colSpan = 7;
    reservationsTable.append(row);
    return;
  }

  visible.forEach((reservation) => {
    const row = document.createElement("tr");
    cell(row, `${reservation.cliente?.nombre || ""} · ${reservation.cliente?.email || ""}`);
    cell(row, reservation.cabanaNombre);
    cell(row, `${reservation.fechaEntrada} → ${reservation.fechaSalida}`);
    cell(row, String(reservation.huespedes));
    cell(row, `$${Number(reservation.totalEstimado).toLocaleString("es-CL")}`);
    cell(row, reservation.estado);
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
  try {
    const [cabinData, reservationData] = await Promise.all([
      api("cabanas"),
      api(`reservas${document.querySelector("#reservation-filter").value ? `?estado=${encodeURIComponent(document.querySelector("#reservation-filter").value)}` : ""}`)
    ]);
    cabins = cabinData;
    reservations = reservationData;
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
  cabinForm.reset();
  document.querySelector("#cabin-id").value = "";
  document.querySelector("#save-cabin").textContent = "Guardar cabaña";
  document.querySelector("#cancel-edit").hidden = true;
}

cabinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#cabin-id").value;
  const data = {
    nombre: document.querySelector("#cabin-name").value,
    precioPorNoche: Number(document.querySelector("#cabin-price").value),
    capacidad: Number(document.querySelector("#cabin-capacity").value),
    descripcion: document.querySelector("#cabin-description").value,
    imagenUrl: document.querySelector("#cabin-image").value,
    comodidades: document.querySelector("#cabin-amenities").value.split(",").map((item) => item.trim()).filter(Boolean)
  };
  try {
    await api(id ? `cabanas/${encodeURIComponent(id)}` : "cabanas", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    resetCabinForm();
    showMessage(id ? "Cabaña actualizada." : "Cabaña creada.");
    await loadData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.querySelector("#cancel-edit").addEventListener("click", resetCabinForm);
cabinsTable.addEventListener("click", async (event) => {
  const editId = event.target.dataset.editCabin;
  const deactivateId = event.target.dataset.deactivateCabin;
  if (editId) {
    const cabin = cabins.find((item) => item.id === editId);
    if (!cabin) return;
    document.querySelector("#cabin-id").value = cabin.id;
    document.querySelector("#cabin-name").value = cabin.nombre || "";
    document.querySelector("#cabin-price").value = cabin.precioPorNoche || "";
    document.querySelector("#cabin-capacity").value = cabin.capacidad || "";
    document.querySelector("#cabin-description").value = cabin.descripcion || "";
    document.querySelector("#cabin-image").value = cabin.imagenUrl || "";
    document.querySelector("#cabin-amenities").value = (cabin.comodidades || []).join(", ");
    document.querySelector("#save-cabin").textContent = "Guardar cambios";
    document.querySelector("#cancel-edit").hidden = false;
    document.querySelector("#cabin-name").focus();
  }
  if (deactivateId && window.confirm("¿Desactivar esta cabaña? Se conservará el historial de reservas.")) {
    try {
      await api(`cabanas/${encodeURIComponent(deactivateId)}`, { method: "DELETE" });
      showMessage("Cabaña desactivada.");
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

document.querySelector("#reservation-filter").addEventListener("change", loadData);
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
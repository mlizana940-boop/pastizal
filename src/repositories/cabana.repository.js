const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebaseAdmin");
const { HttpError } = require("../utils/httpError");

const collection = db.collection("cabanas");
const reservations = db.collection("reservas");
const ACTIVE_RESERVATION_STATES = new Set(["pendiente", "confirmada"]);

function serializeDate(value) {
  return value && typeof value.toDate === "function" ? value.toDate().toISOString() : value;
}

function toCabana(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

async function list({ incluirInactivas = false } = {}) {
  const snapshot = incluirInactivas
    ? await collection.get()
    : await collection.where("activa", "==", true).get();
  return snapshot.docs.map(toCabana).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function findById(id) {
  const snapshot = await collection.doc(id).get();
  return snapshot.exists ? toCabana(snapshot) : null;
}

async function create(data) {
  const ref = collection.doc();
  const timestamp = FieldValue.serverTimestamp();
  await ref.set({ ...data, activa: true, createdAt: timestamp, updatedAt: timestamp });
  const now = new Date().toISOString();
  return { id: ref.id, ...data, activa: true, createdAt: now, updatedAt: now };
}

async function update(id, data) {
  const ref = collection.doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpError(404, "No se encontró la cabaña.");
  await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  const previous = toCabana(snapshot);
  return { ...previous, ...data, updatedAt: new Date().toISOString() };
}

async function updateImage(id, imagenUrl) {
  const ref = collection.doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpError(404, "No se encontró la cabaña.");
  await ref.update({ imagenUrl, updatedAt: FieldValue.serverTimestamp() });
  return toCabana(snapshot);
}

async function remove(id) {
  const ref = collection.doc(id);
  await db.runTransaction(async (transaction) => {
    const cabinSnapshot = await transaction.get(ref);
    if (!cabinSnapshot.exists) throw new HttpError(404, "No se encontró la cabaña.");

    const reservationSnapshot = await transaction.get(
      reservations.where("cabanaId", "==", id)
    );
    const hasActiveReservations = reservationSnapshot.docs.some((snapshot) =>
      ACTIVE_RESERVATION_STATES.has(snapshot.data().estado)
    );
    if (hasActiveReservations) {
      throw new HttpError(
        409,
        "No se puede eliminar la cabaña porque tiene reservas pendientes o confirmadas. Rechaza o cancela esas reservas primero."
      );
    }

    // Bloquea nuevas reservas antes del borrado recursivo.
    transaction.update(ref, {
      activa: false,
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  // Firestore no borra subcolecciones al borrar el documento padre.
  // recursiveDelete también elimina las noches ocupadas asociadas.
  await db.recursiveDelete(ref);
  return { id, deleted: true };
}

module.exports = { create, findById, list, remove, update, updateImage };

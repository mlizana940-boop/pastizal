const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebaseAdmin");
const { HttpError } = require("../utils/httpError");

const collection = db.collection("cabanas");

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

async function deactivate(id) {
  const ref = collection.doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpError(404, "No se encontró la cabaña.");
  await ref.update({ activa: false, updatedAt: FieldValue.serverTimestamp() });
  return { ...toCabana(snapshot), activa: false, updatedAt: new Date().toISOString() };
}

module.exports = { create, deactivate, findById, list, update };

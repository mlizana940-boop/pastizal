const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebaseAdmin");
const { HttpError } = require("../utils/httpError");
const { buildNightKeys } = require("../utils/fechas");

const reservations = db.collection("reservas");
const cabins = db.collection("cabanas");
const ACTIVE_STATES = new Set(["pendiente", "confirmada"]);

function serializeDate(value) {
  return value && typeof value.toDate === "function" ? value.toDate().toISOString() : value;
}

function toReserva(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

async function list({ estado } = {}) {
  const snapshot = await reservations.limit(500).get();
  return snapshot.docs
    .map(toReserva)
    .filter((reserva) => !estado || reserva.estado === estado)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

async function isAvailable(cabanaId, nights) {
  const cabinRef = cabins.doc(cabanaId);
  const slotRefs = nights.map((date) => cabinRef.collection("nochesOcupadas").doc(date));
  const snapshots = await Promise.all(slotRefs.map((slotRef) => slotRef.get()));
  return snapshots.every((snapshot) => !snapshot.exists);
}

async function createWithAvailability(data) {
  const reservationRef = reservations.doc();
  const cabinRef = cabins.doc(data.cabanaId);
  const slotRefs = data.noches.map((date) => cabinRef.collection("nochesOcupadas").doc(date));
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const cabinSnapshot = await transaction.get(cabinRef);
    if (!cabinSnapshot.exists || cabinSnapshot.data().activa !== true) {
      throw new HttpError(404, "La cabaña no existe o no está disponible.");
    }

    const cabin = cabinSnapshot.data();
    if (data.huespedes > Number(cabin.capacidad)) {
      throw new HttpError(400, "La cantidad de huéspedes supera la capacidad de la cabaña.");
    }

    const occupiedSlots = [];
    for (const slotRef of slotRefs) occupiedSlots.push(await transaction.get(slotRef));
    if (occupiedSlots.some((slot) => slot.exists)) {
      throw new HttpError(409, "La cabaña ya está ocupada en una o más de esas fechas.");
    }

    const reservation = {
      cabanaId: data.cabanaId,
      cabanaNombre: cabin.nombre,
      cliente: data.cliente,
      huespedes: data.huespedes,
      fechaEntrada: data.fechaEntrada,
      fechaSalida: data.fechaSalida,
      cantidadNoches: data.noches.length,
      precioPorNoche: Number(cabin.precioPorNoche),
      totalEstimado: Number(cabin.precioPorNoche) * data.noches.length,
      estado: "pendiente",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    transaction.create(reservationRef, reservation);
    slotRefs.forEach((slotRef) => transaction.create(slotRef, { reservaId: reservationRef.id }));
    return { id: reservationRef.id, ...reservation, createdAt: now, updatedAt: now };
  });

  return result;
}

async function updateStatus(id, nextState) {
  const reservationRef = reservations.doc(id);
  return db.runTransaction(async (transaction) => {
    const reservationSnapshot = await transaction.get(reservationRef);
    if (!reservationSnapshot.exists) throw new HttpError(404, "No se encontró la reserva.");

    const reservation = reservationSnapshot.data();
    const allowedNextStates = {
      pendiente: new Set(["confirmada", "rechazada", "cancelada"]),
      confirmada: new Set(["cancelada"]),
      rechazada: new Set(),
      cancelada: new Set()
    };
    if (!allowedNextStates[reservation.estado]?.has(nextState)) {
      throw new HttpError(409, `No se puede cambiar una reserva de ${reservation.estado} a ${nextState}.`);
    }

    const shouldRelease = ACTIVE_STATES.has(reservation.estado) && !ACTIVE_STATES.has(nextState);
    const cabinRef = cabins.doc(reservation.cabanaId);
    const slotRefs = shouldRelease
      ? buildNightKeys(reservation.fechaEntrada, reservation.fechaSalida)
          .map((date) => cabinRef.collection("nochesOcupadas").doc(date))
      : [];
    const slots = [];
    for (const slotRef of slotRefs) slots.push(await transaction.get(slotRef));

    const updatedAt = FieldValue.serverTimestamp();
    transaction.update(reservationRef, { estado: nextState, updatedAt });
    slots.forEach((slot, index) => {
      if (slot.exists && slot.data().reservaId === id) transaction.delete(slotRefs[index]);
    });

    return { id, ...reservation, estado: nextState, updatedAt: new Date().toISOString() };
  });
}

module.exports = { createWithAvailability, isAvailable, list, updateStatus };

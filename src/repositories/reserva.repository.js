const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { db } = require("../config/firebaseAdmin");
const { HttpError } = require("../utils/httpError");
const { buildNightKeys } = require("../utils/fechas");

const reservations = db.collection("reservas");
const cabins = db.collection("cabanas");
const ACTIVE_STATES = new Set(["pendiente", "confirmada"]);
const RESERVATION_PAGE_SIZE = 20;
const PENDING_ALERT_AGE_MS = 24 * 60 * 60 * 1000;

function serializeDate(value) {
  return value && typeof value.toDate === "function" ? value.toDate().toISOString() : value;
}

function toReserva(snapshot) {
  const data = snapshot.data();
  const createdAt = serializeDate(data.createdAt);
  return {
    id: snapshot.id,
    ...data,
    createdAt,
    updatedAt: serializeDate(data.updatedAt),
    pendienteAntigua: data.estado === "pendiente"
      && Date.now() - Date.parse(createdAt) >= PENDING_ALERT_AGE_MS
  };
}

function buildReservationQuery({ estado, clienteUid } = {}) {
  let query = reservations;
  if (clienteUid) query = query.where("clienteUid", "==", clienteUid);
  if (estado) query = query.where("estado", "==", estado);
  return query.orderBy("createdAt", "desc");
}

async function readCursor(cursor, { clienteUid } = {}) {
  if (!cursor) return null;
  if (typeof cursor !== "string" || !/^[A-Za-z0-9_-]{1,150}$/.test(cursor)) {
    throw new HttpError(400, "El cursor de paginación no es válido.");
  }

  const snapshot = await reservations.doc(cursor).get();
  if (!snapshot.exists) throw new HttpError(400, "El cursor de paginación ya no existe.");
  const data = snapshot.data();
  if (clienteUid && data.clienteUid !== clienteUid) {
    throw new HttpError(400, "El cursor no corresponde a esta lista de reservas.");
  }
  return snapshot;
}

async function listPage(filters = {}) {
  let query = buildReservationQuery(filters);
  const cursorSnapshot = await readCursor(filters.cursor, filters);
  if (cursorSnapshot) query = query.startAfter(cursorSnapshot);

  const snapshot = await query.limit(RESERVATION_PAGE_SIZE + 1).get();
  const hasMore = snapshot.docs.length > RESERVATION_PAGE_SIZE;
  const pageDocs = snapshot.docs.slice(0, RESERVATION_PAGE_SIZE);
  return {
    items: pageDocs.map(toReserva),
    nextCursor: hasMore ? pageDocs[pageDocs.length - 1].id : null
  };
}

async function listForAdmin({ estado, cursor } = {}) {
  return listPage({ estado, cursor });
}

async function listForClient(clienteUid, cursor) {
  return listPage({ clienteUid, cursor });
}

async function hasOverduePending() {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - PENDING_ALERT_AGE_MS));
  const snapshot = await reservations
    .where("estado", "==", "pendiente")
    .where("createdAt", "<", cutoff)
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();
  return !snapshot.empty;
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
      clienteUid: data.clienteUid,
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

module.exports = {
  createWithAvailability,
  hasOverduePending,
  isAvailable,
  listForAdmin,
  listForClient,
  updateStatus
};

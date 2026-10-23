const reservaRepository = require("../repositories/reserva.repository");
const { ESTADOS_RESERVA, validateReserva } = require("../models/reserva.model");
const { HttpError } = require("../utils/httpError");

async function create(input, user) {
  if (!user?.uid || typeof user.email !== "string" || !user.email) {
    throw new HttpError(401, "Inicia sesión con una cuenta que tenga correo electrónico.");
  }

  const data = validateReserva({
    ...(input || {}),
    cliente: { ...(input?.cliente || {}), email: user.email }
  });
  data.clienteUid = user.uid;
  return reservaRepository.createWithAvailability(data);
}

async function list(estado) {
  if (estado && !ESTADOS_RESERVA.includes(estado)) {
    throw new HttpError(400, "El filtro de estado no es válido.");
  }
  return reservaRepository.list({ estado });
}

async function updateStatus(id, estado) {
  if (!ESTADOS_RESERVA.includes(estado)) {
    throw new HttpError(400, "El estado de la reserva no es válido.");
  }
  return reservaRepository.updateStatus(id, estado);
}

module.exports = { create, list, updateStatus };

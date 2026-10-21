const reservaRepository = require("../repositories/reserva.repository");
const { ESTADOS_RESERVA, validateReserva } = require("../models/reserva.model");
const { HttpError } = require("../utils/httpError");

async function create(input) {
  const data = validateReserva(input);
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
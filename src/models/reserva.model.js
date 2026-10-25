const { HttpError } = require("../utils/httpError");
const { assertEntryDateNotPast, buildNightKeys } = require("../utils/fechas");

const ESTADOS_RESERVA = ["pendiente", "confirmada", "rechazada", "cancelada"];

function validateReserva(input = {}) {
  const cabanaId = typeof input.cabanaId === "string" ? input.cabanaId.trim() : "";
  const nombre = typeof input.cliente?.nombre === "string" ? input.cliente.nombre.trim() : "";
  const email = typeof input.cliente?.email === "string" ? input.cliente.email.trim().toLowerCase() : "";
  const telefono = typeof input.cliente?.telefono === "string" ? input.cliente.telefono.trim() : "";
  const huespedes = Number(input.huespedes);
  const fechaEntrada = input.fechaEntrada;
  const fechaSalida = input.fechaSalida;
  assertEntryDateNotPast(fechaEntrada);
  const noches = buildNightKeys(fechaEntrada, fechaSalida);

  if (!cabanaId) throw new HttpError(400, "Selecciona una cabaña.");
  if (nombre.length < 2 || nombre.length > 120) {
    throw new HttpError(400, "El nombre del cliente debe tener entre 2 y 120 caracteres.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new HttpError(400, "Ingresa un correo electrónico válido.");
  }
  if (telefono.length < 6 || telefono.length > 30) {
    throw new HttpError(400, "Ingresa un teléfono válido.");
  }
  if (!Number.isInteger(huespedes) || huespedes < 1 || huespedes > 30) {
    throw new HttpError(400, "La cantidad de huéspedes debe ser un entero entre 1 y 30.");
  }

  return { cabanaId, cliente: { nombre, email, telefono }, huespedes, fechaEntrada, fechaSalida, noches };
}

module.exports = { ESTADOS_RESERVA, validateReserva };

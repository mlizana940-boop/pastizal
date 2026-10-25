const { HttpError } = require("../utils/httpError");
const { assertEntryDateNotPast, buildNightKeys } = require("../utils/fechas");

const ESTADOS_RESERVA = ["pendiente", "confirmada", "rechazada", "cancelada"];
const fullNamePattern = /^[\p{L}\p{M}]+(?:[ .'-’][\p{L}\p{M}]+)*$/u;

function parseInteger(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return Number.NaN;
}

function validateReserva(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "Los datos de la reserva no son válidos.");
  }
  const cabanaId = typeof input.cabanaId === "string" ? input.cabanaId.trim() : "";
  const nombre = typeof input.cliente?.nombre === "string"
    ? input.cliente.nombre.trim().replace(/\s+/g, " ")
    : "";
  const email = typeof input.cliente?.email === "string" ? input.cliente.email.trim().toLowerCase() : "";
  const telefono = typeof input.cliente?.telefono === "string" ? input.cliente.telefono.trim() : "";
  const compactPhone = telefono.replace(/[()\s.-]/g, "");
  const huespedes = parseInteger(input.huespedes);
  const fechaEntrada = input.fechaEntrada;
  const fechaSalida = input.fechaSalida;

  if (!/^[A-Za-z0-9_-]{1,150}$/.test(cabanaId)) {
    throw new HttpError(400, "Selecciona una cabaña válida.");
  }
  if (nombre.length < 2 || nombre.length > 120 || !fullNamePattern.test(nombre)) {
    throw new HttpError(400, "Ingresa un nombre completo válido de 2 a 120 caracteres.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpError(400, "Ingresa un correo electrónico válido.");
  }
  if (telefono.length > 25 || !/^\+?\d{8,15}$/.test(compactPhone)) {
    throw new HttpError(400, "Ingresa un teléfono con 8 a 15 dígitos; puedes incluir el código de país.");
  }
  if (!Number.isInteger(huespedes) || huespedes < 1 || huespedes > 30) {
    throw new HttpError(400, "La cantidad de huéspedes debe ser un entero entre 1 y 30.");
  }

  assertEntryDateNotPast(fechaEntrada);
  const noches = buildNightKeys(fechaEntrada, fechaSalida);

  return { cabanaId, cliente: { nombre, email, telefono }, huespedes, fechaEntrada, fechaSalida, noches };
}

module.exports = { ESTADOS_RESERVA, validateReserva };

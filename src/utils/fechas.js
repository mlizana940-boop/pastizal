const { HttpError } = require("./httpError");

const MAX_NOCHES = 30;
const TIME_ZONE_CHILE = "America/Santiago";

function parseIsoDate(value, fieldName) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${fieldName} debe tener formato AAAA-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${fieldName} no es una fecha válida.`);
  }
  return date;
}

function todayKeyInChile(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE_CHILE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertEntryDateNotPast(value, now = new Date()) {
  parseIsoDate(value, "La fecha de entrada");
  if (value < todayKeyInChile(now)) {
    throw new HttpError(400, "La fecha de entrada no puede ser anterior a hoy.");
  }
}

function buildNightKeys(fechaEntrada, fechaSalida) {
  const start = parseIsoDate(fechaEntrada, "La fecha de entrada");
  const end = parseIsoDate(fechaSalida, "La fecha de salida");
  if (end <= start) throw new HttpError(400, "La salida debe ser posterior a la entrada.");

  const nightCount = (end.getTime() - start.getTime()) / 86_400_000;
  if (nightCount > MAX_NOCHES) {
    throw new HttpError(400, `La estadía no puede superar ${MAX_NOCHES} noches.`);
  }

  return Array.from({ length: nightCount }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

module.exports = { assertEntryDateNotPast, buildNightKeys, todayKeyInChile };

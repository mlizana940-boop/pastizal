const cabanaRepository = require("../repositories/cabana.repository");
const reservaRepository = require("../repositories/reserva.repository");
const { assertEntryDateNotPast, buildNightKeys } = require("../utils/fechas");
const { HttpError } = require("../utils/httpError");

async function listAvailable({ fechaEntrada, fechaSalida, huespedes } = {}) {
  const hasEntry = Boolean(fechaEntrada);
  const hasExit = Boolean(fechaSalida);
  if (hasEntry !== hasExit) {
    throw new HttpError(400, "Indica tanto la fecha de entrada como la fecha de salida.");
  }

  let guestCount;
  if (huespedes !== undefined && huespedes !== "") {
    guestCount = Number(huespedes);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 30) {
      throw new HttpError(400, "La cantidad de huéspedes debe ser un entero entre 1 y 30.");
    }
  }

  if (hasEntry) assertEntryDateNotPast(fechaEntrada);
  const nights = hasEntry ? buildNightKeys(fechaEntrada, fechaSalida) : null;
  const cabins = await cabanaRepository.list();
  const matchingCapacity = guestCount
    ? cabins.filter((cabin) => Number(cabin.capacidad) >= guestCount)
    : cabins;

  if (!nights) return matchingCapacity;

  const availability = await Promise.all(matchingCapacity.map(async (cabin) => ({
    cabin,
    available: await reservaRepository.isAvailable(cabin.id, nights)
  })));
  return availability.filter((item) => item.available).map((item) => item.cabin);
}

module.exports = { buildNightKeys, listAvailable };

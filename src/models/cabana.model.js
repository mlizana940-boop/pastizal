const { HttpError } = require("../utils/httpError");

const MAX_PRICE_CLP = 10_000_000;
const MAX_AMENITIES = 20;
const MAX_AMENITY_LENGTH = 40;

function parseInteger(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return Number.NaN;
}

function validateCabanaImageUrl(imagenUrl) {
  if (!imagenUrl) return true;
  const isManagedImage = /^\/uploads\/[A-Za-z0-9_-]{1,150}\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(imagenUrl);
  if (isManagedImage) return true;

  try {
    const url = new URL(imagenUrl);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateCabana(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "Los datos de la cabaña no son válidos.");
  }

  const nombre = typeof input.nombre === "string" ? input.nombre.trim().replace(/\s+/g, " ") : "";
  const descripcion = input.descripcion === undefined || input.descripcion === null
    ? ""
    : typeof input.descripcion === "string" ? input.descripcion.trim() : null;
  const precioPorNoche = parseInteger(input.precioPorNoche);
  const capacidad = parseInteger(input.capacidad);
  const imagenUrl = input.imagenUrl === undefined || input.imagenUrl === null
    ? ""
    : typeof input.imagenUrl === "string" ? input.imagenUrl.trim() : null;
  if (input.comodidades !== undefined && !Array.isArray(input.comodidades)) {
    throw new HttpError(400, "Las comodidades deben enviarse como una lista.");
  }
  const comodidades = (input.comodidades || []).map((item) => {
    if (typeof item !== "string") throw new HttpError(400, "Cada comodidad debe ser texto.");
    return item.trim();
  }).filter(Boolean);
  const normalizedAmenities = comodidades.map((item) => item.toLocaleLowerCase("es-CL"));

  if (nombre.length < 2 || nombre.length > 100 || /[\u0000-\u001f\u007f]/.test(nombre)) {
    throw new HttpError(400, "El nombre debe tener entre 2 y 100 caracteres.");
  }
  if (!Number.isSafeInteger(precioPorNoche) || precioPorNoche < 1 || precioPorNoche > MAX_PRICE_CLP) {
    throw new HttpError(400, `El precio debe ser un número entero entre $1 y $${MAX_PRICE_CLP.toLocaleString("es-CL")} CLP.`);
  }
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 30) {
    throw new HttpError(400, "La capacidad debe ser un número entero entre 1 y 30.");
  }
  if (descripcion === null) {
    throw new HttpError(400, "La descripción debe ser texto.");
  }
  if (descripcion.length > 1000) {
    throw new HttpError(400, "La descripción no puede superar los 1000 caracteres.");
  }
  if (imagenUrl === null || imagenUrl.length > 2048 || !validateCabanaImageUrl(imagenUrl)) {
    throw new HttpError(400, "La imagen debe usar una URL HTTPS válida o una imagen cargada en el servidor.");
  }
  if (comodidades.length > MAX_AMENITIES) {
    throw new HttpError(400, `Una cabaña puede tener hasta ${MAX_AMENITIES} comodidades.`);
  }
  if (comodidades.some((item) => item.length < 2 || item.length > MAX_AMENITY_LENGTH)) {
    throw new HttpError(400, `Cada comodidad debe tener entre 2 y ${MAX_AMENITY_LENGTH} caracteres.`);
  }
  if (new Set(normalizedAmenities).size !== comodidades.length) {
    throw new HttpError(400, "No repitas la misma comodidad.");
  }

  return { nombre, descripcion, precioPorNoche, capacidad, imagenUrl, comodidades };
}

module.exports = { validateCabana };

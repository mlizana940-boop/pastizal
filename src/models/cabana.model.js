const { HttpError } = require("../utils/httpError");

function validateCabana(input = {}) {
  const nombre = typeof input.nombre === "string" ? input.nombre.trim() : "";
  const descripcion = typeof input.descripcion === "string" ? input.descripcion.trim() : "";
  const precioPorNoche = Number(input.precioPorNoche);
  const capacidad = Number(input.capacidad);
  const imagenUrl = typeof input.imagenUrl === "string" ? input.imagenUrl.trim() : "";
  const isManagedImage = /^\/uploads\/[A-Za-z0-9_-]{1,150}\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(imagenUrl);
  const comodidades = Array.isArray(input.comodidades)
    ? input.comodidades.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (nombre.length < 2 || nombre.length > 100) {
    throw new HttpError(400, "El nombre debe tener entre 2 y 100 caracteres.");
  }
  if (!Number.isFinite(precioPorNoche) || precioPorNoche <= 0) {
    throw new HttpError(400, "Ingresa un precio por noche mayor que cero.");
  }
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 30) {
    throw new HttpError(400, "La capacidad debe ser un número entero entre 1 y 30.");
  }
  if (descripcion.length > 1000) {
    throw new HttpError(400, "La descripción no puede superar los 1000 caracteres.");
  }
  if (imagenUrl && !/^https:\/\//i.test(imagenUrl) && !isManagedImage) {
    throw new HttpError(400, "La imagen debe usar una URL https:// válida o una imagen cargada en el servidor.");
  }
  if (comodidades.length > 20) {
    throw new HttpError(400, "Una cabaña puede tener hasta 20 comodidades.");
  }

  return { nombre, descripcion, precioPorNoche, capacidad, imagenUrl, comodidades };
}

module.exports = { validateCabana };

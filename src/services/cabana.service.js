const cabanaRepository = require("../repositories/cabana.repository");
const cabanaImageService = require("./cabanaImage.service");
const disponibilidadService = require("./disponibilidad.service");
const { validateCabana } = require("../models/cabana.model");

async function listPublicas(filters) {
  return disponibilidadService.listAvailable(filters);
}

async function listTodas() {
  return cabanaRepository.list({ incluirInactivas: true });
}

async function create(input) {
  return cabanaRepository.create(validateCabana(input));
}

async function update(id, input) {
  return cabanaRepository.update(id, validateCabana(input));
}

async function remove(id) {
  const result = await cabanaRepository.remove(id);
  await cabanaImageService.removeAllForCabana(id);
  return result;
}

async function replaceImage(id, file) {
  return cabanaImageService.replace(id, file);
}

module.exports = { create, listPublicas, listTodas, remove, replaceImage, update };

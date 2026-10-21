const cabanaRepository = require("../repositories/cabana.repository");
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

async function deactivate(id) {
  return cabanaRepository.deactivate(id);
}

module.exports = { create, deactivate, listPublicas, listTodas, update };

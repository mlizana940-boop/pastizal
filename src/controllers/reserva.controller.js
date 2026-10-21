const reservaService = require("../services/reserva.service");

async function create(req, res) {
  res.status(201).json({ data: await reservaService.create(req.body) });
}

async function list(req, res) {
  res.json({ data: await reservaService.list(req.query.estado) });
}

async function updateStatus(req, res) {
  res.json({ data: await reservaService.updateStatus(req.params.id, req.body.estado) });
}

module.exports = { create, list, updateStatus };
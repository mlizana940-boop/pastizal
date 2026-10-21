const cabanaService = require("../services/cabana.service");

async function listPublicas(req, res) {
  res.json({ data: await cabanaService.listPublicas(req.query) });
}

async function listTodas(req, res) {
  res.json({ data: await cabanaService.listTodas() });
}

async function create(req, res) {
  res.status(201).json({ data: await cabanaService.create(req.body) });
}

async function update(req, res) {
  res.json({ data: await cabanaService.update(req.params.id, req.body) });
}

async function deactivate(req, res) {
  res.json({ data: await cabanaService.deactivate(req.params.id) });
}

module.exports = { create, deactivate, listPublicas, listTodas, update };
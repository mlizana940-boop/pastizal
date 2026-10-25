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

async function remove(req, res) {
  res.json({ data: await cabanaService.remove(req.params.id) });
}

async function replaceImage(req, res) {
  res.json({ data: await cabanaService.replaceImage(req.params.id, req.file) });
}

module.exports = { create, listPublicas, listTodas, remove, replaceImage, update };

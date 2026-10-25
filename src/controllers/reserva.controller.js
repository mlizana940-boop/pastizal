const reservaService = require("../services/reserva.service");

async function create(req, res) {
  res.status(201).json({ data: await reservaService.create(req.body, req.user) });
}

async function list(req, res) {
  const page = await reservaService.list(req.query.estado, req.query.cursor);
  res.json({ data: page.items, nextCursor: page.nextCursor, hasOverduePending: page.hasOverduePending });
}

async function listMine(req, res) {
  const page = await reservaService.listMine(req.user.uid, req.query.cursor);
  res.json({ data: page.items, nextCursor: page.nextCursor });
}

async function updateStatus(req, res) {
  res.json({ data: await reservaService.updateStatus(req.params.id, req.body.estado) });
}

module.exports = { create, list, listMine, updateStatus };

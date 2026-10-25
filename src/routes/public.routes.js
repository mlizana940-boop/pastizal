const express = require("express");
const cabanaController = require("../controllers/cabana.controller");
const reservaController = require("../controllers/reserva.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
router.get("/cabanas", cabanaController.listPublicas);
router.post("/reservas", requireAuth, reservaController.create);
router.get("/mis-reservas", requireAuth, reservaController.listMine);

module.exports = router;

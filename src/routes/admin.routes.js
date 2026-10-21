const express = require("express");
const cabanaController = require("../controllers/cabana.controller");
const reservaController = require("../controllers/reserva.controller");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();
router.use(requireAdmin);
router.get("/cabanas", cabanaController.listTodas);
router.post("/cabanas", cabanaController.create);
router.put("/cabanas/:id", cabanaController.update);
router.delete("/cabanas/:id", cabanaController.deactivate);
router.get("/reservas", reservaController.list);
router.patch("/reservas/:id/estado", reservaController.updateStatus);

module.exports = router;
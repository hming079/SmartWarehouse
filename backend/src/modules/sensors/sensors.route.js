const express = require("express");
const sensorsController = require("./sensors.controller");

const router = express.Router();

router.get("/", sensorsController.getSensors);
router.get("/:id", sensorsController.getSensorById);
router.post("/", sensorsController.postSensor);
router.patch("/:id", sensorsController.updateSensor);

module.exports = router;

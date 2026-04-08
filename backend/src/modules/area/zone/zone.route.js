const express = require("express");
const zoneController = require("./zone.controller");

const router = express.Router();

router.get("/", zoneController.getZones);
router.post("/", zoneController.postZone);
router.patch("/:id", zoneController.patchZone);
router.delete("/:id", zoneController.removeZone);

module.exports = router;

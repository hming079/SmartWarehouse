const express = require("express");
const devicesController = require("./devices.controller");

const router = express.Router();

router.get("/", devicesController.getDevices);
router.get("/:id", devicesController.getDeviceById);
router.post("/", devicesController.postDevice);
router.post("/:id/command", devicesController.sendDeviceCommand);
router.patch("/:id", devicesController.patchDevice);
router.delete("/:id", devicesController.removeDevice);
router.patch("/:id/toggle", devicesController.patchToggleDevice);

module.exports = router;

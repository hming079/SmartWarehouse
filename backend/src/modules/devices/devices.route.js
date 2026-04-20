const express = require("express");
const devicesController = require("./devices.controller");

const router = express.Router();

router.get("/", devicesController.getDevices);
router.get("/logs/history", devicesController.getDeviceLogs);
router.get("/:id", devicesController.getDeviceById);
router.post("/", devicesController.postDevice);
router.patch("/:id", devicesController.patchDevice);
router.delete("/:id", devicesController.removeDevice);
router.patch("/:id/toggle", devicesController.patchToggleDevice);

module.exports = router;

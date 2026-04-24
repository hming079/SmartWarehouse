const express = require("express");
const devicesController = require("./devices.controller");

const router = express.Router();

router.get("/", devicesController.getDevices);
router.get("/logs/history", devicesController.getDeviceLogs);
router.get("/:id", devicesController.getDeviceById);
router.post("/", devicesController.postDevice);
router.post("/:id/command", devicesController.sendDeviceCommand);
router.patch("/:id", devicesController.patchDevice);
router.delete("/:id", devicesController.removeDevice);
router.patch("/:id/toggle", devicesController.patchToggleDevice);

// Expose search endpoints
router.get("/search/by-room", devicesController.searchDevicesbyRooms);
router.get("/search/by-type", devicesController.searchDevicesbyType);

module.exports = router;

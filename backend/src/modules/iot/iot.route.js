const express = require("express");
const iotController = require("./iot.controller");

const router = express.Router();

router.get("/data", iotController.getData);
router.post("/control", iotController.controlDevice);
router.post("/sync", iotController.syncCoreIotToDb);
router.post("/rooms/:roomId/switches", iotController.registerSwitch);

module.exports = router;

const express = require("express");
const iotController = require("./iot.controller");

const router = express.Router();

router.get("/data", iotController.getData);
router.post("/control", iotController.controlDevice);

module.exports = router;

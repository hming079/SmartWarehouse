const express = require("express");
const alertsController = require("./alerts.controller");

const router = express.Router();

router.get("/", alertsController.getAlerts);
router.get("/:id", alertsController.getAlertById);
router.patch("/:id/ack", alertsController.patchAcknowledgeAlert);
router.patch("/:id/resolve", alertsController.patchResolveAlert);
router.post("/:id/assign", alertsController.postAssignAlert);

module.exports = router;

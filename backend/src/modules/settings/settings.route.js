const express = require("express");
const settingsController = require("./settings.controller");

const router = express.Router();

router.get("/", settingsController.getSystemSettings);
router.patch("/", settingsController.patchSystemSettings);
router.get(
  "/notification-channels",
  settingsController.getNotificationChannels,
);
router.patch("/integration", settingsController.patchIntegrationSettings);

module.exports = router;

const express = require("express");
const automationController = require("./automation.controller");

const router = express.Router();

router.get("/", automationController.getRules);
router.post("/", automationController.postRule);
router.patch("/:id/toggle", automationController.patchToggleRule);
router.delete("/:id", automationController.removeRule);

module.exports = router;

const express = require("express");
const automationController = require("./automation.controller");
const thresholdsController = require("./thresholds.controller");

const router = express.Router();

router.get("/", automationController.getRules);
router.post("/", automationController.postRule);
router.patch("/:id/toggle", automationController.patchToggleRule);
router.patch("/:id", automationController.patchUpdateRule);
router.delete("/:id", automationController.removeRule);

router.get("/thresholds", thresholdsController.getThresholds);
router.post("/thresholds", thresholdsController.postThreshold);
router.patch("/thresholds/:id", thresholdsController.patchThreshold);
router.delete("/thresholds/:id", thresholdsController.deleteThreshold);

module.exports = router;
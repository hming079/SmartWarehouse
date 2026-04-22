const express = require("express");
const roomController = require("./room.controller");

const router = express.Router();

router.get("/", roomController.getRooms);
router.get("/:id/metrics", roomController.getRoomMetrics);
router.get("/:id/summary", roomController.getRoomSummary);
router.post("/", roomController.postRoom);
router.patch("/:id", roomController.patchRoom);
router.delete("/:id", roomController.removeRoom);

module.exports = router;

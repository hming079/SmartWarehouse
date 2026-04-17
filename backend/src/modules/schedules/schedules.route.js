const express = require("express");
const schedulesController = require("./schedules.controller");

const router = express.Router();

router.get("/devices", schedulesController.getScheduleDevices);
router.get("/", schedulesController.getSchedules);
router.post("/", schedulesController.postSchedule);
router.patch("/:id", schedulesController.patchSchedule);
router.patch("/:id/toggle", schedulesController.patchToggleSchedule);
router.delete("/:id", schedulesController.removeSchedule);

module.exports = router;

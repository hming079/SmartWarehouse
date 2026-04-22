const express = require("express");
const schedulesController = require("./schedules.controller");

const router = express.Router();

router.get("/list", schedulesController.getSchedules);
router.post("/create", schedulesController.postSchedule);
router.patch("/:id/update", schedulesController.patchSchedule);
router.patch("/:id/toggle", schedulesController.patchToggleSchedule);
router.delete("/:id/delete", schedulesController.removeSchedule);

module.exports = router;

const express = require("express");
const floorController = require("./floor.controller");

const router = express.Router();

router.get("/", floorController.getFloors);
router.post("/", floorController.postFloor);
router.patch("/:id", floorController.patchFloor);
router.delete("/:id", floorController.removeFloor);

module.exports = router;

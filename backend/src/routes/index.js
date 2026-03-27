const express = require("express");
const userRoutes = require("../modules/user/user.route");
const zoneRoutes = require("./zone.routes");
const floorRoutes = require("./floor.routes");
const roomRoutes = require("./room.routes");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/zones", zoneRoutes);
router.use("/floors", floorRoutes);
router.use("/rooms", roomRoutes);

module.exports = router;

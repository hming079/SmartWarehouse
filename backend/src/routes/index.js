const express = require("express");
const userRoutes = require("../modules/user/user.route");
const zoneRoutes = require("./zone.routes");
const floorRoutes = require("./floor.routes");
const roomRoutes = require("./room.routes");
const automationRoutes = require("./automation.routes");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/zones", zoneRoutes);
router.use("/floors", floorRoutes);
router.use("/rooms", roomRoutes);
router.use("/automation", automationRoutes);

module.exports = router;

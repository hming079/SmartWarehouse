const express = require("express");
const userRoutes = require("../modules/user/user.route");
const iotRoutes = require("../modules/iot/iot.route");
const devicesRoutes = require("../modules/devices/devices.route");
const alertsRoutes = require("../modules/alerts/alerts.route");
const schedulesRoutes = require("../modules/schedules/schedules.route");
const dashboardRoutes = require("../modules/dashboard/dashboard.route");
const auditLogRoutes = require("../modules/audit-log/audit-log.route");
const settingsRoutes = require("../modules/settings/settings.route");
const zoneRoutes = require("../modules/area/zone/zone.route");
const floorRoutes = require("../modules/area/floor/floor.route");
const roomRoutes = require("../modules/area/room/room.route");
const foodTypeRoutes = require("../modules/area/food-type/food-type.route");
const automationRoutes = require("../modules/automation/automation.route");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/devices", devicesRoutes);
router.use("/alerts", alertsRoutes);
router.use("/schedules", schedulesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/settings", settingsRoutes);
router.use("/zones", zoneRoutes);
router.use("/floors", floorRoutes);
router.use("/rooms", roomRoutes);
router.use("/food-types", foodTypeRoutes);
router.use("/automation", automationRoutes);
router.use("/iot", iotRoutes);

module.exports = router;

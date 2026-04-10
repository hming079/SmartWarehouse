const userRoutes = require("./user/user.route");
const iotRoutes = require("./iot/iot.route");
const devicesRoutes = require("./devices/devices.route");
const alertsRoutes = require("./alerts/alerts.route");
const schedulesRoutes = require("./schedules/schedules.route");
const dashboardRoutes = require("./dashboard/dashboard.route");
const auditLogRoutes = require("./audit-log/audit-log.route");
const settingsRoutes = require("./settings/settings.route");
const zoneRoutes = require("./area/zone/zone.route");
const floorRoutes = require("./area/floor/floor.route");
const roomRoutes = require("./area/room/room.route");
const automationRoutes = require("./automation/automation.route");

module.exports = {
  userRoutes,
  iotRoutes,
  devicesRoutes,
  alertsRoutes,
  schedulesRoutes,
  dashboardRoutes,
  auditLogRoutes,
  settingsRoutes,
  zoneRoutes,
  floorRoutes,
  roomRoutes,
  automationRoutes,
};

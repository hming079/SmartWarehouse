const express = require("express");
const dashboardController = require("./dashboard.controller");

const router = express.Router();

router.get("/overview", dashboardController.getDashboardOverview);
router.get("/timeseries", dashboardController.getDashboardTimeseries);
router.get("/device-status", dashboardController.getDashboardDeviceStatus);
router.get("/alerts-summary", dashboardController.getDashboardAlertsSummary);

module.exports = router;

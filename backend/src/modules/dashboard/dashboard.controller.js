const dashboardService = require("./dashboard.service");

async function getDashboardOverview(req, res, next) {
  try {
    const data = await dashboardService.getOverview();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function getDashboardTimeseries(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const data = await dashboardService.getTimeseries({
      roomId,
      metric: req.query.metric,
      range: req.query.range,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function getDashboardDeviceStatus(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const data = await dashboardService.getDeviceStatus({ roomId });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function getDashboardAlertsSummary(req, res, next) {
  try {
    const data = await dashboardService.getAlertsSummary({
      range: req.query.range,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardOverview,
  getDashboardTimeseries,
  getDashboardDeviceStatus,
  getDashboardAlertsSummary,
};

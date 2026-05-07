const alertsService = require("./alerts.service");

async function getAlerts(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const status = req.query.status || "all";
    const severity = req.query.severity || "all";
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const data = await alertsService.listAlerts({
      roomId,
      status,
      severity,
      page,
      pageSize,
    });
    res.json({
      ok: true,
      data: data.items,
      meta: {
        ...data.filters,
        total: data.total,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAlertById(req, res, next) {
  try {
    const data = await alertsService.getAlertById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchAcknowledgeAlert(req, res, next) {
  try {
    const data = await alertsService.acknowledgeAlert(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchResolveAlert(req, res, next) {
  try {
    const data = await alertsService.resolveAlert(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchToggleResolveAlert(req, res, next) {
  try {
    const data = await alertsService.toggleResolveAlert(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function postAssignAlert(req, res, next) {
  try {
    const data = await alertsService.assignAlert(req.params.id, req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAlerts,
  getAlertById,
  patchAcknowledgeAlert,
  patchResolveAlert,
  patchToggleResolveAlert,
  postAssignAlert,
};

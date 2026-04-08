const schedulesService = require("./schedules.service");

async function getSchedules(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;
    const active =
      req.query.active === undefined
        ? undefined
        : ["1", "true", "on"].includes(String(req.query.active).toLowerCase());
    const data = await schedulesService.listSchedules({
      roomId,
      deviceId,
      active,
    });
    res.json({ ok: true, data: data.items, meta: data.filters });
  } catch (error) {
    next(error);
  }
}

async function postSchedule(req, res, next) {
  try {
    const data = await schedulesService.createSchedule(req.body || {});
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchSchedule(req, res, next) {
  try {
    const data = await schedulesService.updateSchedule(
      req.params.id,
      req.body || {},
    );
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function removeSchedule(req, res, next) {
  try {
    const data = await schedulesService.deleteSchedule(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchToggleSchedule(req, res, next) {
  try {
    const data = await schedulesService.toggleSchedule(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSchedules,
  postSchedule,
  patchSchedule,
  removeSchedule,
  patchToggleSchedule,
};

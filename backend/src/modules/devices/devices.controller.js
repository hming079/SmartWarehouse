const devicesService = require("./devices.service");

async function getDevices(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const data = await devicesService.listDevices({ roomId });
    res.json({ ok: true, data: data.items, meta: data.filters });
  } catch (error) {
    next(error);
  }
}

async function getDeviceById(req, res, next) {
  try {
    const data = await devicesService.getDeviceById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function postDevice(req, res, next) {
  try {
    const data = await devicesService.createDevice(req.body || {});
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchDevice(req, res, next) {
  try {
    const data = await devicesService.updateDevice(
      req.params.id,
      req.body || {},
    );
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function removeDevice(req, res, next) {
  try {
    const data = await devicesService.deleteDevice(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchToggleDevice(req, res, next) {
  try {
    const data = await devicesService.toggleDevice(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function getDeviceLogs(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const data = await devicesService.getDeviceLogs({ roomId, page, pageSize });
    res.json({ ok: true, data: data.items, meta: { page, pageSize, roomId } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDevices,
  getDeviceById,
  postDevice,
  patchDevice,
  removeDevice,
  patchToggleDevice,
  getDeviceLogs,
};

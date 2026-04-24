const actionLogger = require("../action-logger/action-logger.service");
const devicesService = require("./devices.service");

async function getDevices(req, res, next) {
  try {
    const rawIsInstalled = req.query.isInstalled ?? req.query.is_installed;

    let isInstalled = null;
    if (rawIsInstalled !== undefined && rawIsInstalled !== null) {
      const normalized = String(rawIsInstalled).trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        isInstalled = true;
      } else if (normalized === "false" || normalized === "0") {
        isInstalled = false;
      } else {
        return res.status(400).json({
          ok: false,
          error: "isInstalled must be true/false/1/0",
        });
      }
    }

    const filters = {
      zoneId: req.query.zoneId ? Number(req.query.zoneId) : null,
      floorId: req.query.floorId ? Number(req.query.floorId) : null,
      roomId: req.query.roomId ? Number(req.query.roomId) : null,
      type: req.query.type || null,
      status: req.query.status || null,
      mode:
        req.query.controlMode ||
        req.query.control_mode ||
        req.query.mode ||
        null,
      isInstalled,
      search: req.query.search || null,
    };

    const pagination = {
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.max(1, Number(req.query.limit) || 10),
    };

    const data = await devicesService.listDevices(filters, pagination);

    res.json({
      ok: true,
      data: data.items,
      meta: {
        filters,
        pagination: data.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function postDevice(req, res, next) {
  try {
    const data = await devicesService.createDevice(req.body || {});
    await actionLogger.logAction({
      code: "CREATE_DEVICE",
      name: "Create Device",
      targetType: "DEVICE",
      targetId: data.device_id,
      newValue: req.body || {},
      actorUserId: req.user?.user_id,
    });
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function sendDeviceCommand(req, res, next) {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Device ID must be a positive integer" });
    }

    const command =
      req.body?.command ||
      req.body?.action ||
      req.body?.state ||
      req.body?.status;

    const data = await devicesService.executeCommand(deviceId, command);
    res.status(202).json({
      ok: true,
      message: "Command accepted and queued for device acknowledgement",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceById(req, res, next) {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Device ID must be a positive integer" });
    }

    const data = await devicesService.getDeviceById(deviceId);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchDevice(req, res, next) {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Device ID must be a positive integer" });
    }

    const data = await devicesService.updateDevice(deviceId, req.body || {});
    await actionLogger.logAction({
      code: "UPDATE_DEVICE",
      name: "Update Device",
      targetType: "DEVICE",
      targetId: deviceId,
      newValue: req.body || {},
      actorUserId: req.user?.user_id,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function removeDevice(req, res, next) {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Device ID must be a positive integer" });
    }

    const data = await devicesService.deleteDevice(deviceId);
    await actionLogger.logAction({
      code: "DELETE_DEVICE",
      name: "Delete Device",
      targetType: "DEVICE",
      targetId: deviceId,
      actorUserId: req.user?.user_id,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchToggleDevice(req, res, next) {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Device ID must be a positive integer" });
    }

    const data = await devicesService.toggleDevice(deviceId);
    res.status(202).json({
      ok: true,
      message: "Toggle command accepted and queued for device acknowledgement",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function searchDevicesbyRooms(req, res, next) {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const data = await devicesService.listDevices(
      { roomId },
      { page: 1, limit: 100 },
    );
    res.json({
      ok: true,
      data: data.items,
      meta: {
        filters: { roomId },
        pagination: data.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function searchDevicesbyType(req, res, next) {
  try {
    const type = req.query.type || null;
    const data = await devicesService.listDevices(
      { type },
      { page: 1, limit: 100 },
    );
    res.json({
      ok: true,
      data: data.items,
      meta: {
        filters: { type },
        pagination: data.pagination,
      },
    });
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
  sendDeviceCommand,
  searchDevicesbyRooms,
  searchDevicesbyType,
};

const iotService = require("./iot.service");

function resolveError(err) {
  return {
    status: err?.status || err?.response?.status || 500,
    message:
      err?.response?.data?.message ||
      err?.message ||
      "Internal Server Error",
  };
}

async function getData(req, res) {
  try {
    const result = await iotService.getData();
    res.json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("GET /api/iot/data failed:", message);
    res.status(status).json({ ok: false, error: message });
  }
}

async function controlDevice(req, res) {
  try {
    const result = await iotService.controlDevice(req.body || {});
    res.json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("POST /api/iot/control failed:", {
      status,
      message,
      headers: err?.response?.headers,
      data: err?.response?.data,
    });
    res.status(status).json({ ok: false, error: message });
  }
}

async function syncCoreIotToDb(req, res) {
  try {
    const roomId = req?.body?.roomId ?? req?.query?.roomId;
    const result = await iotService.syncCoreIotToDb({ roomId });
    res.json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("POST /api/iot/sync failed:", {
      status,
      message,
      data: err?.response?.data,
    });
    res.status(status).json({ ok: false, error: message });
  }
}

async function registerSwitch(req, res) {
  try {
    const roomId = req?.params?.roomId;
    const result = await iotService.registerSwitch({ roomId, ...(req.body || {}) });
    res.status(201).json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("POST /api/iot/rooms/:roomId/switches failed:", {
      status,
      message,
      data: err?.response?.data,
    });
    res.status(status).json({ ok: false, error: message });
  }
}

module.exports = {
  getData,
  controlDevice,
  syncCoreIotToDb,
  registerSwitch,
};

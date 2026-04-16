const iotService = require("./iot.service");

function toBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on", "debug"].includes(normalized);
}

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
    const roomId = req?.query?.roomId ?? req?.body?.roomId ?? req?.body?.room_id;
    const debug = toBooleanFlag(req?.query?.debug ?? req?.body?.debug);
    const result = await iotService.getData({ roomId, debug });
    res.json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("GET /api/iot/data failed:", message);
    res.status(status).json({ ok: false, error: message });
  }
}

async function getDebugConfig(req, res) {
  try {
    const result = await iotService.getDebugConfig();
    res.json(result);
  } catch (err) {
    const { status, message } = resolveError(err);
    console.error("GET /api/iot/debug failed:", message);
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
    const roomId = req?.params?.roomId ?? req?.body?.roomId ?? req?.body?.room_id;
    const result = await iotService.registerSwitch({ ...(req.body || {}), roomId });
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
  getDebugConfig,
  controlDevice,
  syncCoreIotToDb,
  registerSwitch,
};

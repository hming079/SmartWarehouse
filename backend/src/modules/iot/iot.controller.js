const iotService = require("./iot.service");
const { sql, getPool } = require("../../../db");

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
    
    // Insert into dbs
    

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

module.exports = {
  getData,
  controlDevice,
};

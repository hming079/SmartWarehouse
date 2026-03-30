const axios = require("axios");

const BASE_URL = (process.env.TB_BASE_URL || "https://app.coreiot.io").replace(/\/+$/, "");
const TB_USERNAME = process.env.TB_USERNAME;
const TB_PASSWORD = process.env.TB_PASSWORD;
const TB_DEVICE_TOKEN = process.env.TB_DEVICE_TOKEN;

const DEFAULT_TELEMETRY_KEYS = [
  "temperature",
  "humidity",
  "fan_on",
  "dryer_on",
  "cooler_on",
  "coreiot_connected",
];

const DEFAULT_SWITCH_DEFS = [
  { key: "fan_on", name: "Fan", type: "fan" },
  { key: "dryer_on", name: "Dryer", type: "dryer" },
  { key: "cooler_on", name: "Cooling", type: "ac" },
];

let token = "";

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateEnv() {
  if (!TB_USERNAME || !TB_PASSWORD) {
    throw createHttpError("Missing TB_USERNAME or TB_PASSWORD in environment", 500);
  }
}

function getAuthHeaders() {
  return {
    "X-Authorization": `Bearer ${token}`,
  };
}

async function login() {
  if (process.env.TB_TOKEN) {
    token = process.env.TB_TOKEN;
    return;
  }

  validateEnv();

  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: TB_USERNAME,
    password: TB_PASSWORD,
  });

  if (!res.data || !res.data.token) {
    throw createHttpError("Login succeeded but token is missing", 500);
  }

  token = res.data.token;
}

async function requestWithAutoRelogin(requestFn) {
  try {
    return await requestFn();
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401) {
      await login();
      return requestFn();
    }
    throw err;
  }
}

async function getDeviceId() {
  const res = await requestWithAutoRelogin(() =>
    axios.get(`${BASE_URL}/api/tenant/devices?pageSize=10&page=0`, {
      headers: getAuthHeaders(),
    }),
  );

  const devices = res?.data?.data || [];
  if (devices.length === 0) {
    throw createHttpError("No devices found for this tenant", 404);
  }

  return devices[0].id.id;
}

async function getTelemetry(deviceId) {
  const keys = DEFAULT_TELEMETRY_KEYS.join(",");
  const url = `${BASE_URL}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys}`;

  const res = await requestWithAutoRelogin(() =>
    axios.get(url, {
      headers: getAuthHeaders(),
    }),
  );

  return res.data;
}

function getLatestTelemetryValue(data, key) {
  const value = data?.[key]?.[0]?.value;
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).trim().toLowerCase();
}

function isOnValue(rawValue) {
  if (!rawValue) return false;
  const lower = String(rawValue).toLowerCase().trim();
  return ["1", "true", "on", "active", "enabled", "open"].includes(lower);
}

function toSwitchType(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.includes("light")) return "lights";
  if (lower.includes("ac") || lower.includes("cool") || lower.includes("air")) return "ac";
  if (lower.includes("fridge") || lower.includes("cold")) return "fridge";
  if (lower.includes("temp")) return "temperature";
  if (lower.includes("humid")) return "humidity";
  return lower;
}

function formatSwitchName(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function extractSwitchStates(data) {
  const ignored = new Set(["temperature", "humidity"]);
  const result = [];
  const seenKeys = new Set();

  Object.keys(data || {}).forEach((key) => {
    const raw = getLatestTelemetryValue(data, key);
    const lowerKey = String(key).toLowerCase();
    if (ignored.has(lowerKey)) {
      return;
    }

    const looksLikeSwitchKey =
      lowerKey.includes("switch") ||
      lowerKey.includes("relay") ||
      lowerKey.includes("power") ||
      lowerKey.includes("status") ||
      lowerKey.includes("fan") ||
      lowerKey.includes("ac") ||
      lowerKey.includes("dryer") ||
      lowerKey.includes("light") ||
      lowerKey.includes("dehumid") ||
      lowerKey.includes("cool") ||
      lowerKey.includes("heat") ||
      lowerKey.includes("vent");

    const looksLikeBinaryValue =
      raw === "0" ||
      raw === "1" ||
      raw === "true" ||
      raw === "false" ||
      raw === "on" ||
      raw === "off" ||
      raw === "active" ||
      raw === "inactive";

    if (!looksLikeSwitchKey) {
      return;
    }

    if (raw && !looksLikeBinaryValue) {
      return;
    }

    seenKeys.add(lowerKey);

    const status = raw ? (isOnValue(raw) ? "ON" : "OFF") : "OFF";
    result.push({
      key,
      name: formatSwitchName(key),
      type: toSwitchType(key),
      status,
      raw: raw || null,
    });
  });

  DEFAULT_SWITCH_DEFS.forEach((item) => {
    if (seenKeys.has(item.key)) {
      return;
    }

    result.push({
      key: item.key,
      name: item.name,
      type: item.type,
      status: "OFF",
      raw: null,
    });
  });

  return result;
}

function resolveDeviceStatus(data) {
  const rawStatus =
    getLatestTelemetryValue(data, "relayState") ??
    getLatestTelemetryValue(data, "switch") ??
    getLatestTelemetryValue(data, "power") ??
    getLatestTelemetryValue(data, "status");

  if (!rawStatus) {
    return "OFF";
  }

  if (isOnValue(rawStatus)) {
    return "ON";
  }

  return "OFF";
}

async function getData() {
  if (!token) {
    await login();
  }

  const deviceId = await getDeviceId();
  const data = await getTelemetry(deviceId);

  return {
    ok: true,
    deviceId,
    data,
    deviceStatus: resolveDeviceStatus(data),
    switches: extractSwitchStates(data),
  };
}

async function controlDevice({ key, value }) {
  if (!key || value === undefined) {
    throw createHttpError("Missing key or value", 400);
  }

  if (!TB_DEVICE_TOKEN) {
    throw createHttpError("Missing TB_DEVICE_TOKEN in environment", 500);
  }

  const url = `${BASE_URL}/api/v1/${TB_DEVICE_TOKEN}/telemetry`;
  const payload = { [key]: value };

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return {
    ok: true,
    message: `Control sent: ${key}=${value}`,
    data: response.data,
  };
}

module.exports = {
  getData,
  controlDevice,
};

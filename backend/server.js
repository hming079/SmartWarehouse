const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const routeV1 = require("./src/routes");
const corsConfig = require("./src/config/cors");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
app.use((req, res, next) => {
  console.log("---- REQUEST ----");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("-----------------");
  next();
});
app.use(express.json());
app.use(
  cors(corsConfig),
);
const PORT = Number(process.env.PORT) || 5001;
const BASE_URL = (process.env.TB_BASE_URL || "https://app.coreiot.io").replace(
  /\/+$/,
  "",
);
const TB_USERNAME = process.env.TB_USERNAME;
const TB_PASSWORD = process.env.TB_PASSWORD;

const DEFAULT_TELEMETRY_KEYS = [
  "temperature",
  "humidity",
  // "power",
  // "status",
  // "switch",
  // "relayState",
  "fan_on",
  // "ac",
  "dryer_on",
  // "dehumidifier",
  // "light",
  // "lights",
  "cooler_on",
  // "heating",
  // "ventilation",
  "coreiot_connected",
];

const DEFAULT_SWITCH_DEFS = [
  { key: "fan_on", name: "Fan", type: "fan" },
  // { key: "ac", name: "Air Conditioner", type: "ac" },
  { key: "dryer_on", name: "Dryer", type: "dryer" },
  // { key: "dehumidifier", name: "Dehumidifier", type: "dehumidifier" },
  // { key: "light", name: "Light", type: "lights" },
  // { key: "lights", name: "Lights", type: "lights" },
  { key: "cooler_on", name: "Cooling", type: "ac" },
  // { key: "heating", name: "Heating", type: "ac" },
  // { key: "ventilation", name: "Ventilation", type: "fan" },
];

let token = "";

function validateEnv() {
  if (!TB_USERNAME || !TB_PASSWORD) {
    throw new Error("Missing TB_USERNAME or TB_PASSWORD in environment");
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
    console.log("Using token from .env");
    return;
  }

  validateEnv();

  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: TB_USERNAME,
    password: TB_PASSWORD,
  });

  if (!res.data || !res.data.token) {
    throw new Error("Login succeeded but token is missing");
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
    throw new Error("No devices found for this tenant");
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

    // Keep likely binary control keys only.
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
      raw === "0" || raw === "1" || raw === "true" || raw === "false" || raw === "on" || raw === "off" || raw === "active" || raw === "inactive";

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

app.get("/data", async (req, res) => {
  try {
    if (!token) {
      await login();
    }

    const deviceId = await getDeviceId();
    const data = await getTelemetry(deviceId);
    const deviceStatus = resolveDeviceStatus(data);
    const switches = extractSwitchStates(data);

    res.json({
      ok: true,
      deviceId,
      data,
      deviceStatus,
      switches,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const message =
      err?.response?.data?.message || err.message || "Internal Server Error";

    console.error("GET /data failed:", message);
    res.status(status).json({ ok: false, error: message });
  }
});

// Control telemetry of server
app.post("/control", async (req, res) => {
  try {
    if (!token) {
      await login();
    }
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ ok: false, error: "Missing key or value" });
    }

    const deviceId = await getDeviceId();
    const device_token = process.env.TB_DEVICE_TOKEN; 
    // Try Device Telemetry API with attributes update
    const url = `${BASE_URL}/api/v1/${device_token}/telemetry`;
    
    const payload = { [key]: value };

    console.log(`Sending Control:`, { url, payload, key, value });

    const response = await requestWithAutoRelogin(() =>
      axios.post(url, payload, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }),
    );

    console.log(`Control sent: ${key}=${value}`, response.data);
    res.json({
      ok: true,
      message: `Control sent: ${key}=${value}`,
      data: response.data,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const message =
      err?.response?.data?.message || err.message || "Internal Server Error";

    console.error("POST /control failed:", {
      status,
      message,
      headers: err?.response?.headers,
      data: err?.response?.data,
    });
    res.status(status).json({ ok: false, error: message });
  }
});

app.use("/api", routeV1);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

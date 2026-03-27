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
  const keys = "temperature,humidity";
  const url = `${BASE_URL}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys}`;

  const res = await requestWithAutoRelogin(() =>
    axios.get(url, {
      headers: getAuthHeaders(),
    }),
  );

  return res.data;
}

app.get("/data", async (req, res) => {
  try {
    if (!token) {
      await login();
    }

    const deviceId = await getDeviceId();
    const data = await getTelemetry(deviceId);

    res.json({
      ok: true,
      deviceId,
      data,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const message =
      err?.response?.data?.message || err.message || "Internal Server Error";

    console.error("GET /data failed:", message);
    res.status(status).json({ ok: false, error: message });
  }
});

app.use("/api", routeV1);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

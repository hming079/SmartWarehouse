const axios = require("axios");
const { sql, getPool } = require("../../../db");

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

const SWITCH_LABELS = {
  fan_on: "Fan",
  cooler_on: "Cooler",
  dryer_on: "Dryer",
};

let token = "";
const customSwitchDefs = [];

function sanitizeSwitchKey(rawKey) {
  const normalized = String(rawKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, "")
    .replace(/[\s\-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw createHttpError("Invalid switch key", 400);
  }

  return normalized;
}

function normalizeSwitchType(rawType, key) {
  const resolved = String(rawType || key || "").trim().toLowerCase();
  if (!resolved) {
    return "switch";
  }
  return toSwitchType(resolved);
}

function getAllSwitchDefs(roomId) {
  const normalizedRoomId = Number(roomId);
  const roomCustomDefs = Number.isInteger(normalizedRoomId)
    ? customSwitchDefs.filter((item) => item.roomId === normalizedRoomId)
    : customSwitchDefs;

  return [...DEFAULT_SWITCH_DEFS, ...roomCustomDefs];
}

function buildTelemetryKeys(roomId) {
  const dynamicKeys = getAllSwitchDefs(roomId).map((item) => item.key);
  return Array.from(new Set([...DEFAULT_TELEMETRY_KEYS, ...dynamicKeys]));
}

function buildSwitchKey(roomId, type) {
  const safeType = sanitizeSwitchKey(type || "switch");
  const sameRoomTypeCount = customSwitchDefs.filter(
    (item) => item.roomId === roomId && item.type === safeType,
  ).length;
  const nextIndex = sameRoomTypeCount + 1;
  return `${safeType}_${roomId}_${nextIndex}`;
}

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

async function getTelemetry(deviceId, roomId) {
  const keys = buildTelemetryKeys(roomId).join(",");
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

function getLatestTelemetryEntry(data, key) {
  const rawEntry = data?.[key]?.[0];
  if (!rawEntry || rawEntry.value === undefined || rawEntry.value === null) {
    return null;
  }

  const ts = Number(rawEntry.ts);
  return {
    value: rawEntry.value,
    ts: Number.isFinite(ts) ? ts : Date.now(),
  };
}

function normalizeRoomId(rawRoomId) {
  const roomId = Number(rawRoomId ?? process.env.IOT_DEFAULT_ROOM_ID);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw createHttpError(
      "Missing or invalid roomId. Provide roomId in request or IOT_DEFAULT_ROOM_ID in environment.",
      400,
    );
  }

  return roomId;
}

function getConfiguredIotRoomId() {
  const value = Number(process.env.IOT_DEFAULT_ROOM_ID);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isConfiguredIotRoom(roomId) {
  const configuredRoomId = getConfiguredIotRoomId();
  if (!configuredRoomId) {
    return true;
  }
  return Number(roomId) === configuredRoomId;
}

async function resolveSyncRoomId(rawRoomId, pool) {
  if (rawRoomId !== undefined && rawRoomId !== null && rawRoomId !== "") {
    return normalizeRoomId(rawRoomId);
  }

  if (process.env.IOT_DEFAULT_ROOM_ID) {
    return normalizeRoomId(process.env.IOT_DEFAULT_ROOM_ID);
  }

  const result = await new sql.Request(pool).query(
    "SELECT TOP 1 room_id FROM dbo.Rooms ORDER BY room_id ASC",
  );

  const roomId = result?.recordset?.[0]?.room_id;
  if (!Number.isInteger(Number(roomId)) || Number(roomId) <= 0) {
    throw createHttpError(
      "No room available for IoT sync. Set IOT_DEFAULT_ROOM_ID or add a room in the database.",
      400,
    );
  }

  return Number(roomId);
}

function toUtcDate(ts) {
  const numericTs = Number(ts);
  if (!Number.isFinite(numericTs) || numericTs <= 0) {
    return new Date();
  }
  return new Date(numericTs);
}

function toFloatOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function ensureDeviceTypeColumn(transaction) {
  await new sql.Request(transaction).batch(`
    IF COL_LENGTH('dbo.Devices', 'device_type') IS NULL
    BEGIN
      ALTER TABLE dbo.Devices ADD device_type NVARCHAR(50) NULL;
    END;

    IF EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_Devices_Room_DeviceType'
        AND object_id = OBJECT_ID('dbo.Devices')
    )
    BEGIN
      DROP INDEX UX_Devices_Room_DeviceType ON dbo.Devices;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'IX_Devices_Room_DeviceType'
        AND object_id = OBJECT_ID('dbo.Devices')
    )
    BEGIN
      CREATE NONCLUSTERED INDEX IX_Devices_Room_DeviceType
      ON dbo.Devices (room_id, device_type)
      WHERE device_type IS NOT NULL;
    END;
  `);
}

async function ensureRoomExists(transaction, roomId) {
  const roomResult = await new sql.Request(transaction)
    .input("roomId", sql.Int, roomId)
    .query("SELECT TOP 1 room_id FROM dbo.Rooms WHERE room_id = @roomId");

  if (roomResult.recordset.length === 0) {
    throw createHttpError(`Room ${roomId} does not exist in database`, 404);
  }
}

async function upsertSensorAndInsertData({
  transaction,
  roomId,
  sensorType,
  sensorName,
  sensorValue,
  sensorUnit,
  sensorTimestamp,
}) {
  const sensorResult = await new sql.Request(transaction)
    .input("roomId", sql.Int, roomId)
    .input("sensorType", sql.NVarChar(20), sensorType)
    .input("sensorName", sql.NVarChar(255), sensorName).query(`
      DECLARE @sensorId INT;

      SELECT TOP 1 @sensorId = sensor_id
      FROM dbo.Sensors
      WHERE room_id = @roomId AND type = @sensorType
      ORDER BY sensor_id;

      IF @sensorId IS NULL
      BEGIN
        SELECT @sensorId = ISNULL(MAX(sensor_id), 0) + 1
        FROM dbo.Sensors WITH (UPDLOCK, HOLDLOCK);

        INSERT INTO dbo.Sensors (
          sensor_id,
          threshold_id,
          shedule_id,
          room_id,
          name,
          type,
          status,
          last_connection
        )
        VALUES (
          @sensorId,
          NULL,
          NULL,
          @roomId,
          @sensorName,
          @sensorType,
          'ACTIVE',
          SYSUTCDATETIME()
        );
      END
      ELSE
      BEGIN
        UPDATE dbo.Sensors
        SET name = @sensorName,
            status = 'ACTIVE',
            last_connection = SYSUTCDATETIME()
        WHERE sensor_id = @sensorId;
      END;

      SELECT @sensorId AS sensor_id;
    `);

  const sensorId = sensorResult.recordset[0].sensor_id;

  await new sql.Request(transaction)
    .input("sensorId", sql.Int, sensorId)
    .input("sensorValue", sql.Float, sensorValue)
    .input("sensorUnit", sql.NVarChar(20), sensorUnit)
    .input("sensorTimestamp", sql.DateTime2, sensorTimestamp).query(`
      DECLARE @sensorDataId BIGINT;

      SELECT @sensorDataId = ISNULL(MAX(sensor_data_id), 0) + 1
      FROM dbo.SensorData WITH (UPDLOCK, HOLDLOCK);

      INSERT INTO dbo.SensorData (
        sensor_data_id,
        sensor_id,
        value,
        unit,
        [timestamp]
      )
      VALUES (
        @sensorDataId,
        @sensorId,
        @sensorValue,
        @sensorUnit,
        @sensorTimestamp
      );
    `);

  return sensorId;
}

async function upsertDeviceAndInsertLog({
  transaction,
  roomId,
  deviceType,
  status,
}) {
  const result = await new sql.Request(transaction)
    .input("roomId", sql.Int, roomId)
    .input("deviceType", sql.NVarChar(50), deviceType)
    .input("status", sql.NVarChar(5), status).query(`
      DECLARE @deviceId INT;
      DECLARE @prevStatus NVARCHAR(5);
      DECLARE @logInserted BIT = 0;

      SELECT TOP 1
        @deviceId = device_id,
        @prevStatus = device_status
      FROM dbo.Devices
      WHERE room_id = @roomId AND device_type = @deviceType
      ORDER BY device_id;

      IF @deviceId IS NULL
      BEGIN
        INSERT INTO dbo.Devices (
          room_id,
          device_status,
          last_update_time,
          device_type
        )
        VALUES (
          @roomId,
          @status,
          SYSUTCDATETIME(),
          @deviceType
        );

        SET @deviceId = SCOPE_IDENTITY();
      END
      ELSE
      BEGIN
        UPDATE dbo.Devices
        SET device_status = @status,
            last_update_time = SYSUTCDATETIME()
        WHERE device_id = @deviceId;
      END;

      IF @prevStatus IS NULL OR @prevStatus <> @status
      BEGIN
        INSERT INTO dbo.DevicesLog (device_id, device_status)
        VALUES (@deviceId, @status);
        SET @logInserted = 1;
      END;

      SELECT @deviceId AS device_id, @logInserted AS log_inserted;
    `);

  return {
    deviceId: result.recordset[0].device_id,
    logInserted: Boolean(result.recordset[0].log_inserted),
  };
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

function formatSwitchName(key, switchDefs = getAllSwitchDefs()) {
  const matchedSwitchDef = switchDefs.find((item) => item.key === String(key || "").toLowerCase());
  if (matchedSwitchDef?.name) {
    return matchedSwitchDef.name;
  }

  const mappedLabel = SWITCH_LABELS[String(key || "").toLowerCase()];
  if (mappedLabel) {
    return mappedLabel;
  }

  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function extractSwitchStates(data, switchDefs = getAllSwitchDefs()) {
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

    const matchedSwitchDef = switchDefs.find((item) => item.key === lowerKey);
    const resolvedType = matchedSwitchDef?.type || toSwitchType(key);

    const status = raw ? (isOnValue(raw) ? "ON" : "OFF") : "OFF";
    result.push({
      key,
      name: formatSwitchName(key),
      type: resolvedType,
      status,
      raw: raw || null,
    });
  });

  switchDefs.forEach((item) => {
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

function registerSwitch({ roomId, room_id: roomIdAlt, type, key } = {}) {
  const normalizedRoomId = normalizeRoomId(roomId ?? roomIdAlt);
  const normalizedType = normalizeSwitchType(type, key);
  const normalizedKey = key
    ? sanitizeSwitchKey(key)
    : buildSwitchKey(normalizedRoomId, normalizedType);
  const normalizedName = formatSwitchName(normalizedKey, getAllSwitchDefs(normalizedRoomId));

  const existsInDefaults = DEFAULT_SWITCH_DEFS.some((item) => item.key === normalizedKey);
  const existsInCustom = customSwitchDefs.some(
    (item) => item.key === normalizedKey && item.roomId === normalizedRoomId,
  );
  if (existsInDefaults || existsInCustom) {
    throw createHttpError(`Switch key '${normalizedKey}' already exists`, 409);
  }

  const newSwitch = {
    roomId: normalizedRoomId,
    key: normalizedKey,
    name: normalizedName,
    type: normalizedType,
  };

  customSwitchDefs.push(newSwitch);

  return {
    ok: true,
    message: "Switch added",
    switch: newSwitch,
  };
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

async function getDevicesFromDb(pool, roomId) {
  const result = await new sql.Request(pool)
    .input("roomId", sql.Int, roomId)
    .query(`
      SELECT device_id, device_type, device_status, last_update_time
      FROM dbo.Devices
      WHERE room_id = @roomId
      ORDER BY device_id
    `);

  return result.recordset || [];
}

function mergeIotAndDbDevices(iotSwitches, dbDevices) {
  const iotKeysMap = new Set(iotSwitches.map((s) => String(s.key || "").toLowerCase()));
  const dbByKey = new Map(
    (dbDevices || []).map((item) => [String(item.device_type || "").toLowerCase(), item]),
  );
  const dbByTypeBuckets = new Map();
  (dbDevices || []).forEach((item) => {
    const bucketKey = String(toSwitchType(item.device_type || "")).toLowerCase();
    const bucket = dbByTypeBuckets.get(bucketKey) || [];
    bucket.push(item);
    dbByTypeBuckets.set(bucketKey, bucket);
  });
  const result = [];

  // Add IoT switches with isConnected: true
  iotSwitches.forEach((s) => {
    const normalizedKey = String(s.key || "").toLowerCase();
    let matchedDb = dbByKey.get(normalizedKey) || null;

    // Backward-compatible fallback for old rows that only stored generic type.
    if (!matchedDb) {
      const typeBucket = dbByTypeBuckets.get(String(s.type || "").toLowerCase()) || [];
      matchedDb = typeBucket.shift() || null;
      if (typeBucket.length === 0) {
        dbByTypeBuckets.delete(String(s.type || "").toLowerCase());
      } else {
        dbByTypeBuckets.set(String(s.type || "").toLowerCase(), typeBucket);
      }
    }

    result.push({
      ...s,
      deviceId: matchedDb?.device_id ?? null,
      deviceName: s.name || formatSwitchName(s.key),
      isConnected: true,
    });
  });

  // Add DB devices that are NOT in IoT with isConnected: false
  dbDevices.forEach((dbDevice) => {
    const dbKey = dbDevice.device_type || "";
    const dbKeyLower = String(dbKey).toLowerCase();

    // Skip if already in IoT
    if (iotKeysMap.has(dbKeyLower)) {
      return;
    }

    result.push({
      key: dbKey,
      name: formatSwitchName(dbKey),
      deviceName: formatSwitchName(dbKey),
      type: toSwitchType(dbKey),
      status: dbDevice.device_status === "ON" ? "ON" : "OFF",
      raw: dbDevice.device_status ? String(dbDevice.device_status).toLowerCase() : null,
      isConnected: false,
      deviceId: dbDevice.device_id,
    });
  });

  return result;
}

async function getData({ roomId: rawRoomId } = {}) {
  if (!token) {
    await login();
  }

  const pool = await getPool();
  const roomId = normalizeRoomId(rawRoomId);

  if (!isConfiguredIotRoom(roomId)) {
    const dbDevices = await getDevicesFromDb(pool, roomId);
    const mergedSwitches = mergeIotAndDbDevices([], dbDevices);

    return {
      ok: true,
      roomId,
      deviceId: null,
      data: {},
      deviceStatus: "OFF",
      switches: mergedSwitches,
      message: "Room is not connected to CoreIoT. Returning room-local DB devices only.",
    };
  }

  const deviceId = await getDeviceId();
  const data = await getTelemetry(deviceId, roomId);

  await syncCoreIotToDb({ roomId });

  const iotSwitches = extractSwitchStates(data, getAllSwitchDefs(roomId));
  const dbDevices = await getDevicesFromDb(pool, roomId);
  const mergedSwitches = mergeIotAndDbDevices(iotSwitches, dbDevices);

  return {
    ok: true,
    roomId,
    deviceId,
    data,
    deviceStatus: resolveDeviceStatus(data),
    switches: mergedSwitches,
  };
}

async function syncCoreIotToDb({ roomId: rawRoomId } = {}) {
  if (!token) {
    await login();
  }

  const pool = await getPool();
  const roomId = normalizeRoomId(rawRoomId);

  if (!isConfiguredIotRoom(roomId)) {
    return {
      ok: true,
      skipped: true,
      message: "Skip sync: selected room is not connected to CoreIoT.",
      summary: {
        roomId,
        deviceId: null,
        sensorsSaved: 0,
        sensorRowsInserted: 0,
        devicesSaved: 0,
        deviceLogsInserted: 0,
      },
    };
  }

  const deviceId = await getDeviceId();
  const data = await getTelemetry(deviceId, roomId);
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  const summary = {
    roomId,
    deviceId,
    sensorsSaved: 0,
    sensorRowsInserted: 0,
    devicesSaved: 0,
    deviceLogsInserted: 0,
  };

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
    transactionStarted = true;

    await ensureRoomExists(transaction, roomId);
    await ensureDeviceTypeColumn(transaction);

    const temperatureEntry = getLatestTelemetryEntry(data, "temperature");
    const humidityEntry = getLatestTelemetryEntry(data, "humidity");

    const temperatureValue = toFloatOrNull(temperatureEntry?.value);
    if (temperatureValue !== null) {
      await upsertSensorAndInsertData({
        transaction,
        roomId,
        sensorType: "TEMPERATURE",
        sensorName: "Temperature Sensor",
        sensorValue: temperatureValue,
        sensorUnit: "C",
        sensorTimestamp: toUtcDate(temperatureEntry?.ts),
      });
      summary.sensorsSaved += 1;
      summary.sensorRowsInserted += 1;
    }

    const humidityValue = toFloatOrNull(humidityEntry?.value);
    if (humidityValue !== null) {
      await upsertSensorAndInsertData({
        transaction,
        roomId,
        sensorType: "HUMIDITY",
        sensorName: "Humidity Sensor",
        sensorValue: humidityValue,
        sensorUnit: "%",
        sensorTimestamp: toUtcDate(humidityEntry?.ts),
      });
      summary.sensorsSaved += 1;
      summary.sensorRowsInserted += 1;
    }

    const switches = extractSwitchStates(data, getAllSwitchDefs(roomId));
    for (const item of switches) {
      const saveResult = await upsertDeviceAndInsertLog({
        transaction,
        roomId,
        // Store only the simple device type (e.g., "fan", "lights")
        deviceType: item.type,
        status: item.status === "ON" ? "ON" : "OFF",
      });
      summary.devicesSaved += 1;
      if (saveResult.logInserted) {
        summary.deviceLogsInserted += 1;
      }
    }

    await transaction.commit();

    return {
      ok: true,
      message: "CoreIoT data synced to database",
      summary,
    };
  } catch (err) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (_) {
        // Ignore rollback errors and preserve original error.
      }
    }
    throw err;
  }
}

function normalizeBooleanValue(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "on", "yes", "active", "enabled"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "off", "no", "inactive", "disabled"].includes(normalized)) {
    return false;
  }

  throw createHttpError("Invalid boolean value", 400);
}

function toRpcMethod(key) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  const map = {
    fan_on: "setFan",
    cooler_on: "setCooler",
    dryer_on: "setDryer",
  };

  const method = map[normalizedKey];
  if (!method) {
    throw createHttpError(`Unsupported control key: ${key}`, 400);
  }

  return method;
}

async function controlDevice({ key, value }) {
  if (!key || value === undefined) {
    throw createHttpError("Missing key or value", 400);
  }

  if (!TB_DEVICE_TOKEN) {
    throw createHttpError("Missing TB_DEVICE_TOKEN in environment", 500);
  }

  if (!token) {
    await login();
  }

  const method = toRpcMethod(key);
  const state = normalizeBooleanValue(value);
  const deviceId = await getDeviceId();
  const url = `${BASE_URL}/api/plugins/rpc/oneway/${deviceId}`;
  const payload = {
    method,
    params: {
      state,
    },
  };

  const response = await requestWithAutoRelogin(() =>
    axios.post(url, payload, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }),
  );

  return {
    ok: true,
    message: `RPC sent: ${method} -> ${state}`,
    data: response.data,
    rpc: payload,
  };
}

module.exports = {
  getData,
  controlDevice,
  syncCoreIotToDb,
  registerSwitch,
};

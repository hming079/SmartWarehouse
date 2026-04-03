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

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_Devices_Room_DeviceType'
        AND object_id = OBJECT_ID('dbo.Devices')
    )
    BEGIN
      CREATE UNIQUE NONCLUSTERED INDEX UX_Devices_Room_DeviceType
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
  const pool = await getPool();
  const roomId = await resolveSyncRoomId(undefined, pool);

  await syncCoreIotToDb({ roomId });

  return {
    ok: true,
    deviceId,
    data,
    deviceStatus: resolveDeviceStatus(data),
    switches: extractSwitchStates(data),
  };
}

async function syncCoreIotToDb({ roomId: rawRoomId } = {}) {
  if (!token) {
    await login();
  }

  const deviceId = await getDeviceId();
  const data = await getTelemetry(deviceId);

  const pool = await getPool();
  const roomId = await resolveSyncRoomId(rawRoomId, pool);
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

    const switches = extractSwitchStates(data);
    for (const item of switches) {
      const saveResult = await upsertDeviceAndInsertLog({
        transaction,
        roomId,
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
  syncCoreIotToDb,
};

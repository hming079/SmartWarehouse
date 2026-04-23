const { sql, getPool } = require("../../../db");
const iotService = require("../iot/iot.service");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeOnOff(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["ON", "1", "TRUE", "ENABLE"].includes(normalized)) {
    return "ON";
  }
  if (["OFF", "0", "FALSE", "DISABLE"].includes(normalized)) {
    return "OFF";
  }
  return null;
}

function normalizeTurnAction(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "TURN_ON") return "ON";
  if (normalized === "TURN_OFF") return "OFF";
  return null;
}

function normalizeControlMode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["MANUAL", "AUTO"].includes(normalized)) {
    return normalized;
  }
  return null;
}

function normalizeLifecycleStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(normalized)) {
    return normalized;
  }
  return null;
}

async function ensureControlModeColumn() {
  const pool = await getPool();
  await pool.request().batch(`
    IF COL_LENGTH('dbo.Devices', 'control_mode') IS NULL
    BEGIN
      ALTER TABLE dbo.Devices
      ADD control_mode NVARCHAR(10) NOT NULL
        CONSTRAINT DF_Devices_ControlMode DEFAULT ('MANUAL');
    END;
  `);
}

async function ensureLifecycleStatusColumn() {
  const pool = await getPool();
  await pool.request().batch(`
    IF COL_LENGTH('dbo.Devices', 'status') IS NULL
    BEGIN
      ALTER TABLE dbo.Devices
      ADD status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Devices_Status DEFAULT ('ACTIVE');
    END;
  `);
}

async function listDevices(filters = {}, pagination = { page: 1, limit: 20 }) {
  await ensureControlModeColumn();
  await ensureLifecycleStatusColumn();

  const pool = await getPool();
  const request = pool.request();
  const whereClauses = ["1=1"];

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Number(pagination.limit) || 20);
  const offset = (page - 1) * limit;

  if (Number.isInteger(filters.zoneId) && filters.zoneId > 0) {
    request.input("zoneId", sql.Int, filters.zoneId);
    whereClauses.push("z.zone_id = @zoneId");
  }

  if (Number.isInteger(filters.floorId) && filters.floorId > 0) {
    request.input("floorId", sql.Int, filters.floorId);
    whereClauses.push("f.floor_id = @floorId");
  }

  if (Number.isInteger(filters.roomId) && filters.roomId > 0) {
    request.input("roomId", sql.Int, filters.roomId);
    whereClauses.push("d.room_id = @roomId");
  }

  if (filters.type) {
    request.input("type", sql.NVarChar(50), String(filters.type).toUpperCase());
    whereClauses.push("UPPER(ISNULL(d.device_type, '')) = @type");
  }

  if (filters.status) {
    request.input(
      "status",
      sql.NVarChar(10),
      String(filters.status).toUpperCase(),
    );
    whereClauses.push("UPPER(ISNULL(d.device_status, '')) = @status");
  }

  if (filters.mode) {
    request.input("mode", sql.NVarChar(10), String(filters.mode).toUpperCase());
    whereClauses.push("UPPER(ISNULL(d.control_mode, 'MANUAL')) = @mode");
  }

  if (filters.isInstalled !== null && filters.isInstalled !== undefined) {
    const setupStatus = filters.isInstalled ? "ON" : "OFF";
    request.input("setup_status", sql.NVarChar(5), setupStatus);
    whereClauses.push("UPPER(ISNULL(d.setup_status, 'OFF')) = @setup_status");
  }

  if (filters.search) {
    request.input(
      "search",
      sql.NVarChar(255),
      `%${String(filters.search).trim()}%`,
    );
    whereClauses.push(
      "(d.device_name LIKE @search OR CAST(d.device_id AS NVARCHAR(32)) LIKE @search)",
    );
  }

  const whereClause = whereClauses.join(" AND ");

  const countResult = await request.query(`
    SELECT COUNT(*) AS total
    FROM dbo.Devices d
    LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
    LEFT JOIN dbo.Floor f ON f.floor_id = r.floor_id
    LEFT JOIN dbo.Zones z ON z.zone_id = f.zone_id
    WHERE ${whereClause}
  `);

  const totalItems = Number(countResult.recordset?.[0]?.total || 0);

  const result = await request.query(`
    SELECT
      d.device_id AS id,
      d.room_id,
      d.device_name AS name,
      d.device_type AS type,
      d.device_status AS status,
      ISNULL(d.status, 'ACTIVE') AS lifecycle_status,
      ISNULL(d.control_mode, 'MANUAL') AS control_mode,
      CASE WHEN UPPER(ISNULL(d.setup_status, 'OFF')) = 'ON' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS is_installed,
      d.last_update_time,
      r.name AS room_name,
      f.floor_id,
      z.zone_id,
      CASE WHEN UPPER(ISNULL(d.control_mode, 'MANUAL')) = 'MANUAL' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS can_toggle
    FROM dbo.Devices d
    LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
    LEFT JOIN dbo.Floor f ON f.floor_id = r.floor_id
    LEFT JOIN dbo.Zones z ON z.zone_id = f.zone_id
    WHERE ${whereClause}
    ORDER BY d.device_id DESC
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY
  `);

  return {
    items: result.recordset,
    pagination: {
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
      current_page: page,
      limit,
    },
  };
}

async function getDeviceById(deviceId) {
  await ensureControlModeColumn();
  await ensureLifecycleStatusColumn();

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(deviceId))
    .query(`
    SELECT TOP 1
      d.device_id AS id,
      d.room_id,
      d.device_name AS name,
      d.device_type AS type,
      d.device_status AS status,
      ISNULL(d.status, 'ACTIVE') AS lifecycle_status,
      ISNULL(d.control_mode, 'MANUAL') AS control_mode,
      CASE WHEN UPPER(ISNULL(d.setup_status, 'OFF')) = 'ON' THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS is_installed,
      d.last_update_time,
      r.name AS room_name
    FROM dbo.Devices d
    LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
    WHERE d.device_id = @id
  `);

  const data = result.recordset[0];
  if (!data) {
    throw createHttpError("Device not found", 404);
  }

  return data;
}

async function createDevice(payload) {
  const roomId = Number(payload.room_id ?? payload.roomId);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw createHttpError(
      "room_id is required and must be a positive integer",
      400,
    );
  }

  await ensureControlModeColumn();
  await ensureLifecycleStatusColumn();

  const name = payload.device_name ?? payload.name ?? null;
  const type = payload.device_type ?? payload.type ?? null;
  const status =
    normalizeOnOff(payload.device_status ?? payload.status) || "OFF";
  const setupStatus =
    normalizeOnOff(payload.setup_status ?? payload.setupStatus) || "OFF";
  const controlMode =
    normalizeControlMode(payload.control_mode ?? payload.controlMode) ||
    "MANUAL";
  const lifecycleStatus =
    normalizeLifecycleStatus(payload.status ?? payload.lifecycle_status) ||
    "ACTIVE";

  const pool = await getPool();
  const result = await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .input("device_name", sql.NVarChar(255), name)
    .input("device_type", sql.NVarChar(50), type)
    .input("device_status", sql.NVarChar(5), status)
    .input("setup_status", sql.NVarChar(5), setupStatus)
    .input("control_mode", sql.NVarChar(10), controlMode)
    .input("status", sql.NVarChar(20), lifecycleStatus).query(`
      INSERT INTO dbo.Devices (
        room_id,
        device_name,
        device_status,
        last_update_time,
        device_type,
        setup_status,
        control_mode,
        status
      )
      OUTPUT INSERTED.device_id AS id
      VALUES (
        @room_id,
        @device_name,
        @device_status,
        SYSUTCDATETIME(),
        @device_type,
        @setup_status,
        @control_mode,
        @status
      );
    `);

  const deviceId = result.recordset?.[0]?.id;
  return getDeviceById(deviceId);
}

async function updateDevice(deviceId, payload) {
  await ensureControlModeColumn();
  await ensureLifecycleStatusColumn();

  const id = Number(deviceId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Device ID must be a positive integer", 400);
  }

  const updates = [];
  const request = (await getPool()).request().input("id", sql.Int, id);

  if (payload.room_id !== undefined || payload.roomId !== undefined) {
    const roomId = Number(payload.room_id ?? payload.roomId);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw createHttpError("room_id must be a positive integer", 400);
    }
    request.input("room_id", sql.Int, roomId);
    updates.push("room_id = @room_id");
  }

  if (payload.device_name !== undefined || payload.name !== undefined) {
    request.input(
      "device_name",
      sql.NVarChar(255),
      payload.device_name ?? payload.name ?? null,
    );
    updates.push("device_name = @device_name");
  }

  if (payload.device_type !== undefined || payload.type !== undefined) {
    request.input(
      "device_type",
      sql.NVarChar(50),
      payload.device_type ?? payload.type ?? null,
    );
    updates.push("device_type = @device_type");
  }

  if (payload.device_status !== undefined || payload.status !== undefined) {
    const rawStatus = payload.device_status ?? payload.status;
    const powerStatus = normalizeOnOff(rawStatus);
    const lifecycleStatus = normalizeLifecycleStatus(rawStatus);

    if (powerStatus) {
      request.input("device_status", sql.NVarChar(5), powerStatus);
      updates.push("device_status = @device_status");
    } else if (lifecycleStatus) {
      request.input("status", sql.NVarChar(20), lifecycleStatus);
      updates.push("status = @status");
    } else {
      throw createHttpError(
        "device_status must be ON/OFF or ACTIVE/INACTIVE/MAINTENANCE",
        400,
      );
    }
  }

  if (payload.setup_status !== undefined || payload.setupStatus !== undefined) {
    const setupStatus = normalizeOnOff(
      payload.setup_status ?? payload.setupStatus,
    );
    if (!setupStatus) {
      throw createHttpError("setup_status must be ON or OFF", 400);
    }
    request.input("setup_status", sql.NVarChar(5), setupStatus);
    updates.push("setup_status = @setup_status");
  }

  if (payload.is_installed !== undefined || payload.isInstalled !== undefined) {
    const rawValue = payload.is_installed ?? payload.isInstalled;
    const isInstalled =
      rawValue === true ||
      rawValue === 1 ||
      String(rawValue).toLowerCase() === "true" ||
      String(rawValue) === "1";

    request.input("setup_status", sql.NVarChar(5), isInstalled ? "ON" : "OFF");
    updates.push("setup_status = @setup_status");
  }

  if (
    payload.lifecycle_status !== undefined ||
    payload.lifecycleStatus !== undefined
  ) {
    const lifecycle = normalizeLifecycleStatus(
      payload.lifecycle_status ?? payload.lifecycleStatus,
    );
    if (!lifecycle) {
      throw createHttpError(
        "lifecycle_status must be ACTIVE, INACTIVE, or MAINTENANCE",
        400,
      );
    }
    request.input("status", sql.NVarChar(20), lifecycle);
    updates.push("status = @status");
  }

  // Compatibility: if caller sends both `status` and `device_status`, the block above handles it.

  if (payload.control_mode !== undefined || payload.controlMode !== undefined) {
    const controlMode = normalizeControlMode(
      payload.control_mode ?? payload.controlMode,
    );
    if (!controlMode) {
      throw createHttpError("control_mode must be MANUAL or AUTO", 400);
    }
    request.input("control_mode", sql.NVarChar(10), controlMode);
    updates.push("control_mode = @control_mode");
  }

  if (updates.length === 0) {
    throw createHttpError("No updatable fields provided", 400);
  }

  updates.push("last_update_time = SYSUTCDATETIME()");

  const updateResult = await request.query(`
    UPDATE dbo.Devices
    SET ${updates.join(",\n        ")}
    WHERE device_id = @id;

    SELECT @@ROWCOUNT AS affected;
  `);

  const affected = Number(updateResult.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    throw createHttpError("Device not found", 404);
  }

  return getDeviceById(id);
}

async function deleteDevice(deviceId) {
  const id = Number(deviceId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Device ID must be a positive integer", 400);
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    DELETE FROM dbo.Devices
    WHERE device_id = @id;

    SELECT @@ROWCOUNT AS affected;
  `);

  const affected = Number(result.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    throw createHttpError("Device not found", 404);
  }

  return {
    id,
    deleted: true,
  };
}

async function toggleDevice(deviceId) {
  const device = await getDeviceById(deviceId);
  const nextState = device.status === "ON" ? "OFF" : "ON";
  return executeCommand(deviceId, nextState);
}

function mapDeviceTypeToControlKey(deviceType) {
  const normalized = String(deviceType || "")
    .trim()
    .toLowerCase();

  if (normalized === "fan") return "fan_on";
  if (normalized === "dryer") return "dryer_on";
  if (normalized === "ac" || normalized === "cooler") return "cooler_on";
  return null;
}

async function executeCommand(deviceId, command) {
  const normalizedCommand =
    normalizeTurnAction(command) || normalizeOnOff(command);
  if (!normalizedCommand) {
    throw createHttpError(
      "Command must be TURN_ON/TURN_OFF or ON/OFF",
      400,
    );
  }

  await ensureControlModeColumn();

  const device = await getDeviceById(deviceId);
  const mode = String(device.control_mode || "MANUAL").toUpperCase();

  if (mode === "AUTO") {
    throw createHttpError(
      "Device is in AUTO mode. Switch to MANUAL mode before sending control commands.",
      409,
    );
  }

  const key = mapDeviceTypeToControlKey(device.type);
  if (!key) {
    throw createHttpError(
      `Unsupported device type for control: ${device.type || "unknown"}`,
      400,
    );
  }

  const value = normalizedCommand === "ON";
  const dispatch = await iotService.controlDevice({ key, value });

  return {
    command_id: `cmd-${Date.now()}-${Number(deviceId)}`,
    device_id: Number(deviceId),
    requested_state: normalizedCommand,
    current_state: device.status,
    control_mode: mode,
    command_status: "PENDING_ACK",
    dispatch_protocol: "MQTT",
    dispatch_result: dispatch,
    note: "Actual device state is updated only after hardware acknowledgement.",
  };
}

module.exports = {
  listDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
  executeCommand,
};

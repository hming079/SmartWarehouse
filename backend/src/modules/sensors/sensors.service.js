const { sql, getPool } = require("../../../db");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSensorStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["ACTIVE", "INACTIVE", "MAINTENANCE"].includes(normalized)) {
    return normalized;
  }
  return null;
}

function normalizeOnlineOffline(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["ONLINE", "OFFLINE"].includes(normalized)) {
    return normalized;
  }
  return null;
}

function normalizeOnOff(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (["ON", "1", "TRUE", "ENABLE"].includes(normalized)) return "ON";
  if (["OFF", "0", "FALSE", "DISABLE"].includes(normalized)) return "OFF";
  return null;
}

async function listSensors(filters = {}, pagination = { page: 1, limit: 20 }) {
  const pool = await getPool();
  const request = pool.request();

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Number(pagination.limit) || 20);
  const offset = (page - 1) * limit;

  const whereClauses = ["1=1"];

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
    whereClauses.push("s.room_id = @roomId");
  }

  if (filters.type) {
    request.input("type", sql.NVarChar(20), String(filters.type).toUpperCase());
    whereClauses.push("UPPER(ISNULL(s.type, '')) = @type");
  }

  if (filters.status) {
    const sensorStatus = normalizeSensorStatus(filters.status);
    const healthStatus = normalizeOnlineOffline(filters.status);

    if (sensorStatus) {
      request.input("sensorStatus", sql.NVarChar(20), sensorStatus);
      whereClauses.push("UPPER(ISNULL(s.status, '')) = @sensorStatus");
    } else if (healthStatus) {
      request.input("healthStatus", sql.NVarChar(20), healthStatus);
      whereClauses.push(`
        CASE
          WHEN s.last_connection IS NOT NULL
            AND s.last_connection >= DATEADD(MINUTE, -5, SYSUTCDATETIME())
            THEN 'ONLINE'
          ELSE 'OFFLINE'
        END = @healthStatus
      `);
    } else {
      throw createHttpError(
        "status must be ACTIVE/INACTIVE/MAINTENANCE or ONLINE/OFFLINE",
        400,
      );
    }
  }

  if (filters.search) {
    request.input(
      "search",
      sql.NVarChar(255),
      `%${String(filters.search).trim()}%`,
    );
    whereClauses.push(
      "(s.name LIKE @search OR CAST(s.sensor_id AS NVARCHAR(32)) LIKE @search)",
    );
  }

  const whereClause = whereClauses.join(" AND ");

  const countResult = await request.query(`
    SELECT COUNT(*) AS total
    FROM dbo.Sensors s
    LEFT JOIN dbo.Rooms r ON r.room_id = s.room_id
    LEFT JOIN dbo.Floor f ON f.floor_id = r.floor_id
    LEFT JOIN dbo.Zones z ON z.zone_id = f.zone_id
    WHERE ${whereClause}
  `);

  const totalItems = Number(countResult.recordset?.[0]?.total || 0);

  const result = await request.query(`
    SELECT
      s.sensor_id AS id,
      s.room_id,
      s.name,
      s.type,
      s.status,
      s.last_update AS last_reading,
      s.last_connection,
      r.name AS room_name,
      f.floor_id,
      z.zone_id,
      CASE
        WHEN s.last_connection IS NOT NULL
          AND s.last_connection >= DATEADD(MINUTE, -5, SYSUTCDATETIME())
          THEN 'ONLINE'
        ELSE 'OFFLINE'
      END AS health_status,
      CASE
        WHEN s.last_connection IS NOT NULL
          AND s.last_connection >= DATEADD(MINUTE, -5, SYSUTCDATETIME())
          THEN CAST(0 AS bit)
        ELSE CAST(1 AS bit)
      END AS can_report_maintenance
    FROM dbo.Sensors s
    LEFT JOIN dbo.Rooms r ON r.room_id = s.room_id
    LEFT JOIN dbo.Floor f ON f.floor_id = r.floor_id
    LEFT JOIN dbo.Zones z ON z.zone_id = f.zone_id
    WHERE ${whereClause}
    ORDER BY s.sensor_id DESC
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

async function getSensorById(sensorId) {
  const id = Number(sensorId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Sensor ID must be a positive integer", 400);
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      s.sensor_id AS id,
      s.room_id,
      s.name,
      s.type,
      s.status,
      s.last_update AS last_reading,
      s.last_connection,
      s.setup_status,
      r.name AS room_name,
      f.floor_id,
      z.zone_id,
      CASE
        WHEN s.last_connection IS NOT NULL
          AND s.last_connection >= DATEADD(MINUTE, -5, SYSUTCDATETIME())
          THEN 'ONLINE'
        ELSE 'OFFLINE'
      END AS health_status
    FROM dbo.Sensors s
    LEFT JOIN dbo.Rooms r ON r.room_id = s.room_id
    LEFT JOIN dbo.Floor f ON f.floor_id = r.floor_id
    LEFT JOIN dbo.Zones z ON z.zone_id = f.zone_id
    WHERE s.sensor_id = @id
  `);

  const data = result.recordset?.[0];
  if (!data) {
    throw createHttpError("Sensor not found", 404);
  }

  return data;
}

async function createSensor(payload) {
  const type = payload.type ? String(payload.type).toUpperCase() : null;
  if (!type) {
    throw createHttpError("type is required", 400);
  }

  const roomId =
    payload.room_id === undefined && payload.roomId === undefined
      ? null
      : Number(payload.room_id ?? payload.roomId);

  if (roomId !== null && (!Number.isInteger(roomId) || roomId <= 0)) {
    throw createHttpError("room_id must be a positive integer", 400);
  }

  const name = payload.name ?? payload.sensor_name ?? null;
  const status = normalizeSensorStatus(payload.status) || "ACTIVE";
  const setupStatus = normalizeOnOff(payload.setup_status ?? payload.setupStatus) ||
    "ON";

  const pool = await getPool();
  const nextIdResult = await pool
    .request()
    .query("SELECT ISNULL(MAX(sensor_id), 0) + 1 AS nextId FROM dbo.Sensors");
  const nextId = Number(nextIdResult.recordset?.[0]?.nextId || 1);

  await pool
    .request()
    .input("sensor_id", sql.Int, nextId)
    .input("room_id", sql.Int, roomId)
    .input("name", sql.NVarChar(255), name)
    .input("type", sql.NVarChar(20), type)
    .input("status", sql.NVarChar(20), status)
    .input("setup_status", sql.NVarChar(5), setupStatus).query(`
      INSERT INTO dbo.Sensors (
        sensor_id,
        room_id,
        name,
        type,
        status,
        setup_status
      )
      VALUES (
        @sensor_id,
        @room_id,
        @name,
        @type,
        @status,
        @setup_status
      );
    `);

  return getSensorById(nextId);
}

async function updateSensor(sensorId, payload) {
  const id = Number(sensorId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Sensor ID must be a positive integer", 400);
  }

  const updates = [];
  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  if (payload.room_id !== undefined || payload.roomId !== undefined) {
    const roomId = Number(payload.room_id ?? payload.roomId);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw createHttpError("room_id must be a positive integer", 400);
    }
    request.input("room_id", sql.Int, roomId);
    updates.push("room_id = @room_id");
  }

  if (payload.name !== undefined || payload.sensor_name !== undefined) {
    request.input("name", sql.NVarChar(255), payload.name ?? payload.sensor_name);
    updates.push("name = @name");
  }

  if (payload.status !== undefined) {
    const status = normalizeSensorStatus(payload.status);
    if (!status) {
      throw createHttpError(
        "status must be ACTIVE, INACTIVE, or MAINTENANCE",
        400,
      );
    }
    request.input("status", sql.NVarChar(20), status);
    updates.push("status = @status");
  }

  if (payload.setup_status !== undefined || payload.setupStatus !== undefined) {
    const setupStatus = normalizeOnOff(payload.setup_status ?? payload.setupStatus);
    if (!setupStatus) {
      throw createHttpError("setup_status must be ON or OFF", 400);
    }
    request.input("setup_status", sql.NVarChar(5), setupStatus);
    updates.push("setup_status = @setup_status");
  }

  if (updates.length === 0) {
    throw createHttpError("No updatable fields provided", 400);
  }

  const updateResult = await request.query(`
    UPDATE dbo.Sensors
    SET ${updates.join(",\n        ")}
    WHERE sensor_id = @id;

    SELECT @@ROWCOUNT AS affected;
  `);

  const affected = Number(updateResult.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    throw createHttpError("Sensor not found", 404);
  }

  return getSensorById(id);
}

module.exports = {
  listSensors,
  getSensorById,
  createSensor,
  updateSensor,
};

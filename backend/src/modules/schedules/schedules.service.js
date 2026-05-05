const { sql, getPool } = require("../../../db");

const VALID_ACTIONS = new Set(["POWER_ON", "POWER_OFF", "LOW_POWER"]);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeTime(value, fieldName, { required }) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createHttpError(400, `${fieldName} is required`);
    }
    return undefined;
  }

  const normalized = String(value).trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    throw createHttpError(
      400,
      `${fieldName} must be in HH:mm or HH:mm:ss format`,
    );
  }

  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function normalizeAction(payload, { required }) {
  const { action } = payload;

  if (action === undefined || action === null || action === "") {
    if (required) {
      throw createHttpError(400, "action is required");
    }
    return undefined;
  }

  const normalized = String(action).trim().toUpperCase();
  if (!VALID_ACTIONS.has(normalized)) {
    throw createHttpError(
      400,
      "action must be one of POWER_ON, POWER_OFF, LOW_POWER",
    );
  }

  return normalized;
}

function normalizeDays(value, { required }) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createHttpError(400, "days_of_week is required");
    }
    return undefined;
  }

  return String(value).trim();
}

function normalizeDeviceIds(value) {
  if (value === undefined) {
    return undefined;
  }

  const input = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const raw of input) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError(400, "device_ids must contain positive integers");
    }
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }

  return unique;
}

async function ensureDevicesScheduleColumn() {
  const pool = await getPool();
  await pool.request().batch(`
    IF COL_LENGTH('dbo.Shedules', 'room_id') IS NULL
    BEGIN
      ALTER TABLE dbo.Shedules ADD room_id INT NULL;
    END;

    IF COL_LENGTH('dbo.Shedules', 'is_active') IS NULL
    BEGIN
      ALTER TABLE dbo.Shedules ADD is_active BIT NULL;
    END;

    IF COL_LENGTH('dbo.Shedules', 'action') IS NOT NULL
    BEGIN
      UPDATE dbo.Shedules
      SET is_active = CASE WHEN action = 'POWER_OFF' THEN 0 ELSE 1 END
      WHERE is_active IS NULL;
    END
    ELSE
    BEGIN
      UPDATE dbo.Shedules
      SET is_active = 1
      WHERE is_active IS NULL;
    END;

    IF EXISTS (
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.Shedules')
        AND name = 'is_active'
        AND is_nullable = 1
    )
    BEGIN
      ALTER TABLE dbo.Shedules ALTER COLUMN is_active BIT NOT NULL;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.default_constraints dc
      INNER JOIN sys.columns c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
      WHERE dc.parent_object_id = OBJECT_ID('dbo.Shedules')
        AND c.name = 'is_active'
    )
    BEGIN
      ALTER TABLE dbo.Shedules
      ADD CONSTRAINT DF_Shedules_is_active DEFAULT (1) FOR is_active;
    END;

    IF COL_LENGTH('dbo.Devices', 'shedule_id') IS NULL
    BEGIN
      ALTER TABLE dbo.Devices ADD shedule_id INT NULL;
    END;

    -- Remove invalid references before creating FK to avoid
    -- "Could not create constraint or index" errors on existing data.
    UPDATE d
    SET d.shedule_id = NULL
    FROM dbo.Devices d
    LEFT JOIN dbo.Shedules s ON s.shedule_id = d.shedule_id
    WHERE d.shedule_id IS NOT NULL
      AND s.shedule_id IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.foreign_keys
      WHERE name = 'FK_Devices_Shedule'
        AND parent_object_id = OBJECT_ID('dbo.Devices')
    )
    BEGIN
      ALTER TABLE dbo.Devices
      ADD CONSTRAINT FK_Devices_Shedule
      FOREIGN KEY (shedule_id) REFERENCES dbo.Shedules(shedule_id);
    END;
  `);
}

async function applyScheduleDevices(scheduleId, deviceIds) {
  await ensureDevicesScheduleColumn();

  const pool = await getPool();
  const request = pool.request().input("scheduleId", sql.Int, Number(scheduleId));

  if (deviceIds.length > 0) {
    const placeholders = deviceIds.map((_, idx) => `@deviceId${idx}`);
    for (let i = 0; i < deviceIds.length; i += 1) {
      request.input(`deviceId${i}`, sql.Int, deviceIds[i]);
    }

    const validationResult = await request.query(`
      SELECT COUNT(1) AS foundCount
      FROM dbo.Devices
      WHERE device_id IN (${placeholders.join(",")})
    `);

    const foundCount = Number(validationResult.recordset[0]?.foundCount || 0);
    if (foundCount !== deviceIds.length) {
      throw createHttpError(400, "One or more selected devices do not exist");
    }

    await request.query(`
      UPDATE dbo.Devices
      SET shedule_id = NULL
      WHERE shedule_id = @scheduleId
        AND device_id NOT IN (${placeholders.join(",")});

      UPDATE dbo.Devices
      SET shedule_id = @scheduleId
      WHERE device_id IN (${placeholders.join(",")});
    `);
    return;
  }

  await request.query(`
    UPDATE dbo.Devices
    SET shedule_id = NULL
    WHERE shedule_id = @scheduleId
  `);
}

async function getScheduleOrThrow(scheduleId) {
  await ensureDevicesScheduleColumn();

  const id = Number(scheduleId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "Invalid schedule id");
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      sh.shedule_id AS id,
      sh.name,
      CAST(sh.start_time AS VARCHAR(8)) AS start_time,
      CAST(sh.end_time AS VARCHAR(8)) AS end_time,
      sh.days_of_week,
      sh.action,
      sh.room_id,
      sh.is_active,
      ISNULL(STUFF((
        SELECT ',' + CAST(d.device_id AS varchar(12))
        FROM dbo.Devices d
        WHERE d.shedule_id = sh.shedule_id
        FOR XML PATH(''), TYPE
      ).value('.', 'nvarchar(max)'), 1, 1, ''), '') AS device_ids
    FROM dbo.Shedules sh
    WHERE sh.shedule_id = @id
  `);

  const item = result.recordset[0];
  if (!item) {
    throw createHttpError(404, "Schedule not found");
  }

  return item;
}

async function listSchedules({ roomId, deviceId, active }) {
  await ensureDevicesScheduleColumn();

  const pool = await getPool();
  const request = pool.request();
  let whereClause = " WHERE 1=1";

  if (active !== undefined && active !== null) {
    request.input("active", sql.Bit, Boolean(active));
    whereClause += " AND sh.is_active = @active";
  }

  if (roomId) {
    request.input("roomId", sql.Int, Number(roomId));
    whereClause += `
      AND (
        sh.room_id = @roomId
        OR EXISTS (
          SELECT 1 FROM dbo.Devices d
          WHERE d.shedule_id = sh.shedule_id
            AND d.room_id = @roomId
        )
      )
    `;
  }

  if (deviceId) {
    request.input("deviceId", sql.Int, Number(deviceId));
    whereClause += `
      AND EXISTS (
        SELECT 1 FROM dbo.Devices d
        WHERE d.shedule_id = sh.shedule_id
          AND d.device_id = @deviceId
      )
    `;
  }

  const result = await request.query(`
    SELECT
      sh.shedule_id AS id,
      sh.name,
      CONVERT(varchar(8), sh.start_time, 108) AS start_time,
      CONVERT(varchar(8), sh.end_time, 108) AS end_time,
      sh.days_of_week,
      sh.action,
      sh.is_active,
      COALESCE(sh.room_id, device_room.room_id) AS room_id,
      COALESCE(room_by_schedule.name, device_room.room_name) AS room_name,
      ISNULL(STUFF((
        SELECT ',' + CAST(d.device_id AS varchar(12))
        FROM dbo.Devices d
        WHERE d.shedule_id = sh.shedule_id
        FOR XML PATH(''), TYPE
      ).value('.', 'nvarchar(max)'), 1, 1, ''), '') AS device_ids,
      ISNULL(STUFF((
        SELECT ', ' + COALESCE(NULLIF(d.device_type, ''), CONCAT('Device ', d.device_id))
        FROM dbo.Devices d
        WHERE d.shedule_id = sh.shedule_id
        FOR XML PATH(''), TYPE
      ).value('.', 'nvarchar(max)'), 1, 2, ''), '') AS device_names
    FROM dbo.Shedules sh
    LEFT JOIN dbo.Rooms room_by_schedule
      ON room_by_schedule.room_id = sh.room_id
    OUTER APPLY (
      SELECT TOP 1
        r.room_id,
        r.name AS room_name
      FROM dbo.Devices d
      LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
      WHERE d.shedule_id = sh.shedule_id
        AND d.room_id IS NOT NULL
      ORDER BY d.device_id DESC
    ) device_room
    ${whereClause}
    ORDER BY sh.shedule_id DESC
  `);

  return {
    items: result.recordset,
    filters: {
      roomId: roomId || null,
      deviceId: deviceId || null,
      active: active === undefined ? null : Boolean(active),
    },
  };
}

async function listScheduleDevices({ roomId }) {
  await ensureDevicesScheduleColumn();

  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";

  if (roomId) {
    request.input("roomId", sql.Int, Number(roomId));
    whereClause = "WHERE d.room_id = @roomId";
  }

  const result = await request.query(`
    SELECT
      d.device_id AS id,
      d.room_id,
      COALESCE(NULLIF(d.device_type, ''), CONCAT('Device ', d.device_id)) AS name,
      d.device_type AS type,
      d.device_status AS status,
      d.shedule_id,
      r.name AS room_name
    FROM dbo.Devices d
    LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
    ${whereClause}
    ORDER BY d.device_id DESC
  `);

  return {
    items: result.recordset,
    filters: { roomId: roomId || null },
  };
}

async function createSchedule(payload) {
  await ensureDevicesScheduleColumn();

  const name = String(payload.name || "").trim();
  if (!name) {
    throw createHttpError(400, "name is required");
  }

  const startTime = normalizeTime(payload.start_time, "start_time", {
    required: true,
  });
  const endTime = normalizeTime(payload.end_time, "end_time", {
    required: true,
  });
  const daysOfWeek = normalizeDays(payload.days_of_week, { required: true });
  const action = normalizeAction(payload, { required: true });
  const isActive = payload.is_active === undefined ? true : Boolean(payload.is_active);
  const deviceIds = normalizeDeviceIds(payload.device_ids) || [];
  const roomId = payload.room_id ? Number(payload.room_id) : null;

  const pool = await getPool();
  const nextIdResult = await pool.request().query(`
    SELECT ISNULL(MAX(shedule_id), 0) + 1 AS nextId
    FROM dbo.Shedules
  `);

  const nextId = Number(nextIdResult.recordset[0].nextId);

  const request = pool
    .request()
    .input("id", sql.Int, nextId)
    .input("name", sql.NVarChar(255), name)
    .input("start_time", sql.NVarChar(8), startTime)
    .input("end_time", sql.NVarChar(8), endTime)
    .input("days_of_week", sql.NVarChar(255), daysOfWeek)
    .input("is_active", sql.Bit, isActive)
    .input("action", sql.NVarChar(20), action);

  if (roomId) {
    request.input("room_id", sql.Int, roomId);
  }

  await request.query(`
    INSERT INTO dbo.Shedules (
      shedule_id,
      name,
      start_time,
      end_time,
      days_of_week,
      is_active,
      action
      ${roomId ? ", room_id" : ""}
    )
    VALUES (
      @id,
      @name,
      @start_time,
      @end_time,
      @days_of_week,
      @is_active,
      @action
      ${roomId ? ", @room_id" : ""}
    )
  `);

  await applyScheduleDevices(nextId, deviceIds);

  return {
    id: nextId,
    name,
    start_time: startTime,
    end_time: endTime,
    days_of_week: daysOfWeek,
    action,
    device_ids: deviceIds.join(","),
    is_active: isActive,
    room_id: roomId,
  };
}

async function updateSchedule(scheduleId, payload) {
  await ensureDevicesScheduleColumn();

  const existing = await getScheduleOrThrow(scheduleId);

  const hasName = payload.name !== undefined;
  const hasStartTime = payload.start_time !== undefined;
  const hasEndTime = payload.end_time !== undefined;
  const hasDays = payload.days_of_week !== undefined;
  const hasAction = payload.action !== undefined;
  const hasDeviceIds = payload.device_ids !== undefined;
  const hasRoomId = payload.room_id !== undefined;
  const hasIsActive = payload.is_active !== undefined;

  if (!hasName && !hasStartTime && !hasEndTime && !hasDays && !hasAction && !hasDeviceIds && !hasRoomId && !hasIsActive) {
    throw createHttpError(400, "No fields to update");
  }

  const name = hasName ? String(payload.name || "").trim() : existing.name;
  if (!name) {
    throw createHttpError(400, "name cannot be empty");
  }

  const startTime = normalizeTime(payload.start_time, "start_time", {
    required: false,
  });
  const endTime = normalizeTime(payload.end_time, "end_time", { required: false });
  const daysOfWeek = normalizeDays(payload.days_of_week, { required: false });
  const action = normalizeAction(payload, { required: false });
  const deviceIds = normalizeDeviceIds(payload.device_ids);
  const roomId = hasRoomId ? (payload.room_id ? Number(payload.room_id) : null) : existing.room_id;

  const nextStartTime = startTime === undefined ? existing.start_time : startTime;
  const nextEndTime = endTime === undefined ? existing.end_time : endTime;
  const nextDays = daysOfWeek === undefined ? existing.days_of_week : daysOfWeek;
  const nextAction = action === undefined ? existing.action : action;
  const nextIsActive = hasIsActive ? Boolean(payload.is_active) : Boolean(existing.is_active);

  const pool = await getPool();
  const request = pool
    .request()
    .input("id", sql.Int, Number(scheduleId))
    .input("name", sql.NVarChar(255), name)
    .input("start_time", sql.NVarChar(8), nextStartTime)
    .input("end_time", sql.NVarChar(8), nextEndTime)
    .input("days_of_week", sql.NVarChar(255), nextDays)
    .input("is_active", sql.Bit, nextIsActive)
    .input("action", sql.NVarChar(20), nextAction);

  if (roomId !== null) {
    request.input("room_id", sql.Int, roomId);
  }

  const updateSetClause = `
    name = @name,
    start_time = @start_time,
    end_time = @end_time,
    days_of_week = @days_of_week,
    is_active = @is_active,
    action = @action
    ${roomId !== null ? ", room_id = @room_id" : ""}
  `;

  await request.query(`
    UPDATE dbo.Shedules
    SET ${updateSetClause}
    WHERE shedule_id = @id
  `);

  if (deviceIds !== undefined) {
    await applyScheduleDevices(scheduleId, deviceIds);
  }

  return {
    id: Number(scheduleId),
    name,
    start_time: nextStartTime,
    end_time: nextEndTime,
    days_of_week: nextDays,
    action: nextAction,
    device_ids: deviceIds ? deviceIds.join(",") : existing.device_ids,
    is_active: nextIsActive,
    room_id: roomId,
  };
}

async function deleteSchedule(scheduleId) {
  await getScheduleOrThrow(scheduleId);

  await ensureDevicesScheduleColumn();

  const pool = await getPool();
  await pool.request().input("id", sql.Int, Number(scheduleId)).query(`
    UPDATE dbo.Devices
    SET shedule_id = NULL
    WHERE shedule_id = @id
  `);

  await pool.request().input("id", sql.Int, Number(scheduleId)).query(`
    DELETE FROM dbo.Shedules
    WHERE shedule_id = @id
  `);

  return {
    id: Number(scheduleId),
    deleted: true,
  };
}

async function toggleSchedule(scheduleId) {
  await ensureDevicesScheduleColumn();

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(scheduleId))
    .query(`
      UPDATE dbo.Shedules
      SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
      WHERE shedule_id = @id
    `);

  const result = await pool
    .request()
    .input("id", sql.Int, Number(scheduleId))
    .query(`
      SELECT TOP 1 action, is_active
      FROM dbo.Shedules
      WHERE shedule_id = @id
    `);

  const item = result.recordset?.[0] || null;
  if (!item) {
    throw createHttpError(404, "Schedule not found");
  }

  return {
    id: Number(scheduleId),
    toggled: true,
    action: item.action,
    is_active: Boolean(item.is_active),
  };
}

module.exports = {
  listSchedules,
  listScheduleDevices,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
};

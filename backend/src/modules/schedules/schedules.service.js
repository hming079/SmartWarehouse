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
  const { action, active } = payload;

  if (active !== undefined && active !== null) {
    return Boolean(active) ? "POWER_ON" : "POWER_OFF";
  }

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

async function getScheduleOrThrow(scheduleId) {
  const id = Number(scheduleId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "Invalid schedule id");
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      sh.shedule_id AS id,
      sh.name,
      CONVERT(varchar(8), sh.start_time, 108) AS start_time,
      CONVERT(varchar(8), sh.end_time, 108) AS end_time,
      sh.days_of_week,
      sh.action,
      CASE WHEN sh.action = 'POWER_OFF' THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS is_active
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
  const pool = await getPool();
  const request = pool.request();
  let whereClause = " WHERE 1=1";

  if (active !== undefined && active !== null) {
    request.input("active", sql.Bit, Boolean(active));
    whereClause +=
      " AND (CASE WHEN sh.action = 'POWER_OFF' THEN 0 ELSE 1 END) = @active";
  }

  if (roomId) {
    request.input("roomId", sql.Int, Number(roomId));
    whereClause += `
      AND EXISTS (
        SELECT 1 FROM dbo.Sensors s
        WHERE s.shedule_id = sh.shedule_id
          AND s.room_id = @roomId
      )
    `;
  }

  if (deviceId) {
    request.input("deviceId", sql.Int, Number(deviceId));
    whereClause += `
      AND EXISTS (
        SELECT 1 FROM dbo.Sensors s
        WHERE s.shedule_id = sh.shedule_id
          AND s.sensor_id = @deviceId
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
      CASE WHEN sh.action = 'POWER_OFF' THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS is_active
    FROM dbo.Shedules sh
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

async function createSchedule(payload) {
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

  const pool = await getPool();
  const nextIdResult = await pool.request().query(`
    SELECT ISNULL(MAX(shedule_id), 0) + 1 AS nextId
    FROM dbo.Shedules
  `);

  const nextId = Number(nextIdResult.recordset[0].nextId);

  await pool
    .request()
    .input("id", sql.Int, nextId)
    .input("name", sql.NVarChar(255), name)
    .input("start_time", sql.NVarChar(8), startTime)
    .input("end_time", sql.NVarChar(8), endTime)
    .input("days_of_week", sql.NVarChar(255), daysOfWeek)
    .input("action", sql.NVarChar(20), action).query(`
      INSERT INTO dbo.Shedules (
        shedule_id,
        name,
        start_time,
        end_time,
        days_of_week,
        action
      )
      VALUES (
        @id,
        @name,
        CONVERT(time, @start_time),
        CONVERT(time, @end_time),
        @days_of_week,
        @action
      )
    `);

  return {
    id: nextId,
    name,
    start_time: startTime,
    end_time: endTime,
    days_of_week: daysOfWeek,
    action,
    is_active: action !== "POWER_OFF",
  };
}

async function updateSchedule(scheduleId, payload) {
  const existing = await getScheduleOrThrow(scheduleId);

  const hasName = payload.name !== undefined;
  const hasStartTime = payload.start_time !== undefined;
  const hasEndTime = payload.end_time !== undefined;
  const hasDays = payload.days_of_week !== undefined;
  const hasAction = payload.action !== undefined || payload.active !== undefined;

  if (!hasName && !hasStartTime && !hasEndTime && !hasDays && !hasAction) {
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

  const nextStartTime = startTime === undefined ? existing.start_time : startTime;
  const nextEndTime = endTime === undefined ? existing.end_time : endTime;
  const nextDays = daysOfWeek === undefined ? existing.days_of_week : daysOfWeek;
  const nextAction = action === undefined ? existing.action : action;

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(scheduleId))
    .input("name", sql.NVarChar(255), name)
    .input("start_time", sql.NVarChar(8), nextStartTime)
    .input("end_time", sql.NVarChar(8), nextEndTime)
    .input("days_of_week", sql.NVarChar(255), nextDays)
    .input("action", sql.NVarChar(20), nextAction).query(`
      UPDATE dbo.Shedules
      SET
        name = @name,
        start_time = CONVERT(time, @start_time),
        end_time = CONVERT(time, @end_time),
        days_of_week = @days_of_week,
        action = @action
      WHERE shedule_id = @id
    `);

  return {
    id: Number(scheduleId),
    name,
    start_time: nextStartTime,
    end_time: nextEndTime,
    days_of_week: nextDays,
    action: nextAction,
    is_active: nextAction !== "POWER_OFF",
  };
}

async function deleteSchedule(scheduleId) {
  await getScheduleOrThrow(scheduleId);

  const pool = await getPool();
  await pool.request().input("id", sql.Int, Number(scheduleId)).query(`
    UPDATE dbo.Sensors
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
  const existing = await getScheduleOrThrow(scheduleId);
  const nextAction = existing.action === "POWER_OFF" ? "POWER_ON" : "POWER_OFF";

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(scheduleId))
    .input("action", sql.NVarChar(20), nextAction).query(`
      UPDATE dbo.Shedules
      SET action = @action
      WHERE shedule_id = @id
    `);

  return {
    id: Number(scheduleId),
    toggled: true,
    action: nextAction,
    is_active: nextAction !== "POWER_OFF",
  };
}

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
};

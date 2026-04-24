const { sql, getPool } = require("../../../db");
const actionLogger = require("../action-logger/action-logger.service");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function toNullableFloat(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNullableBool(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value === true || value === false) return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function normalizeMetric(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  return normalized;
}

function normalizeAlertLevel(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (["WARNING", "CRITICAL"].includes(normalized)) return normalized;
  return null;
}

async function ensureThresholdSchema() {
  const pool = await getPool();
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.Threshold', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Threshold (
        threshold_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        min_threshold FLOAT NULL,
        max_threshold FLOAT NULL,
        is_active BIT NOT NULL DEFAULT (1),
        updated_at DATETIME2 NULL,
        sensor_id INT NULL,
        metric NVARCHAR(20) NULL,
        hysteresis FLOAT NULL,
        alert_level NVARCHAR(20) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_Threshold_CreatedAt DEFAULT (SYSUTCDATETIME()),
        deleted_at DATETIME2 NULL
      );
    END;

    IF COL_LENGTH('dbo.Threshold', 'sensor_id') IS NULL
      ALTER TABLE dbo.Threshold ADD sensor_id INT NULL;

    IF COL_LENGTH('dbo.Threshold', 'metric') IS NULL
      ALTER TABLE dbo.Threshold ADD metric NVARCHAR(20) NULL;

    IF COL_LENGTH('dbo.Threshold', 'hysteresis') IS NULL
      ALTER TABLE dbo.Threshold ADD hysteresis FLOAT NULL;

    IF COL_LENGTH('dbo.Threshold', 'alert_level') IS NULL
      ALTER TABLE dbo.Threshold ADD alert_level NVARCHAR(20) NULL;

    IF COL_LENGTH('dbo.Threshold', 'created_at') IS NULL
      ALTER TABLE dbo.Threshold
        ADD created_at DATETIME2 NOT NULL
          CONSTRAINT DF_Threshold_CreatedAt DEFAULT (SYSUTCDATETIME());

    IF COL_LENGTH('dbo.Threshold', 'deleted_at') IS NULL
      ALTER TABLE dbo.Threshold ADD deleted_at DATETIME2 NULL;
  `);
}

async function getThresholdIdIdentityMode(pool) {
  const result = await pool.request().query(`
    SELECT
      COLUMNPROPERTY(OBJECT_ID('dbo.Threshold'), 'threshold_id', 'IsIdentity') AS is_identity
  `);
  return Number(result.recordset?.[0]?.is_identity || 0) === 1;
}

async function getSensorOrThrow(sensorId) {
  const id = Number(sensorId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("sensorId must be a positive integer", 400);
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      sensor_id,
      room_id,
      name,
      type,
      threshold_id
    FROM dbo.Sensors
    WHERE sensor_id = @id
  `);

  const row = result.recordset?.[0];
  if (!row) {
    throw createHttpError("Sensor not found", 404);
  }

  return row;
}

async function getThresholdById(thresholdId) {
  await ensureThresholdSchema();
  const id = Number(thresholdId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Threshold id must be a positive integer", 400);
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    SELECT TOP 1
      t.threshold_id AS id,
      ISNULL(t.sensor_id, s.sensor_id) AS sensor_id,
      ISNULL(t.metric, s.type) AS metric,
      t.min_threshold AS min_value,
      t.max_threshold AS max_value,
      t.hysteresis,
      t.alert_level,
      t.is_active,
      t.created_at,
      t.updated_at,
      t.deleted_at,
      s.room_id,
      s.name AS sensor_name,
      s.type AS sensor_type
    FROM dbo.Threshold t
    LEFT JOIN dbo.Sensors s
      ON s.sensor_id = t.sensor_id
      OR (t.sensor_id IS NULL AND s.threshold_id = t.threshold_id)
    WHERE t.threshold_id = @id
  `);

  const row = result.recordset?.[0];
  if (!row) {
    throw createHttpError("Threshold not found", 404);
  }

  return row;
}

async function listThresholds(filters = {}) {
  await ensureThresholdSchema();
  const pool = await getPool();
  const request = pool.request();
  const where = ["t.deleted_at IS NULL"];

  if (Number.isInteger(filters.roomId) && filters.roomId > 0) {
    request.input("roomId", sql.Int, filters.roomId);
    where.push("s.room_id = @roomId");
  }

  if (Number.isInteger(filters.sensorId) && filters.sensorId > 0) {
    request.input("sensorId", sql.Int, filters.sensorId);
    where.push("(t.sensor_id = @sensorId OR s.sensor_id = @sensorId)");
  }

  if (filters.isActive === true || filters.isActive === false) {
    request.input("isActive", sql.Bit, filters.isActive);
    where.push("t.is_active = @isActive");
  }

  const result = await request.query(`
    SELECT
      t.threshold_id AS id,
      ISNULL(t.sensor_id, s.sensor_id) AS sensor_id,
      ISNULL(t.metric, s.type) AS metric,
      t.min_threshold AS min_value,
      t.max_threshold AS max_value,
      t.hysteresis,
      t.alert_level,
      t.is_active,
      t.created_at,
      t.updated_at,
      t.deleted_at,
      s.room_id,
      s.name AS sensor_name,
      s.type AS sensor_type
    FROM dbo.Threshold t
    LEFT JOIN dbo.Sensors s
      ON s.sensor_id = t.sensor_id
      OR (t.sensor_id IS NULL AND s.threshold_id = t.threshold_id)
    WHERE ${where.join(" AND ")}
    ORDER BY t.threshold_id DESC
  `);

  return result.recordset;
}

async function createThreshold(payload, { actorUserId = null } = {}) {
  await ensureThresholdSchema();
  const sensorId = toNullableInt(payload.sensorId ?? payload.sensor_id);
  if (!sensorId) {
    throw createHttpError("sensorId is required", 400);
  }

  const sensor = await getSensorOrThrow(sensorId);
  const metric = normalizeMetric(payload.metric) || normalizeMetric(sensor.type);
  if (!metric) {
    throw createHttpError("metric is required", 400);
  }

  const minValue = toNullableFloat(payload.min_value ?? payload.minValue);
  const maxValue = toNullableFloat(payload.max_value ?? payload.maxValue);
  const hysteresis = toNullableFloat(payload.hysteresis);
  const alertLevel =
    normalizeAlertLevel(payload.alert_level ?? payload.alertLevel) || "WARNING";

  const isActive = toNullableBool(payload.is_active ?? payload.isActive);
  if (isActive === undefined) {
    throw createHttpError("is_active must be true/false/1/0", 400);
  }

  const safeIsActive = isActive === null ? true : isActive;

  const pool = await getPool();
  const isIdentity = await getThresholdIdIdentityMode(pool);

  const oldSensorThresholdId = toNullableInt(sensor.threshold_id);
  const oldThreshold = oldSensorThresholdId
    ? await getThresholdById(oldSensorThresholdId).catch(() => null)
    : null;

  const request = pool.request();
  request
    .input("min_threshold", sql.Float, minValue)
    .input("max_threshold", sql.Float, maxValue)
    .input("is_active", sql.Bit, Boolean(safeIsActive))
    .input("updated_at", sql.DateTime2, new Date())
    .input("sensor_id", sql.Int, sensorId)
    .input("metric", sql.NVarChar(20), metric)
    .input("hysteresis", sql.Float, hysteresis)
    .input("alert_level", sql.NVarChar(20), alertLevel);

  let thresholdId;
  if (isIdentity) {
    const inserted = await request.query(`
      INSERT INTO dbo.Threshold (
        min_threshold,
        max_threshold,
        is_active,
        updated_at,
        sensor_id,
        metric,
        hysteresis,
        alert_level
      )
      OUTPUT INSERTED.threshold_id AS id
      VALUES (
        @min_threshold,
        @max_threshold,
        @is_active,
        @updated_at,
        @sensor_id,
        @metric,
        @hysteresis,
        @alert_level
      );
    `);
    thresholdId = Number(inserted.recordset?.[0]?.id);
  } else {
    const nextIdResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(threshold_id), 0) + 1 AS nextId FROM dbo.Threshold");
    thresholdId = Number(nextIdResult.recordset?.[0]?.nextId || 1);

    request.input("threshold_id", sql.Int, thresholdId);
    await request.query(`
      INSERT INTO dbo.Threshold (
        threshold_id,
        min_threshold,
        max_threshold,
        is_active,
        updated_at,
        sensor_id,
        metric,
        hysteresis,
        alert_level
      )
      VALUES (
        @threshold_id,
        @min_threshold,
        @max_threshold,
        @is_active,
        @updated_at,
        @sensor_id,
        @metric,
        @hysteresis,
        @alert_level
      );
    `);
  }

  await pool
    .request()
    .input("sensorId", sql.Int, sensorId)
    .input("thresholdId", sql.Int, thresholdId)
    .query("UPDATE dbo.Sensors SET threshold_id = @thresholdId WHERE sensor_id = @sensorId");

  const created = await getThresholdById(thresholdId);

  await actionLogger.logAction({
    code: "THRESHOLD_CREATE",
    name: "Create threshold",
    domain: "THRESHOLD",
    actorUserId,
    targetType: "THRESHOLD",
    targetId: thresholdId,
    roomId: toNullableInt(sensor.room_id),
    oldValue: oldThreshold,
    newValue: created,
    status: "ACCEPTED",
  });

  return created;
}

async function updateThreshold(thresholdId, patch, { actorUserId = null } = {}) {
  await ensureThresholdSchema();
  const id = Number(thresholdId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Threshold id must be a positive integer", 400);
  }

  const before = await getThresholdById(id);
  const updates = [];
  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  if (patch.sensorId !== undefined || patch.sensor_id !== undefined) {
    const sensorId = toNullableInt(patch.sensorId ?? patch.sensor_id);
    if (!sensorId) {
      throw createHttpError("sensorId must be a positive integer", 400);
    }
    const sensor = await getSensorOrThrow(sensorId);
    request.input("sensor_id", sql.Int, sensorId);
    updates.push("sensor_id = @sensor_id");

    await pool
      .request()
      .input("sensorId", sql.Int, sensorId)
      .input("thresholdId", sql.Int, id)
      .query(
        "UPDATE dbo.Sensors SET threshold_id = @thresholdId WHERE sensor_id = @sensorId",
      );

    // Keep roomId consistent for logging even if the threshold moved.
    before.room_id = sensor.room_id;
  }

  if (patch.metric !== undefined) {
    const metric = normalizeMetric(patch.metric);
    if (!metric) {
      throw createHttpError("metric is required", 400);
    }
    request.input("metric", sql.NVarChar(20), metric);
    updates.push("metric = @metric");
  }

  if (patch.min_value !== undefined || patch.minValue !== undefined) {
    const minValue = toNullableFloat(patch.min_value ?? patch.minValue);
    request.input("min_threshold", sql.Float, minValue);
    updates.push("min_threshold = @min_threshold");
  }

  if (patch.max_value !== undefined || patch.maxValue !== undefined) {
    const maxValue = toNullableFloat(patch.max_value ?? patch.maxValue);
    request.input("max_threshold", sql.Float, maxValue);
    updates.push("max_threshold = @max_threshold");
  }

  if (patch.hysteresis !== undefined) {
    const hysteresis = toNullableFloat(patch.hysteresis);
    request.input("hysteresis", sql.Float, hysteresis);
    updates.push("hysteresis = @hysteresis");
  }

  if (patch.alert_level !== undefined || patch.alertLevel !== undefined) {
    const alertLevel = normalizeAlertLevel(patch.alert_level ?? patch.alertLevel);
    if (!alertLevel) {
      throw createHttpError("alert_level must be WARNING or CRITICAL", 400);
    }
    request.input("alert_level", sql.NVarChar(20), alertLevel);
    updates.push("alert_level = @alert_level");
  }

  if (patch.is_active !== undefined || patch.isActive !== undefined) {
    const isActive = toNullableBool(patch.is_active ?? patch.isActive);
    if (isActive === undefined || isActive === null) {
      throw createHttpError("is_active must be true/false/1/0", 400);
    }
    request.input("is_active", sql.Bit, Boolean(isActive));
    updates.push("is_active = @is_active");
  }

  if (updates.length === 0) {
    throw createHttpError("No updatable fields provided", 400);
  }

  updates.push("updated_at = SYSUTCDATETIME()");

  await request.query(`
    UPDATE dbo.Threshold
    SET ${updates.join(",\n        ")}
    WHERE threshold_id = @id;

    IF @@ROWCOUNT = 0
      THROW 50000, 'Threshold not found', 1;
  `);

  const after = await getThresholdById(id);

  await actionLogger.logAction({
    code: "THRESHOLD_UPDATE",
    name: "Update threshold",
    domain: "THRESHOLD",
    actorUserId,
    targetType: "THRESHOLD",
    targetId: id,
    roomId: toNullableInt(after.room_id ?? before.room_id),
    oldValue: before,
    newValue: after,
    status: "ACCEPTED",
  });

  return after;
}

async function deleteThreshold(thresholdId, { actorUserId = null } = {}) {
  await ensureThresholdSchema();
  const id = Number(thresholdId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("Threshold id must be a positive integer", 400);
  }

  const before = await getThresholdById(id);
  const pool = await getPool();

  await pool.request().input("id", sql.Int, id).query(`
    UPDATE dbo.Threshold
    SET is_active = 0,
        deleted_at = SYSUTCDATETIME(),
        updated_at = SYSUTCDATETIME()
    WHERE threshold_id = @id;
  `);

  await pool.request().input("id", sql.Int, id).query(`
    UPDATE dbo.Sensors
    SET threshold_id = NULL
    WHERE threshold_id = @id;
  `);

  await actionLogger.logAction({
    code: "THRESHOLD_DELETE",
    name: "Delete threshold",
    domain: "THRESHOLD",
    actorUserId,
    targetType: "THRESHOLD",
    targetId: id,
    roomId: toNullableInt(before.room_id),
    oldValue: before,
    newValue: { deleted: true, id },
    status: "ACCEPTED",
  });
}

module.exports = {
  listThresholds,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  getThresholdById,
};


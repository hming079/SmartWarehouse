const { sql, getPool } = require("../../../db");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listDevices({ roomId }) {
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
      COALESCE(NULLIF(LTRIM(RTRIM(d.device_type)), ''), CONCAT('Device ', d.device_id)) AS name,
      d.device_type AS type,
      d.device_status AS status,
      d.last_update_time,
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

async function getDeviceById(deviceId) {
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(deviceId))
    .query(`
    SELECT TOP 1
      d.device_id AS id,
      d.room_id,
      COALESCE(NULLIF(LTRIM(RTRIM(d.device_type)), ''), CONCAT('Device ', d.device_id)) AS name,
      d.device_type AS type,
      d.device_status AS status,
      d.last_update_time,
      r.name AS room_name
    FROM dbo.Devices d
    LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
    WHERE d.device_id = @id
  `);

  return (
    result.recordset[0] || {
      id: Number(deviceId),
      name: "",
      type: "",
      status: "OFF",
    }
  );
}

async function createDevice(payload) {
  return {
    id: null,
    ...payload,
  };
}

async function updateDevice(deviceId, payload) {
  return {
    id: Number(deviceId),
    ...payload,
  };
}

async function deleteDevice(deviceId) {
  const id = Number(deviceId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "Invalid device id");
  }

  const pool = await getPool();
  const request = pool.request().input("id", sql.Int, id);

  const existing = await request.query(`
    SELECT TOP 1 device_id
    FROM dbo.Devices
    WHERE device_id = @id
  `);

  if (!existing.recordset.length) {
    throw createHttpError(404, `Device ${id} not found`);
  }

  await request.query(`
    DELETE FROM dbo.DevicesLog
    WHERE device_id = @id
  `);

  await request.query(`
    DELETE FROM dbo.Devices
    WHERE device_id = @id
  `);

  return {
    id,
    deleted: true,
  };
}

async function toggleDevice(deviceId) {
  const id = Number(deviceId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "Invalid device id");
  }

  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, id).query(`
    DECLARE @nextStatus NVARCHAR(5);

    SELECT TOP 1 @nextStatus = CASE
      WHEN UPPER(ISNULL(device_status, 'OFF')) = 'ON' THEN 'OFF'
      ELSE 'ON'
    END
    FROM dbo.Devices
    WHERE device_id = @id;

    IF @nextStatus IS NULL
    BEGIN
      SELECT CAST(0 AS BIT) AS updated, NULL AS status;
      RETURN;
    END

    UPDATE dbo.Devices
    SET device_status = @nextStatus,
        last_update_time = SYSUTCDATETIME()
    WHERE device_id = @id;

    INSERT INTO dbo.DevicesLog (device_id, device_status)
    VALUES (@id, @nextStatus);

    SELECT CAST(1 AS BIT) AS updated, @nextStatus AS status;
  `);

  const row = result.recordset[0] || {};
  if (!row.updated) {
    throw createHttpError(404, `Device ${id} not found`);
  }

  return {
    id,
    toggled: true,
    status: row.status,
  };
}

async function getDeviceLogs({ roomId, page = 1, pageSize = 20 }) {
  const pool = await getPool();
  const request = pool.request();
  const offset = (page - 1) * pageSize;

  let whereClause = "";
  if (roomId) {
    request.input("roomId", sql.Int, Number(roomId));
    whereClause = "WHERE d.room_id = @roomId";
  }

  const result = await request
    .input("pageSize", sql.Int, pageSize)
    .input("offset", sql.Int, offset)
    .query(`
    SELECT
      dl.device_log_id AS id,
      dl.device_id,
      d.device_id AS deviceId,
      d.device_type AS type,
      d.room_id,
      r.name AS room_name,
      dl.device_status AS status,
      dl.timestamp AS timestamp
    FROM dbo.DevicesLog dl
    JOIN dbo.Devices d ON dl.device_id = d.device_id
    LEFT JOIN dbo.Rooms r ON d.room_id = r.room_id
    ${whereClause}
    ORDER BY dl.timestamp DESC
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: result.recordset,
    page,
    pageSize,
    roomId: roomId || null,
  };
}

module.exports = {
  listDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
  getDeviceLogs,
};

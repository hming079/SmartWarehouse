const { sql, getPool } = require("../../../db");

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
      d.device_name AS name,
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
      d.device_name AS name,
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
  return {
    id: Number(deviceId),
    deleted: true,
  };
}

async function toggleDevice(deviceId) {
  return {
    id: Number(deviceId),
    toggled: true,
  };
}

module.exports = {
  listDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
};

const { sql, getPool } = require("../../../db");

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
      sh.start_time,
      sh.end_time,
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
  return {
    id: null,
    ...payload,
  };
}

async function updateSchedule(scheduleId, payload) {
  return {
    id: Number(scheduleId),
    ...payload,
  };
}

async function deleteSchedule(scheduleId) {
  return {
    id: Number(scheduleId),
    deleted: true,
  };
}

async function toggleSchedule(scheduleId) {
  return {
    id: Number(scheduleId),
    toggled: true,
  };
}

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
};

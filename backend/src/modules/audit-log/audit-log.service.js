const { sql, getPool } = require("../../../db");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listAuditLogs({
  page = 1,
  pageSize = 20,
  from,
  to,
  actor,
  action,
  roomId,
}) {
  const safePage = Math.max(1, Number(page || 1));
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize || 20)));
  const offset = (safePage - 1) * safePageSize;

  const pool = await getPool();
  const countRequest = pool.request();
  const dataRequest = pool.request();
  let whereClause = " WHERE 1=1";

  if (from) {
    const fromDate = new Date(from);
    countRequest.input("from", sql.DateTime2, fromDate);
    dataRequest.input("from", sql.DateTime2, fromDate);
    whereClause += " AND al.[timestamp] >= @from";
  }
  if (to) {
    const toDate = new Date(to);
    countRequest.input("to", sql.DateTime2, toDate);
    dataRequest.input("to", sql.DateTime2, toDate);
    whereClause += " AND al.[timestamp] <= @to";
  }
  if (actor) {
    const actorLike = `%${actor}%`;
    countRequest.input("actor", sql.NVarChar(255), actorLike);
    dataRequest.input("actor", sql.NVarChar(255), actorLike);
    whereClause += " AND (u.username LIKE @actor OR u.full_name LIKE @actor)";
  }
  if (action) {
    const actionLike = `%${action}%`;
    countRequest.input("action", sql.NVarChar(255), actionLike);
    dataRequest.input("action", sql.NVarChar(255), actionLike);
    whereClause += " AND (a.code LIKE @action OR a.name LIKE @action)";
  }
  if (roomId) {
    const room = Number(roomId);
    countRequest.input("roomId", sql.Int, room);
    dataRequest.input("roomId", sql.Int, room);
    whereClause += " AND al.room_id = @roomId";
  }

  dataRequest
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize);

  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS total
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Actions a ON a.action_id = al.action_id
    LEFT JOIN dbo.Users u ON u.user_id = al.actor_user_id
    ${whereClause}
  `);

  const dataResult = await dataRequest.query(`
    SELECT
      al.action_log_id AS id,
      a.code AS action_code,
      a.name AS action_name,
      ISNULL(a.code, a.name) AS action,
      al.old_value,
      al.new_value,
      al.[timestamp],
      al.status,
      al.actor_user_id AS user_id,
      CASE WHEN al.target_type = 'SENSOR' THEN al.target_id ELSE NULL END AS sensor_id,
      CASE WHEN al.target_type = 'DEVICE' THEN al.target_id ELSE NULL END AS device_id,
      ISNULL(NULLIF(u.full_name, ''), u.username) AS actor,
      al.room_id,
      r.name AS room_name,
      s.name AS sensor_name,
      d.device_name AS device_name,
      al.target_type,
      al.target_id
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Actions a ON a.action_id = al.action_id
    LEFT JOIN dbo.Users u ON u.user_id = al.actor_user_id
    LEFT JOIN dbo.Rooms r ON r.room_id = al.room_id
    LEFT JOIN dbo.Sensors s ON al.target_type = 'SENSOR' AND s.sensor_id = al.target_id
    LEFT JOIN dbo.Devices d ON al.target_type = 'DEVICE' AND d.device_id = al.target_id
    ${whereClause}
    ORDER BY al.[timestamp] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: dataResult.recordset,
    page: safePage,
    pageSize: safePageSize,
    total: Number(countResult.recordset[0]?.total || 0),
    filters: {
      from: from || null,
      to: to || null,
      actor: actor || null,
      action: action || null,
      roomId: roomId || null,
    },
  };
}

async function getAuditLogById(logId) {
  const pool = await getPool();
  const result = await pool.request().input("id", sql.BigInt, Number(logId))
    .query(`
    SELECT TOP 1
      al.action_log_id AS id,
      a.code AS action_code,
      a.name AS action_name,
      ISNULL(a.code, a.name) AS action,
      al.old_value,
      al.new_value,
      al.[timestamp],
      al.status,
      al.actor_user_id AS user_id,
      CASE WHEN al.target_type = 'SENSOR' THEN al.target_id ELSE NULL END AS sensor_id,
      CASE WHEN al.target_type = 'DEVICE' THEN al.target_id ELSE NULL END AS device_id,
      ISNULL(NULLIF(u.full_name, ''), u.username) AS actor,
      al.room_id,
      r.name AS room_name,
      s.name AS sensor_name,
      d.device_name AS device_name,
      al.target_type,
      al.target_id
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Actions a ON a.action_id = al.action_id
    LEFT JOIN dbo.Users u ON u.user_id = al.actor_user_id
    LEFT JOIN dbo.Rooms r ON r.room_id = al.room_id
    LEFT JOIN dbo.Sensors s ON al.target_type = 'SENSOR' AND s.sensor_id = al.target_id
    LEFT JOIN dbo.Devices d ON al.target_type = 'DEVICE' AND d.device_id = al.target_id
    WHERE al.action_log_id = @id
  `);

  const row = result.recordset[0];
  if (!row) {
    throw createHttpError("Audit log not found", 404);
  }

  return {
    ...row,
    payload: {
      oldValue: row.old_value,
      newValue: row.new_value,
      sensorId: row.sensor_id,
      roomId: row.room_id,
    },
  };
}

async function exportAuditLogs(payload) {
  return {
    jobId: `export-${Date.now()}`,
    format: payload?.format || "csv",
    status: "queued",
  };
}

module.exports = {
  listAuditLogs,
  getAuditLogById,
  exportAuditLogs,
};

const { sql, getPool } = require("../../../db");

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
    whereClause += " AND al.action_type LIKE @action";
  }
  if (roomId) {
    const room = Number(roomId);
    countRequest.input("roomId", sql.Int, room);
    dataRequest.input("roomId", sql.Int, room);
    whereClause += " AND s.room_id = @roomId";
  }

  dataRequest
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize);

  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS total
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Users u ON u.user_id = al.user_id
    LEFT JOIN dbo.Sensors s ON s.sensor_id = al.sensor_id
    ${whereClause}
  `);

  const dataResult = await dataRequest.query(`
    SELECT
      al.action_id AS id,
      al.action_type AS action,
      al.old_value,
      al.new_value,
      al.[timestamp],
      al.user_id,
      al.sensor_id,
      ISNULL(NULLIF(u.full_name, ''), u.username) AS actor,
      s.room_id,
      r.name AS room_name,
      s.name AS sensor_name
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Users u ON u.user_id = al.user_id
    LEFT JOIN dbo.Sensors s ON s.sensor_id = al.sensor_id
    LEFT JOIN dbo.Rooms r ON r.room_id = s.room_id
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
  const result = await pool.request().input("id", sql.Int, Number(logId))
    .query(`
    SELECT TOP 1
      al.action_id AS id,
      al.action_type AS action,
      al.old_value,
      al.new_value,
      al.[timestamp],
      al.user_id,
      al.sensor_id,
      ISNULL(NULLIF(u.full_name, ''), u.username) AS actor,
      s.room_id,
      r.name AS room_name,
      s.name AS sensor_name
    FROM dbo.ActionLog al
    LEFT JOIN dbo.Users u ON u.user_id = al.user_id
    LEFT JOIN dbo.Sensors s ON s.sensor_id = al.sensor_id
    LEFT JOIN dbo.Rooms r ON r.room_id = s.room_id
    WHERE al.action_id = @id
  `);

  const row = result.recordset[0];
  if (!row) {
    return {
      id: Number(logId),
      action: "",
      actor: "",
      payload: {},
    };
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

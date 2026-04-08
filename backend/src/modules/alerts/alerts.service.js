const { sql, getPool } = require("../../../db");

async function listAlerts({
  roomId,
  status,
  severity,
  page = 1,
  pageSize = 20,
}) {
  const safePage = Math.max(1, Number(page || 1));
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize || 20)));
  const offset = (safePage - 1) * safePageSize;
  const statusNormalized = String(status || "all").toLowerCase();
  const severityNormalized = String(severity || "all").toUpperCase();

  const pool = await getPool();
  const countRequest = pool.request();
  const dataRequest = pool.request();
  let whereClause = " WHERE 1=1";

  if (statusNormalized === "open") {
    whereClause += " AND ISNULL(a.is_resolved, 0) = 0";
  } else if (statusNormalized === "resolved") {
    whereClause += " AND ISNULL(a.is_resolved, 0) = 1";
  }

  if (severityNormalized !== "ALL") {
    countRequest.input("severity", sql.NVarChar(20), severityNormalized);
    dataRequest.input("severity", sql.NVarChar(20), severityNormalized);
    whereClause += " AND UPPER(ISNULL(a.severity, 'LOW')) = @severity";
  }

  if (roomId) {
    const room = Number(roomId);
    countRequest.input("roomId", sql.Int, room);
    dataRequest.input("roomId", sql.Int, room);
    whereClause += `
      AND EXISTS (
        SELECT 1
        FROM dbo.Sensors s
        WHERE s.threshold_id = a.threshold_id
          AND s.room_id = @roomId
      )
    `;
  }

  dataRequest
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize);

  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS total
    FROM dbo.Alerts a
    ${whereClause}
  `);

  const dataResult = await dataRequest.query(`
    SELECT
      a.alert_id AS id,
      a.threshold_id,
      a.triggered_value,
      a.message,
      a.severity,
      a.is_resolved,
      a.[timestamp],
      CASE WHEN ISNULL(a.is_resolved, 0) = 1 THEN 'RESOLVED' ELSE 'OPEN' END AS status
    FROM dbo.Alerts a
    ${whereClause}
    ORDER BY a.[timestamp] DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: dataResult.recordset,
    filters: {
      roomId: roomId || null,
      status: status || "all",
      severity: severity || "all",
      page: safePage,
      pageSize: safePageSize,
    },
    total: Number(countResult.recordset[0]?.total || 0),
  };
}

async function getAlertById(alertId) {
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(alertId))
    .query(`
    SELECT TOP 1
      a.alert_id AS id,
      a.threshold_id,
      a.triggered_value,
      a.message,
      a.severity,
      a.is_resolved,
      a.[timestamp],
      CASE WHEN ISNULL(a.is_resolved, 0) = 1 THEN 'RESOLVED' ELSE 'OPEN' END AS status
    FROM dbo.Alerts a
    WHERE a.alert_id = @id
  `);

  return (
    result.recordset[0] || {
      id: Number(alertId),
      status: "OPEN",
      severity: "MEDIUM",
      message: "",
    }
  );
}

async function acknowledgeAlert(alertId) {
  return {
    id: Number(alertId),
    acknowledged: true,
  };
}

async function resolveAlert(alertId) {
  return {
    id: Number(alertId),
    resolved: true,
  };
}

async function assignAlert(alertId, payload) {
  return {
    id: Number(alertId),
    assignedTo: payload?.assignedTo || null,
    note: payload?.note || "",
    assigned: true,
  };
}

module.exports = {
  listAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  assignAlert,
};

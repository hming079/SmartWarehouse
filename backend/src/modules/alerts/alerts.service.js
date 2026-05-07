const { sql, getPool } = require("../../../db");

let alertSchemaEnsured = false;

async function ensureAlertSchema() {
  if (alertSchemaEnsured) {
    return;
  }

  const pool = await getPool();
  const columnsResult = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'Alerts'
  `);

  const columnNames = new Set(columnsResult.recordset.map((row) => row.COLUMN_NAME));
  if (!columnNames.has("rule_id")) {
    await pool.request().query(`ALTER TABLE dbo.Alerts ADD rule_id INT NULL`);
  }

  const fkResult = await pool.request().query(`
    SELECT name
    FROM sys.foreign_keys
    WHERE name = 'FK_Alerts_AutomationRule'
  `);

  if (fkResult.recordset.length === 0) {
    await pool.request().query(`
      ALTER TABLE dbo.Alerts
      ADD CONSTRAINT FK_Alerts_AutomationRule
      FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id) ON DELETE SET NULL
    `);
  }

  alertSchemaEnsured = true;
}

async function listAlerts({
  roomId,
  status,
  severity,
  page = 1,
  pageSize = 20,
}) {
  await ensureAlertSchema();
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
      AND (
        EXISTS (
          SELECT 1
          FROM dbo.Sensors s
          WHERE s.threshold_id = a.threshold_id
            AND s.room_id = @roomId
        )
        OR EXISTS (
          SELECT 1
          FROM dbo.AutomationRules ar
          WHERE ar.rule_id = a.rule_id
            AND ar.room_id = @roomId
        )
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
      a.rule_id,
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

async function hasOpenAlertForRule(ruleId) {
  if (!ruleId) {
    return false;
  }

  await ensureAlertSchema();
  const pool = await getPool();
  const result = await pool
    .request()
    .input("rule_id", sql.Int, Number(ruleId))
    .query(`
      SELECT TOP 1 1
      FROM dbo.Alerts a
      WHERE a.rule_id = @rule_id
        AND ISNULL(a.is_resolved, 0) = 0
    `);

  return result.recordset.length > 0;
}

async function getAlertById(alertId) {
  await ensureAlertSchema();
  const pool = await getPool();
  const result = await pool.request().input("id", sql.Int, Number(alertId))
    .query(`
    SELECT TOP 1
      a.alert_id AS id,
      a.threshold_id,
      a.rule_id,
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
  await ensureAlertSchema();
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(alertId))
    .query(`UPDATE dbo.Alerts SET is_resolved = 1 WHERE alert_id = @id`);
  return getAlertById(alertId);
}

async function resolveAlert(alertId) {
  await ensureAlertSchema();
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(alertId))
    .query(`UPDATE dbo.Alerts SET is_resolved = 1 WHERE alert_id = @id`);
  return getAlertById(alertId);
}

async function toggleResolveAlert(alertId) {
  await ensureAlertSchema();
  const pool = await getPool();
  const alert = await getAlertById(alertId);
  const newStatus = alert.is_resolved ? 0 : 1;
  await pool
    .request()
    .input("id", sql.Int, Number(alertId))
    .input("status", sql.Bit, newStatus)
    .query(`UPDATE dbo.Alerts SET is_resolved = @status WHERE alert_id = @id`);
  return getAlertById(alertId);
}

async function assignAlert(alertId, payload) {
  return {
    id: Number(alertId),
    assignedTo: payload?.assignedTo || null,
    note: payload?.note || "",
    assigned: true,
  };
}

async function createAlert({
  thresholdId,
  triggeredValue,
  message,
  severity,
  ruleId,
}) {
  await ensureAlertSchema();
  const pool = await getPool();

  try {
    const nextIdResult = await pool.request().query(`
      SELECT ISNULL(MAX(alert_id), 0) + 1 AS next_id
      FROM dbo.Alerts
    `);
    const nextAlertId = Number(nextIdResult.recordset?.[0]?.next_id || 1);

    const result = await pool
      .request()
      .input("alert_id", sql.Int, nextAlertId)
      .input("threshold_id", sql.Int, thresholdId || null)
      .input("triggered_value", sql.Float, Number(triggeredValue))
      .input("message", sql.NVarChar, String(message || "Alert triggered"))
      .input("severity", sql.NVarChar(20), String(severity || "MEDIUM").toUpperCase())
      .input("rule_id", sql.Int, ruleId || null)
      .query(`
        INSERT INTO dbo.Alerts (alert_id, threshold_id, rule_id, triggered_value, message, severity, is_resolved, [timestamp])
        OUTPUT INSERTED.alert_id
        VALUES (@alert_id, @threshold_id, @rule_id, @triggered_value, @message, @severity, 0, SYSUTCDATETIME())
      `);

    const alertId = result.recordset?.[0]?.alert_id;
    return {
      alert_id: alertId,
      threshold_id: thresholdId,
      rule_id: ruleId || null,
      triggered_value: Number(triggeredValue),
      message,
      severity: String(severity || "MEDIUM").toUpperCase(),
      is_resolved: 0,
    };
  } catch (err) {
    console.error("Error creating alert:", err.message);
    throw err;
  }
}

module.exports = {
  listAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  toggleResolveAlert,
  assignAlert,
  createAlert,
  hasOpenAlertForRule,
};

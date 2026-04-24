const { sql, getPool } = require("../../../db");

function rangeToHours(range) {
  const normalized = String(range || "24h").toLowerCase();
  if (normalized === "7d") return 24 * 7;
  if (normalized === "30d") return 24 * 30;
  return 24;
}

function metricToSensorType(metric) {
  const normalized = String(metric || "temperature").toLowerCase();
  if (normalized.includes("power")) return "POWER";
  if (normalized.includes("humid")) return "HUMIDITY";
  return "TEMPERATURE";
}

async function getOverview() {
  const pool = await getPool();
  const [
    activeDevicesRes,
    totalDevicesRes,
    openAlertsRes,
    roomsOnlineRes,
    latestRes,
  ] = await Promise.all([
    pool
      .request()
      .query(
        "SELECT COUNT(*) AS total FROM dbo.Devices WHERE device_status = 'ON'",
      ),
    pool.request().query("SELECT COUNT(*) AS total FROM dbo.Devices"),
    pool
      .request()
      .query(
        "SELECT COUNT(*) AS total FROM dbo.Alerts WHERE ISNULL(is_resolved,0)=0",
      ),
    pool
      .request()
      .query(
        "SELECT COUNT(DISTINCT room_id) AS total FROM dbo.Sensors WHERE room_id IS NOT NULL",
      ),
    pool.request().query(`
      SELECT TOP 1
        AVG(CASE WHEN s.type='TEMPERATURE' THEN sd.value END) AS temperature,
        AVG(CASE WHEN s.type='HUMIDITY' THEN sd.value END) AS humidity,
        AVG(CASE WHEN s.type='POWER' THEN sd.value END) AS power
      FROM dbo.SensorData sd
      INNER JOIN dbo.Sensors s ON s.sensor_id = sd.sensor_id
      GROUP BY sd.[timestamp]
      ORDER BY sd.[timestamp] DESC
    `),
  ]);

  return {
    cards: {
      activeDevices: Number(activeDevicesRes.recordset[0]?.total || 0),
      totalDevices: Number(totalDevicesRes.recordset[0]?.total || 0),
      openAlerts: Number(openAlertsRes.recordset[0]?.total || 0),
      roomsOnline: Number(roomsOnlineRes.recordset[0]?.total || 0),
    },
    latest: {
      temperature: latestRes.recordset[0]?.temperature ?? null,
      humidity: latestRes.recordset[0]?.humidity ?? null,
      power: latestRes.recordset[0]?.power ?? null,
    },
  };
}

async function getTimeseries({ roomId, metric, range }) {
  const pool = await getPool();
  const selectedMetric = metric || "temperature";
  const selectedRange = range || "24h";
  const request = pool
    .request()
    .input("sensorType", sql.NVarChar(20), metricToSensorType(selectedMetric))
    .input("hours", sql.Int, rangeToHours(selectedRange));

  let roomClause = "";
  if (roomId) {
    request.input("roomId", sql.Int, Number(roomId));
    roomClause = " AND s.room_id = @roomId";
  }

  const result = await request.query(`
    SELECT
      sd.[timestamp],
      AVG(sd.value) AS value
    FROM dbo.SensorData sd
    INNER JOIN dbo.Sensors s ON s.sensor_id = sd.sensor_id
    WHERE s.type = @sensorType
      AND sd.[timestamp] >= DATEADD(HOUR, -@hours, GETDATE())
      ${roomClause}
    GROUP BY sd.[timestamp]
    ORDER BY sd.[timestamp] ASC
  `);

  return {
    roomId: roomId || null,
    metric: selectedMetric,
    range: selectedRange,
    points: result.recordset,
  };
}

async function getDeviceStatus({ roomId }) {
  const pool = await getPool();
  const summaryRequest = pool.request();
  const itemsRequest = pool.request();
  let whereClause = "";

  if (roomId) {
    const room = Number(roomId);
    summaryRequest.input("roomId", sql.Int, room);
    itemsRequest.input("roomId", sql.Int, room);
    whereClause = " WHERE d.room_id = @roomId";
  }

  const [summaryRes, itemsRes] = await Promise.all([
    summaryRequest.query(`
      SELECT
        SUM(CASE WHEN d.device_status='ON' THEN 1 ELSE 0 END) AS online,
        SUM(CASE WHEN d.device_status='OFF' THEN 1 ELSE 0 END) AS offline,
        COUNT(*) AS total
      FROM dbo.Devices d
      ${whereClause}
    `),
    itemsRequest.query(`
      SELECT
        d.device_id AS id,
        d.room_id,
        d.device_type AS type,
        d.device_status AS status,
        d.last_update_time,
        r.name AS room_name
      FROM dbo.Devices d
      LEFT JOIN dbo.Rooms r ON r.room_id = d.room_id
      ${whereClause}
      ORDER BY d.device_id DESC
    `),
  ]);

  return {
    roomId: roomId || null,
    summary: {
      online: Number(summaryRes.recordset[0]?.online || 0),
      offline: Number(summaryRes.recordset[0]?.offline || 0),
      total: Number(summaryRes.recordset[0]?.total || 0),
    },
    items: itemsRes.recordset,
  };
}

async function getAlertsSummary({ range }) {
  const selectedRange = range || "24h";
  const pool = await getPool();
  const result = await pool
    .request()
    .input("hours", sql.Int, rangeToHours(selectedRange)).query(`
      SELECT LOWER(ISNULL(severity, 'low')) AS severity, COUNT(*) AS total
      FROM dbo.Alerts
      WHERE [timestamp] >= DATEADD(HOUR, -@hours, GETDATE())
      GROUP BY LOWER(ISNULL(severity, 'low'))
    `);

  const bySeverity = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const row of result.recordset) {
    if (Object.prototype.hasOwnProperty.call(bySeverity, row.severity)) {
      bySeverity[row.severity] = Number(row.total || 0);
    }
  }

  return {
    range: selectedRange,
    bySeverity,
    total: Object.values(bySeverity).reduce((sum, item) => sum + item, 0),
  };
}

module.exports = {
  getOverview,
  getTimeseries,
  getDeviceStatus,
  getAlertsSummary,
};

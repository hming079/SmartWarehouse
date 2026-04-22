const { sql, getPool } = require("../../../../db");
const { redisGet } = require("../../../utils/redis");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listRooms(floorId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("floor_id", sql.Int, floorId)
    .query(
      "SELECT room_id, floor_id, name, description FROM Rooms WHERE floor_id = @floor_id ORDER BY room_id",
    );

  return result.recordset;
}

async function createRoom({ floor_id, name, description }) {
  const pool = await getPool();
  const nextIdResult = await pool
    .request()
    .query("SELECT ISNULL(MAX(room_id), 0) + 1 AS nextId FROM Rooms");

  const nextId = nextIdResult.recordset[0].nextId;

  await pool
    .request()
    .input("room_id", sql.Int, nextId)
    .input("floor_id", sql.Int, Number(floor_id))
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || "")
    .query(
      "INSERT INTO Rooms (room_id, floor_id, name, description) VALUES (@room_id, @floor_id, @name, @description)",
    );

  return {
    room_id: nextId,
    floor_id: Number(floor_id),
    name,
    description: description || "",
  };
}

async function updateRoom(roomId, { floor_id, name, description }) {
  const pool = await getPool();
  await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .input("floor_id", sql.Int, Number(floor_id))
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || "")
    .query(
      "UPDATE Rooms SET floor_id = @floor_id, name = @name, description = @description WHERE room_id = @room_id",
    );

  return {
    room_id: Number(roomId),
    floor_id: Number(floor_id),
    name,
    description: description || "",
  };
}

async function deleteRoom(roomId) {
  const pool = await getPool();
  await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .query("DELETE FROM Rooms WHERE room_id = @room_id");
}

async function getRoomSummary(roomId) {
  const pool = await getPool();

  const roomResult = await pool
    .request()
    .input("roomId", sql.Int, Number(roomId))
    .query("SELECT TOP 1 room_id, name FROM dbo.Rooms WHERE room_id = @roomId");

  if (!roomResult.recordset[0]) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  const metricsResult = await pool
    .request()
    .input("roomId", sql.Int, Number(roomId)).query(`
    SELECT
      AVG(CASE WHEN s.type = 'TEMPERATURE' THEN s.last_update END) AS avg_temperature,
      AVG(CASE WHEN s.type = 'HUMIDITY' THEN s.last_update END) AS avg_humidity,
      AVG(CASE WHEN s.type = 'CO2' THEN s.last_update END) AS avg_co2,
      AVG(CASE WHEN s.type = 'SMOKE' THEN s.last_update END) AS avg_smoke,
      COUNT(*) AS sensors_total,
      SUM(
        CASE
          WHEN s.last_connection IS NOT NULL
            AND s.last_connection >= DATEADD(MINUTE, -5, SYSUTCDATETIME())
            THEN 1
          ELSE 0
        END
      ) AS sensors_online
    FROM dbo.Sensors s
    WHERE s.room_id = @roomId
  `);

  const metrics = metricsResult.recordset[0] || {};
  const summary = {
    room_id: Number(roomId),
    room_name: roomResult.recordset[0].name,
    generated_at: new Date().toISOString(),
    averages: {
      temperature: metrics.avg_temperature,
      humidity: metrics.avg_humidity,
      co2: metrics.avg_co2,
      smoke: metrics.avg_smoke,
    },
    health: {
      sensors_total: Number(metrics.sensors_total || 0),
      sensors_online: Number(metrics.sensors_online || 0),
      sensors_offline:
        Number(metrics.sensors_total || 0) -
        Number(metrics.sensors_online || 0),
    },
    source: "database",
  };

  return summary;
}

async function getRoomMetrics(roomId) {
  const id = Number(roomId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("room id is required", 400);
  }

  const prefix = process.env.REDIS_ROOM_METRICS_KEY_PREFIX || "room:metrics:";
  const key = `${prefix}${id}`;

  const raw = await redisGet(key);
  if (!raw) {
    return { temperature: null, humidity: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    throw createHttpError("Room metrics cache is not valid JSON", 502);
  }

  const temperature =
    parsed?.temperature ?? parsed?.averages?.temperature ?? null;
  const humidity = parsed?.humidity ?? parsed?.averages?.humidity ?? null;

  return {
    temperature: temperature === null ? null : Number(temperature),
    humidity: humidity === null ? null : Number(humidity),
  };
}

module.exports = {
  listRooms,
  getRoomSummary,
  getRoomMetrics,
  createRoom,
  updateRoom,
  deleteRoom,
};

const { sql, getPool } = require("../../../../db");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureSensorLastValueColumn() {
  const pool = await getPool();
  await pool.request().batch(`
    IF COL_LENGTH('dbo.Sensors', 'last_value') IS NULL
    BEGIN
      ALTER TABLE dbo.Sensors ADD last_value FLOAT NULL;
    END;
  `);
}

async function listRooms(floorId) {
  const pool = await getPool();
  
  if (!floorId) {
    // Return all rooms if floorId not provided
    const result = await pool
      .request()
      .query(
        `SELECT r.room_id, r.floor_id, r.food_type_id, r.name, r.description, ft.name AS food_type_name
         FROM Rooms r
         LEFT JOIN FoodTypes ft ON ft.type_id = r.food_type_id
         ORDER BY r.room_id`,
      );
    return result.recordset;
  }

  const result = await pool
    .request()
    .input("floor_id", sql.Int, floorId)
    .query(
      `SELECT r.room_id, r.floor_id, r.food_type_id, r.name, r.description, ft.name AS food_type_name
       FROM Rooms r
       LEFT JOIN FoodTypes ft ON ft.type_id = r.food_type_id
       WHERE r.floor_id = @floor_id
       ORDER BY r.room_id`,
    );

  return result.recordset;
}

async function createRoom({ floor_id, food_type_id, name, description }) {
  const pool = await getPool();
  const nextIdResult = await pool
    .request()
    .query("SELECT ISNULL(MAX(room_id), 0) + 1 AS nextId FROM Rooms");

  const nextId = nextIdResult.recordset[0].nextId;

  await pool
    .request()
    .input("room_id", sql.Int, nextId)
    .input("floor_id", sql.Int, Number(floor_id))
    .input("food_type_id", sql.Int, Number(food_type_id))
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || "")
    .query(
      "INSERT INTO Rooms (room_id, floor_id, food_type_id, name, description) VALUES (@room_id, @floor_id, @food_type_id, @name, @description)",
    );

  const typeResult = await pool
    .request()
    .input("food_type_id", sql.Int, Number(food_type_id))
    .query("SELECT name FROM FoodTypes WHERE type_id = @food_type_id");

  const foodTypeName = typeResult.recordset[0]?.name || null;

  return {
    room_id: nextId,
    floor_id: Number(floor_id),
    food_type_id: Number(food_type_id),
    food_type_name: foodTypeName,
    name,
    description: description || "",
  };
}

async function updateRoom(roomId, { floor_id, name, description }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .input("floor_id", sql.Int, Number(floor_id))
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || "")
    .query(`
      UPDATE Rooms
      SET floor_id = @floor_id, name = @name, description = @description
      WHERE room_id = @room_id;

      SELECT @@ROWCOUNT AS affected;
    `);

  const affected = Number(result.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    throw createHttpError("Room not found", 404);
  }

  const typeResult = await pool
    .request()
    .input("food_type_id", sql.Int, Number(food_type_id))
    .query("SELECT name FROM FoodTypes WHERE type_id = @food_type_id");

  const foodTypeName = typeResult.recordset[0]?.name || null;

  return {
    room_id: Number(roomId),
    floor_id: Number(floor_id),
    food_type_id: Number(food_type_id),
    food_type_name: foodTypeName,
    name,
    description: description || "",
  };
}

async function deleteRoom(roomId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .query(`
      DELETE FROM Rooms
      WHERE room_id = @room_id;

      SELECT @@ROWCOUNT AS affected;
    `);

  const affected = Number(result.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    throw createHttpError("Room not found", 404);
  }
}

async function getRoomSummary(roomId) {
  await ensureSensorLastValueColumn();
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
      AVG(CASE WHEN s.type = 'TEMPERATURE' THEN COALESCE(s.last_value, s.last_update) END) AS avg_temperature,
      AVG(CASE WHEN s.type = 'HUMIDITY' THEN COALESCE(s.last_value, s.last_update) END) AS avg_humidity,
      AVG(CASE WHEN s.type = 'CO2' THEN COALESCE(s.last_value, s.last_update) END) AS avg_co2,
      AVG(CASE WHEN s.type = 'SMOKE' THEN COALESCE(s.last_value, s.last_update) END) AS avg_smoke,
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
  await ensureSensorLastValueColumn();
  const id = Number(roomId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError("room id is required", 400);
  }

  const pool = await getPool();
  const result = await pool.request().input("roomId", sql.Int, id).query(`
    SELECT
      AVG(CASE WHEN s.type = 'TEMPERATURE' THEN COALESCE(s.last_value, s.last_update) END) AS temperature,
      AVG(CASE WHEN s.type = 'HUMIDITY' THEN COALESCE(s.last_value, s.last_update) END) AS humidity
    FROM dbo.Sensors s
    WHERE s.room_id = @roomId
  `);

  const row = result.recordset?.[0] || {};
  const temperature = row.temperature ?? null;
  const humidity = row.humidity ?? null;

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

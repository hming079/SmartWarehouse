const { sql, getPool } = require("../../../../db");

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

async function updateRoom(roomId, { floor_id, food_type_id, name, description }) {
  const pool = await getPool();
  await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .input("floor_id", sql.Int, Number(floor_id))
    .input("food_type_id", sql.Int, Number(food_type_id))
    .input("name", sql.NVarChar, name)
    .input("description", sql.NVarChar, description || "")
    .query(
      "UPDATE Rooms SET floor_id = @floor_id, food_type_id = @food_type_id, name = @name, description = @description WHERE room_id = @room_id",
    );

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
  await pool
    .request()
    .input("room_id", sql.Int, roomId)
    .query("DELETE FROM Rooms WHERE room_id = @room_id");
}

module.exports = {
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};

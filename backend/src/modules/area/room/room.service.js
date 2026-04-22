const { sql, getPool } = require("../../../../db");

async function listRooms(floorId) {
  const pool = await getPool();
  
  if (!floorId) {
    // Return all rooms if floorId not provided
    const result = await pool
      .request()
      .query(
        "SELECT room_id, floor_id, name, description FROM Rooms ORDER BY room_id",
      );
    return result.recordset;
  }

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

module.exports = {
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};

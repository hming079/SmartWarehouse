const express = require("express");
const { sql, getPool } = require("../../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const floorId = Number(req.query.floorId);
    if (!floorId) {
      return res.status(400).json({ message: "floorId is required" });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("floor_id", sql.Int, floorId)
      .query("SELECT room_id, floor_id, name, description FROM Rooms WHERE floor_id = @floor_id ORDER BY room_id");

    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { floor_id, name, description } = req.body;

    if (!floor_id || !name) {
      return res.status(400).json({ message: "floor_id and name are required" });
    }

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
      .query("INSERT INTO Rooms (room_id, floor_id, name, description) VALUES (@room_id, @floor_id, @name, @description)");

    res.status(201).json({ room_id: nextId, floor_id: Number(floor_id), name, description: description || "" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    if (!roomId) {
      return res.status(400).json({ message: "room id is required" });
    }

    const pool = await getPool();
    await pool.request().input("room_id", sql.Int, roomId).query("DELETE FROM Rooms WHERE room_id = @room_id");

    res.json({ message: "Room deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


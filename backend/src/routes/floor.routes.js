const express = require("express");
const { sql, getPool } = require("../../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const zoneId = Number(req.query.zoneId);
    if (!zoneId) {
      return res.status(400).json({ message: "zoneId is required" });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("zone_id", sql.Int, zoneId)
      .query("SELECT floor_id, zone_id, floor_number FROM Floor WHERE zone_id = @zone_id ORDER BY floor_number");

    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { zone_id, floor_number } = req.body;

    if (!zone_id || floor_number === undefined || floor_number === null) {
      return res.status(400).json({ message: "zone_id and floor_number are required" });
    }

    const pool = await getPool();
    const nextIdResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(floor_id), 0) + 1 AS nextId FROM Floor");

    const nextId = nextIdResult.recordset[0].nextId;

    await pool
      .request()
      .input("floor_id", sql.Int, nextId)
      .input("zone_id", sql.Int, Number(zone_id))
      .input("floor_number", sql.Int, Number(floor_number))
      .query("INSERT INTO Floor (floor_id, zone_id, floor_number) VALUES (@floor_id, @zone_id, @floor_number)");

    res.status(201).json({ floor_id: nextId, zone_id: Number(zone_id), floor_number: Number(floor_number) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const floorId = Number(req.params.id);
    if (!floorId) {
      return res.status(400).json({ message: "floor id is required" });
    }

    const pool = await getPool();
    await pool.request().input("floor_id", sql.Int, floorId).query("DELETE FROM Floor WHERE floor_id = @floor_id");

    res.json({ message: "Floor deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


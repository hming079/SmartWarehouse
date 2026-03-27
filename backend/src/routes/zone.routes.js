const express = require("express");
const { sql, getPool } = require("../../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const locationId = Number(req.query.locationId);
    if (!locationId) {
      return res.status(400).json({ message: "locationId is required" });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("location_id", sql.Int, locationId)
      .query("SELECT zone_id, location_id, name FROM Zones WHERE location_id = @location_id ORDER BY zone_id");

    res.json({ data: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { location_id, name } = req.body;

    if (!location_id || !name) {
      return res.status(400).json({ message: "location_id and name are required" });
    }

    const pool = await getPool();
    const nextIdResult = await pool
      .request()
      .query("SELECT ISNULL(MAX(zone_id), 0) + 1 AS nextId FROM Zones");

    const nextId = nextIdResult.recordset[0].nextId;

    await pool
      .request()
      .input("zone_id", sql.Int, nextId)
      .input("location_id", sql.Int, Number(location_id))
      .input("name", sql.NVarChar, name)
      .query("INSERT INTO Zones (zone_id, location_id, name) VALUES (@zone_id, @location_id, @name)");

    res.status(201).json({ zone_id: nextId, location_id: Number(location_id), name });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const zoneId = Number(req.params.id);
    if (!zoneId) {
      return res.status(400).json({ message: "zone id is required" });
    }

    const pool = await getPool();
    await pool.request().input("zone_id", sql.Int, zoneId).query("DELETE FROM Zones WHERE zone_id = @zone_id");

    res.json({ message: "Zone deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


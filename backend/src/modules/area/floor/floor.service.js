const { sql, getPool } = require("../../../../db");

async function listFloors(zoneId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("zone_id", sql.Int, zoneId)
    .query(
      "SELECT floor_id, zone_id, floor_number FROM Floor WHERE zone_id = @zone_id ORDER BY floor_number",
    );

  return result.recordset;
}

async function createFloor({ zone_id, floor_number }) {
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
    .query(
      "INSERT INTO Floor (floor_id, zone_id, floor_number) VALUES (@floor_id, @zone_id, @floor_number)",
    );

  return {
    floor_id: nextId,
    zone_id: Number(zone_id),
    floor_number: Number(floor_number),
  };
}

async function updateFloor(floorId, { zone_id, floor_number }) {
  const pool = await getPool();
  await pool
    .request()
    .input("floor_id", sql.Int, floorId)
    .input("zone_id", sql.Int, Number(zone_id))
    .input("floor_number", sql.Int, Number(floor_number))
    .query(
      "UPDATE Floor SET zone_id = @zone_id, floor_number = @floor_number WHERE floor_id = @floor_id",
    );

  return {
    floor_id: Number(floorId),
    zone_id: Number(zone_id),
    floor_number: Number(floor_number),
  };
}

async function deleteFloor(floorId) {
  const pool = await getPool();
  await pool
    .request()
    .input("floor_id", sql.Int, floorId)
    .query("DELETE FROM Floor WHERE floor_id = @floor_id");
}

module.exports = {
  listFloors,
  createFloor,
  updateFloor,
  deleteFloor,
};

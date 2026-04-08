const { sql, getPool } = require("../../../../db");

async function listZones(locationId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("location_id", sql.Int, locationId)
    .query(
      "SELECT zone_id, location_id, name FROM Zones WHERE location_id = @location_id ORDER BY zone_id",
    );

  return result.recordset;
}

async function createZone({ location_id, name }) {
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
    .query(
      "INSERT INTO Zones (zone_id, location_id, name) VALUES (@zone_id, @location_id, @name)",
    );

  return { zone_id: nextId, location_id: Number(location_id), name };
}

async function updateZone(zoneId, { location_id, name }) {
  const pool = await getPool();
  await pool
    .request()
    .input("zone_id", sql.Int, zoneId)
    .input("location_id", sql.Int, Number(location_id))
    .input("name", sql.NVarChar, name)
    .query(
      "UPDATE Zones SET location_id = @location_id, name = @name WHERE zone_id = @zone_id",
    );

  return { zone_id: Number(zoneId), location_id: Number(location_id), name };
}

async function deleteZone(zoneId) {
  const pool = await getPool();
  await pool
    .request()
    .input("zone_id", sql.Int, zoneId)
    .query("DELETE FROM Zones WHERE zone_id = @zone_id");
}

module.exports = {
  listZones,
  createZone,
  updateZone,
  deleteZone,
};

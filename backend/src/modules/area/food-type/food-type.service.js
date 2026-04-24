const { getPool } = require("../../../../db");

async function listFoodTypes() {
  const pool = await getPool();
  const result = await pool
    .request()
    .query("SELECT type_id, name, storage_instructions FROM FoodTypes ORDER BY type_id");

  return result.recordset;
}

module.exports = {
  listFoodTypes,
};

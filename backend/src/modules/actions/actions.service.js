const { sql, getPool } = require("../../../db");

async function listActions() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      action_id,
      action_name
    FROM dbo.Actions
    ORDER BY action_name ASC
  `);

  return result.recordset;
}

module.exports = {
  listActions,
};

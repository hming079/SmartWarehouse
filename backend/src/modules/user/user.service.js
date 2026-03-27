const { getPool } = require("../../../db");

async function getUsers() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT user_id, role_id, username, email, full_name, is_active, last_login
    FROM dbo.Users
    ORDER BY user_id
  `);
  return result.recordset;
}

module.exports = {
  getUsers,
};

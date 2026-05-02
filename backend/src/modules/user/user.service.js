const bcrypt = require("bcrypt");
const { getPool } = require("../../../db");

async function getUsers() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT u.user_id, u.role_id, r.role_name, u.username, u.email, u.full_name, u.is_active, u.last_login
    FROM dbo.Users u
    LEFT JOIN dbo.Role r ON r.role_id = u.role_id
    ORDER BY u.user_id
  `);
  return result.recordset;
}

async function createUser({ username, password, full_name, email, role_name = "staff" }) {
  const pool = await getPool();
  const roleResult = await pool.request().input("roleName", role_name).query(`
    SELECT TOP 1 role_id, role_name FROM dbo.Role WHERE LOWER(role_name) = LOWER(@roleName)
  `);
  const role = roleResult.recordset[0];
  if (!role) {
    const error = new Error("Invalid role_name. Use manager or staff");
    error.statusCode = 400;
    throw error;
  }

  const existing = await pool.request().input("username", username).query(`
    SELECT TOP 1 user_id FROM dbo.Users WHERE username = @username
  `);
  if (existing.recordset[0]) {
    const error = new Error("Username already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool
    .request()
    .input("username", username)
    .input("password", passwordHash)
    .input("email", email || null)
    .input("fullName", full_name || username)
    .input("roleId", role.role_id)
    .query(`
      INSERT INTO dbo.Users (user_id, role_id, username, password_hash, email, full_name, is_active)
      VALUES ((SELECT ISNULL(MAX(user_id), 0) + 1 FROM dbo.Users), @roleId, @username, @password, @email, @fullName, 1)
    `);
}

async function ensureInitialAuthData() {
  const pool = await getPool();
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE LOWER(role_name) = 'manager')
      INSERT INTO dbo.Role (role_id, role_name) VALUES (1, 'manager');
    IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE LOWER(role_name) = 'staff')
      INSERT INTO dbo.Role (role_id, role_name) VALUES (2, 'staff');

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE username = 'admin')
      INSERT INTO dbo.Users (user_id, role_id, username, password_hash, email, full_name, is_active)
      VALUES ((SELECT ISNULL(MAX(user_id), 0) + 1 FROM dbo.Users), 1, 'admin', 'admin', 'admin@local', 'Administrator', 1);
  `);

  const usersResult = await pool.request().query(`
    SELECT user_id, password_hash FROM dbo.Users WHERE password_hash IS NOT NULL
  `);

  for (const user of usersResult.recordset) {
    const passwordHash = user.password_hash;
    if (typeof passwordHash === "string" && passwordHash.startsWith("$2")) {
      continue;
    }

    const migratedHash = await bcrypt.hash(String(passwordHash), 10);
    await pool
      .request()
      .input("userId", user.user_id)
      .input("passwordHash", migratedHash)
      .query(`
        UPDATE dbo.Users
        SET password_hash = @passwordHash
        WHERE user_id = @userId
      `);
  }
}

module.exports = {
  getUsers,
  createUser,
  ensureInitialAuthData,
};

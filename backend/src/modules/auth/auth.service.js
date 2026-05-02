const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { getPool } = require("../../../db");

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "smartwarehouse-dev-secret";
const TOKEN_EXPIRES_IN_SECONDS = Number(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS || 60 * 60 * 8);
const revokedTokens = new Set();

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token) {
    throw new Error("Missing token");
  }

  if (revokedTokens.has(token)) {
    throw new Error("Token has been revoked");
  }

  const [headerEncoded, payloadEncoded, signature] = token.split(".");
  if (!headerEncoded || !payloadEncoded || !signature) {
    throw new Error("Invalid token format");
  }

  const data = `${headerEncoded}.${payloadEncoded}`;
  const expectedSignature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (expectedSignature !== signature) {
    throw new Error("Invalid token signature");
  }

  const payloadJson = Buffer.from(payloadEncoded, "base64").toString("utf8");
  const payload = JSON.parse(payloadJson);

  if (!payload.exp || Date.now() >= payload.exp * 1000) {
    throw new Error("Token expired");
  }

  return payload;
}

async function login({ username, password }) {
  if (!username || !password) {
    const error = new Error("username and password are required");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("username", username)
    .query(`
      SELECT TOP 1 u.user_id, u.role_id, r.role_name, u.username, u.password_hash, u.email, u.full_name, u.is_active
      FROM dbo.Users u
      LEFT JOIN dbo.Role r ON r.role_id = u.role_id
      WHERE u.username = @username
    `);

  const user = result.recordset[0];
  if (!user || !user.is_active) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isBcryptHash = typeof user.password_hash === "string" && user.password_hash.startsWith("$2");
  const validPassword = isBcryptHash
    ? await bcrypt.compare(password, user.password_hash)
    : user.password_hash === password;

  if (!validPassword) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (!isBcryptHash) {
    const migratedHash = await bcrypt.hash(password, 10);
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

  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.user_id,
    username: user.username,
    role_id: user.role_id,
    role_name: user.role_name || null,
    exp: nowSec + TOKEN_EXPIRES_IN_SECONDS,
  };

  const token = signToken(payload);

  await pool.request().input("userId", user.user_id).query(`
      UPDATE dbo.Users
      SET last_login = SYSUTCDATETIME()
      WHERE user_id = @userId
    `);

  return {
    token,
    user: {
      user_id: user.user_id,
      role_id: user.role_id,
      role_name: user.role_name || null,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      is_active: user.is_active,
    },
  };
}

function logout(token) {
  if (token) {
    revokedTokens.add(token);
  }
}

module.exports = {
  login,
  logout,
  verifyToken,
};

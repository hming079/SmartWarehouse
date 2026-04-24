const { sql, getPool } = require("../../../db");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeTargetType(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  return normalized;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value);
  return str.length ? str : null;
}

function toJsonStringOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

async function getOrCreateAction({
  code,
  name,
  domain = null,
  createdByUserId = null,
  isActive = true,
  transaction = null,
} = {}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    throw createHttpError("Missing action code", 400);
  }

  const pool = await getPool();
  const request = transaction ? new sql.Request(transaction) : pool.request();
  request.input("code", sql.NVarChar(50), normalizedCode);

  const existing = await request.query(`
    SELECT TOP 1
      action_id,
      code,
      name,
      domain,
      created_by_user_id,
      is_active,
      created_at
    FROM dbo.Actions
    WHERE code = @code
  `);

  if (existing.recordset.length > 0) {
    return existing.recordset[0];
  }

  const insertRequest = transaction
    ? new sql.Request(transaction)
    : (await getPool()).request();

  insertRequest
    .input("code", sql.NVarChar(50), normalizedCode)
    .input("name", sql.NVarChar(255), String(name || normalizedCode))
    .input("domain", sql.NVarChar(50), domain ? String(domain) : null)
    .input("created_by_user_id", sql.Int, toNullableInt(createdByUserId))
    .input("is_active", sql.Bit, Boolean(isActive));

  try {
    const inserted = await insertRequest.query(`
      INSERT INTO dbo.Actions (
        code,
        name,
        domain,
        created_by_user_id,
        is_active
      )
      OUTPUT
        INSERTED.action_id,
        INSERTED.code,
        INSERTED.name,
        INSERTED.domain,
        INSERTED.created_by_user_id,
        INSERTED.is_active,
        INSERTED.created_at
      VALUES (
        @code,
        @name,
        @domain,
        @created_by_user_id,
        @is_active
      );
    `);

    return inserted.recordset[0];
  } catch (err) {
    // Handle race on UNIQUE(code): re-select.
    const message = String(err?.message || "").toLowerCase();
    if (!message.includes("duplicate") && !message.includes("unique")) {
      throw err;
    }

    const retry = await (transaction
      ? new sql.Request(transaction)
      : (await getPool()).request())
      .input("code", sql.NVarChar(50), normalizedCode)
      .query(
        "SELECT TOP 1 action_id, code, name, domain, created_by_user_id, is_active, created_at FROM dbo.Actions WHERE code = @code",
      );

    if (retry.recordset.length === 0) {
      throw err;
    }

    return retry.recordset[0];
  }
}

async function logAction({
  code,
  name,
  domain = null,
  actorUserId = null,
  targetType,
  targetId = null,
  roomId = null,
  oldValue = null,
  newValue = null,
  status = "ACCEPTED",
  createdByUserId = null,
  isActive = true,
  transaction = null,
} = {}) {
  const normalizedTargetType = normalizeTargetType(targetType);
  if (!normalizedTargetType) {
    throw createHttpError("Missing targetType", 400);
  }

  const action = await getOrCreateAction({
    code,
    name,
    domain,
    createdByUserId,
    isActive,
    transaction,
  });

  const pool = await getPool();
  const request = transaction ? new sql.Request(transaction) : pool.request();

  request
    .input("action_id", sql.Int, Number(action.action_id))
    .input("actor_user_id", sql.Int, toNullableInt(actorUserId))
    .input("target_type", sql.NVarChar(20), normalizedTargetType)
    .input("target_id", sql.Int, toNullableInt(targetId))
    .input("room_id", sql.Int, toNullableInt(roomId))
    .input("old_value", sql.NVarChar(sql.MAX), toJsonStringOrNull(oldValue))
    .input("new_value", sql.NVarChar(sql.MAX), toJsonStringOrNull(newValue))
    .input("status", sql.NVarChar(20), toNullableString(status) || "ACCEPTED");

  const inserted = await request.query(`
    INSERT INTO dbo.ActionLog (
      action_id,
      actor_user_id,
      target_type,
      target_id,
      room_id,
      old_value,
      new_value,
      status
    )
    OUTPUT INSERTED.action_log_id AS id
    VALUES (
      @action_id,
      @actor_user_id,
      @target_type,
      @target_id,
      @room_id,
      @old_value,
      @new_value,
      @status
    );
  `);

  return {
    id: inserted.recordset?.[0]?.id,
    actionId: action.action_id,
    code: action.code,
    targetType: normalizedTargetType,
    targetId: toNullableInt(targetId),
    roomId: toNullableInt(roomId),
    status: toNullableString(status) || "ACCEPTED",
  };
}

module.exports = {
  getOrCreateAction,
  logAction,
};


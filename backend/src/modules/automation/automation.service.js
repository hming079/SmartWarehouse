const { sql, getPool } = require("../../../db");

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

async function ensureTable() {
  const pool = await getPool();
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.AutomationRules', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AutomationRules (
        rule_id INT NOT NULL PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        apply_to NVARCHAR(255) NOT NULL,
        food_type_id INT NULL,
        threshold_id INT NOT NULL,
        action_id INT NOT NULL,
        target_device_id INT NULL,
        is_active BIT NOT NULL DEFAULT(1),
        created_at DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
      );
    END

    IF COL_LENGTH('dbo.AutomationRules', 'food_type_id') IS NULL
      ALTER TABLE dbo.AutomationRules ADD food_type_id INT NULL;

    IF COL_LENGTH('dbo.AutomationRules', 'threshold_id') IS NULL
      ALTER TABLE dbo.AutomationRules ADD threshold_id INT NULL;

    IF COL_LENGTH('dbo.AutomationRules', 'action_id') IS NULL
      ALTER TABLE dbo.AutomationRules ADD action_id INT NULL;

    IF COL_LENGTH('dbo.AutomationRules', 'target_device_id') IS NULL
      ALTER TABLE dbo.AutomationRules ADD target_device_id INT NULL;

    IF COL_LENGTH('dbo.AutomationRules', 'food_type') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN food_type;

    IF COL_LENGTH('dbo.AutomationRules', 'metric') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN metric;

    IF COL_LENGTH('dbo.AutomationRules', 'compare_op') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN compare_op;

    IF COL_LENGTH('dbo.AutomationRules', 'threshold_value') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN threshold_value;

    IF COL_LENGTH('dbo.AutomationRules', 'action_name') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN action_name;

    IF COL_LENGTH('dbo.AutomationRules', 'alert_level') IS NOT NULL
      ALTER TABLE dbo.AutomationRules DROP COLUMN alert_level;

    IF OBJECT_ID(N'dbo.Threshold', N'U') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_Threshold'
    )
      ALTER TABLE dbo.AutomationRules
      ADD CONSTRAINT FK_AutomationRules_Threshold
      FOREIGN KEY (threshold_id) REFERENCES dbo.Threshold(threshold_id);

    IF OBJECT_ID(N'dbo.Actions', N'U') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_Action'
    )
      ALTER TABLE dbo.AutomationRules
      ADD CONSTRAINT FK_AutomationRules_Action
      FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id);

    IF OBJECT_ID(N'dbo.FoodTypes', N'U') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_FoodType'
    )
      ALTER TABLE dbo.AutomationRules
      ADD CONSTRAINT FK_AutomationRules_FoodType
      FOREIGN KEY (food_type_id) REFERENCES dbo.FoodTypes(type_id);

    IF OBJECT_ID(N'dbo.Devices', N'U') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_Device'
    )
      ALTER TABLE dbo.AutomationRules
      ADD CONSTRAINT FK_AutomationRules_Device
      FOREIGN KEY (target_device_id) REFERENCES dbo.Devices(device_id);
  `);
}

async function listRules() {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ar.rule_id,
      ar.name,
      ar.apply_to,
      ar.food_type_id,
      ft.name AS food_type_name,
      ar.threshold_id,
      t.metric AS threshold_metric,
      t.min_threshold AS threshold_min_value,
      t.max_threshold AS threshold_max_value,
      t.hysteresis AS threshold_hysteresis,
      t.alert_level AS threshold_alert_level,
      ar.action_id,
      a.code AS action_code,
      a.name AS action_name,
      ar.target_device_id,
      ar.is_active
    FROM dbo.AutomationRules ar
    LEFT JOIN dbo.Threshold t ON t.threshold_id = ar.threshold_id
    LEFT JOIN dbo.Actions a ON a.action_id = ar.action_id
    LEFT JOIN dbo.FoodTypes ft ON ft.type_id = ar.food_type_id
    ORDER BY ar.rule_id DESC
  `);

  return result.recordset;
}

async function createRule(payload) {
  await ensureTable();
  const {
    name,
    apply_to,
    food_type_id,
    threshold_id,
    action_id,
    target_device_id,
    is_active,
  } = payload;

  const thresholdId = toNullableInt(threshold_id);
  const actionId = toNullableInt(action_id);
  const foodTypeId = toNullableInt(food_type_id);
  const targetDeviceId = toNullableInt(target_device_id);

  if (!thresholdId) {
    throw createHttpError("threshold_id is required", 400);
  }
  if (!actionId) {
    throw createHttpError("action_id is required", 400);
  }

  const pool = await getPool();

  const thresholdExists = await pool
    .request()
    .input("thresholdId", sql.Int, thresholdId)
    .query(
      "SELECT TOP 1 threshold_id FROM dbo.Threshold WHERE threshold_id = @thresholdId",
    );
  if (!thresholdExists.recordset[0]) {
    throw createHttpError("threshold_id does not exist", 400);
  }

  const actionExists = await pool
    .request()
    .input("actionId", sql.Int, actionId)
    .query(
      "SELECT TOP 1 action_id FROM dbo.Actions WHERE action_id = @actionId",
    );
  if (!actionExists.recordset[0]) {
    throw createHttpError("action_id does not exist", 400);
  }

  if (foodTypeId) {
    const foodTypeExists = await pool
      .request()
      .input("foodTypeId", sql.Int, foodTypeId)
      .query(
        "SELECT TOP 1 type_id FROM dbo.FoodTypes WHERE type_id = @foodTypeId",
      );
    if (!foodTypeExists.recordset[0]) {
      throw createHttpError("food_type_id does not exist", 400);
    }
  }

  if (targetDeviceId) {
    const deviceExists = await pool
      .request()
      .input("deviceId", sql.Int, targetDeviceId)
      .query(
        "SELECT TOP 1 device_id FROM dbo.Devices WHERE device_id = @deviceId",
      );
    if (!deviceExists.recordset[0]) {
      throw createHttpError("target_device_id does not exist", 400);
    }
  }

  const nextIdResult = await pool
    .request()
    .query(
      "SELECT ISNULL(MAX(rule_id), 0) + 1 AS nextId FROM dbo.AutomationRules",
    );

  const nextId = nextIdResult.recordset[0].nextId;

  await pool
    .request()
    .input("rule_id", sql.Int, nextId)
    .input("name", sql.NVarChar, name)
    .input("apply_to", sql.NVarChar, apply_to)
    .input("food_type_id", sql.Int, foodTypeId)
    .input("threshold_id", sql.Int, thresholdId)
    .input("action_id", sql.Int, actionId)
    .input("target_device_id", sql.Int, targetDeviceId)
    .input("is_active", sql.Bit, Boolean(is_active)).query(`
      INSERT INTO dbo.AutomationRules (
        rule_id,
        name,
        apply_to,
        food_type_id,
        threshold_id,
        action_id,
        target_device_id,
        is_active
      ) VALUES (
        @rule_id,
        @name,
        @apply_to,
        @food_type_id,
        @threshold_id,
        @action_id,
        @target_device_id,
        @is_active
      )
    `);

  const created = await pool.request().input("rule_id", sql.Int, nextId).query(`
    SELECT
      ar.rule_id,
      ar.name,
      ar.apply_to,
      ar.food_type_id,
      ft.name AS food_type_name,
      ar.threshold_id,
      t.metric AS threshold_metric,
      t.min_threshold AS threshold_min_value,
      t.max_threshold AS threshold_max_value,
      t.hysteresis AS threshold_hysteresis,
      t.alert_level AS threshold_alert_level,
      ar.action_id,
      a.code AS action_code,
      a.name AS action_name,
      ar.target_device_id,
      ar.is_active
    FROM dbo.AutomationRules ar
    LEFT JOIN dbo.Threshold t ON t.threshold_id = ar.threshold_id
    LEFT JOIN dbo.Actions a ON a.action_id = ar.action_id
    LEFT JOIN dbo.FoodTypes ft ON ft.type_id = ar.food_type_id
    WHERE ar.rule_id = @rule_id
  `);

  return created.recordset[0];
}

async function toggleRule(ruleId) {
  await ensureTable();
  const pool = await getPool();
  await pool.request().input("rule_id", sql.Int, ruleId).query(`
    UPDATE dbo.AutomationRules
    SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
    WHERE rule_id = @rule_id
  `);

  const result = await pool
    .request()
    .input("rule_id", sql.Int, ruleId)
    .query(
      "SELECT rule_id, is_active FROM dbo.AutomationRules WHERE rule_id = @rule_id",
    );

  return result.recordset[0] || null;
}

async function deleteRule(ruleId) {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.request().input("rule_id", sql.Int, ruleId).query(`
      DELETE FROM dbo.AutomationRules WHERE rule_id = @rule_id;
      SELECT @@ROWCOUNT AS affected;
    `);
  const affected = Number(result.recordset?.[0]?.affected || 0);
  if (affected === 0) {
    const err = new Error("Rule not found");
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listRules,
  createRule,
  toggleRule,
  deleteRule,
};

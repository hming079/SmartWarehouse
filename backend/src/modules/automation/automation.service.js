const { sql, getPool } = require("../../../db");

async function ensureTable() {
  const pool = await getPool();
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.AutomationRules', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AutomationRules (
        rule_id INT NOT NULL PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        apply_to NVARCHAR(255) NOT NULL,
        food_type NVARCHAR(255) NOT NULL,
        metric NVARCHAR(50) NOT NULL,
        compare_op NVARCHAR(20) NOT NULL,
        threshold_value FLOAT NOT NULL,
        action_name NVARCHAR(255) NOT NULL,
        alert_level NVARCHAR(20) NOT NULL,
        is_active BIT NOT NULL DEFAULT(1),
        created_at DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
      );
    END
  `);
}

async function listRules() {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      rule_id,
      name,
      apply_to,
      food_type,
      metric,
      compare_op,
      threshold_value,
      action_name,
      alert_level,
      is_active
    FROM dbo.AutomationRules
    ORDER BY rule_id DESC
  `);

  return result.recordset;
}

async function createRule(payload) {
  await ensureTable();
  const {
    name,
    apply_to,
    food_type,
    metric,
    compare_op,
    threshold_value,
    action_name,
    alert_level,
    is_active,
  } = payload;

  const pool = await getPool();
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
    .input("food_type", sql.NVarChar, food_type)
    .input("metric", sql.NVarChar, metric)
    .input("compare_op", sql.NVarChar, compare_op)
    .input("threshold_value", sql.Float, Number(threshold_value))
    .input("action_name", sql.NVarChar, action_name)
    .input("alert_level", sql.NVarChar, alert_level)
    .input("is_active", sql.Bit, Boolean(is_active)).query(`
      INSERT INTO dbo.AutomationRules (
        rule_id, name, apply_to, food_type, metric, compare_op,
        threshold_value, action_name, alert_level, is_active
      ) VALUES (
        @rule_id, @name, @apply_to, @food_type, @metric, @compare_op,
        @threshold_value, @action_name, @alert_level, @is_active
      )
    `);

  return {
    rule_id: nextId,
    name,
    apply_to,
    food_type,
    metric,
    compare_op,
    threshold_value: Number(threshold_value),
    action_name,
    alert_level,
    is_active: Boolean(is_active),
  };
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
  await pool
    .request()
    .input("rule_id", sql.Int, ruleId)
    .query("DELETE FROM dbo.AutomationRules WHERE rule_id = @rule_id");
}

module.exports = {
  listRules,
  createRule,
  toggleRule,
  deleteRule,
};

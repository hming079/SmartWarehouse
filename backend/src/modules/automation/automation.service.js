// Update automation rule
async function updateRule(ruleId, payload) {
  await ensureTable();
  const {
    name,
    apply_to,
    food_type,
    metric,
    compare_op,
    threshold_value,
    action_name,
    action_device_ids,
    action_device_types,
    alert_level,
    is_active,
    // Normalized fields
    room_id,
    food_type_id,
    action_id,
    action_mode,
    device_ids,
  } = payload;

  const pool = await getPool();
  let derivedFoodTypeId = food_type_id || null;
  let derivedFoodType = food_type || null;

  if (room_id && !derivedFoodTypeId) {
    const roomResult = await pool
      .request()
      .input("room_id_lookup", sql.Int, Number(room_id))
      .query(`
        SELECT TOP 1 r.food_type_id, ft.name AS food_type_name
        FROM dbo.Rooms r
        LEFT JOIN dbo.FoodTypes ft ON ft.type_id = r.food_type_id
        WHERE r.room_id = @room_id_lookup
      `);

    const roomRow = roomResult.recordset?.[0];
    if (roomRow?.food_type_id) {
      derivedFoodTypeId = roomRow.food_type_id;
      derivedFoodType = roomRow.food_type_name || derivedFoodType;
    }
  }

  await pool
    .request()
    .input("rule_id", sql.Int, ruleId)
    .input("name", sql.NVarChar, name)
    .input("apply_to", sql.NVarChar, apply_to || null)
    .input("food_type", sql.NVarChar, derivedFoodType)
    .input("metric", sql.NVarChar, metric)
    .input("compare_op", sql.NVarChar, compare_op)
    .input("threshold_value", sql.Float, Number(threshold_value))
    .input("action_name", sql.NVarChar, action_name || null)
    .input("action_device_ids", sql.NVarChar, action_device_ids || null)
    .input("action_device_types", sql.NVarChar, action_device_types || null)
    .input("alert_level", sql.NVarChar, alert_level)
    .input("is_active", sql.Bit, is_active === undefined ? true : Boolean(is_active))
    .input("room_id", sql.Int, room_id || null)
    .input("food_type_id", sql.Int, derivedFoodTypeId)
    .input("action_id", sql.Int, action_id || null)
    .input("action_mode", sql.NVarChar, action_mode || null)
    .query(`
      UPDATE dbo.AutomationRules SET
        name = @name,
        apply_to = @apply_to,
        food_type = @food_type,
        metric = @metric,
        compare_op = @compare_op,
        threshold_value = @threshold_value,
        action_name = @action_name,
        action_device_ids = @action_device_ids,
        action_device_types = @action_device_types,
        alert_level = @alert_level,
        is_active = @is_active,
        room_id = @room_id,
        food_type_id = @food_type_id,
        action_id = @action_id,
        action_mode = @action_mode
      WHERE rule_id = @rule_id
    `);

  // Update device associations
  if (Array.isArray(device_ids)) {
    // Delete old associations
    await pool
      .request()
      .input("rule_id_del", sql.Int, ruleId)
      .query(`DELETE FROM dbo.AutomationRuleDevices WHERE rule_id = @rule_id_del`);

    // Insert new associations
    for (const deviceId of device_ids) {
      const numDeviceId = Number(deviceId);
      if (Number.isInteger(numDeviceId) && numDeviceId > 0) {
        await pool
          .request()
          .input("rule_id_ins", sql.Int, ruleId)
          .input("device_id", sql.Int, numDeviceId)
          .query(`
            INSERT INTO dbo.AutomationRuleDevices (rule_id, device_id)
            VALUES (@rule_id_ins, @device_id)
          `);
      }
    }
  }

  return {
    rule_id: ruleId,
    name,
    apply_to,
    food_type,
    metric,
    compare_op,
    threshold_value: Number(threshold_value),
    action_name,
    action_device_ids,
    action_device_types,
    alert_level,
    is_active: is_active === undefined ? true : Boolean(is_active),
    room_id: room_id || null,
    food_type_id: derivedFoodTypeId,
    action_id: action_id || null,
    action_mode: action_mode || null,
    device_ids: device_ids || [],
  };
}
const { sql, getPool } = require("../../../db");

async function ensureTable() {
  const pool = await getPool();
  
  try {
    // Step 1: Create or update AutomationRules table if it doesn't exist
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.AutomationRules', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AutomationRules (
          rule_id INT NOT NULL PRIMARY KEY IDENTITY(1,1),
          name NVARCHAR(255) NOT NULL,
          apply_to NVARCHAR(255) NULL,
          food_type NVARCHAR(255) NULL,
          metric NVARCHAR(50) NOT NULL,
          compare_op NVARCHAR(20) NOT NULL,
          threshold_value FLOAT NOT NULL,
          action_name NVARCHAR(255) NULL,
          action_device_ids NVARCHAR(MAX) NULL,
          action_device_types NVARCHAR(MAX) NULL,
          alert_level NVARCHAR(20) NOT NULL,
          is_active BIT NOT NULL DEFAULT(1),
          room_id INT NULL,
          food_type_id INT NULL,
          action_id INT NULL,
          action_mode NVARCHAR(20) NULL,
          created_at DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
        );
      END
    `);

    // Step 2: Add missing columns to existing AutomationRules table (idempotent)
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'AutomationRules' AND TABLE_SCHEMA = 'dbo'
    `);
    const columnNames = columns.recordset.map(c => c.COLUMN_NAME);

    const columnsToAdd = [
      { name: 'room_id', type: 'INT NULL' },
      { name: 'food_type_id', type: 'INT NULL' },
      { name: 'action_id', type: 'INT NULL' },
      { name: 'action_mode', type: 'NVARCHAR(20) NULL' }
    ];

    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        try {
          await pool.request().query(`ALTER TABLE dbo.AutomationRules ADD ${col.name} ${col.type}`);
          console.log(`✓ Added column: ${col.name}`);
        } catch (err) {
          console.log(`Column ${col.name} already exists or failed: ${err.message}`);
        }
      }
    }

    // Step 3: Create AutomationRuleDevices join table
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.AutomationRuleDevices', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AutomationRuleDevices (
          rule_id INT NOT NULL,
          device_id INT NOT NULL,
          PRIMARY KEY (rule_id, device_id),
          CONSTRAINT FK_AutomationRuleDevices_Rule
            FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id) ON DELETE CASCADE
        );
      END
    `);
    console.log('✓ AutomationRuleDevices table ensured');

    // Step 4: Add FK constraints one at a time with error handling
    const fkConstraints = [
      {
        name: 'FK_AutomationRules_Room',
        alter: 'ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_AutomationRules_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id)'
      },
      {
        name: 'FK_AutomationRules_FoodType',
        alter: 'ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_AutomationRules_FoodType FOREIGN KEY (food_type_id) REFERENCES dbo.FoodTypes(type_id)'
      },
      {
        name: 'FK_AutomationRules_Action',
        alter: 'ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_AutomationRules_Action FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id)'
      }
    ];

    for (const fk of fkConstraints) {
      try {
        const check = await pool.request().query(`
          SELECT 1 FROM sys.foreign_keys WHERE name = '${fk.name}'
        `);
        if (check.recordset.length === 0) {
          await pool.request().query(fk.alter);
          console.log(`✓ Created FK: ${fk.name}`);
        }
      } catch (err) {
        console.log(`⚠ FK ${fk.name} constraint issue: ${err.message}`);
      }
    }

    // Step 5: Migrate data from legacy text columns (one-time, idempotent)
    try {
      await pool.request().query(`
        -- Migrate apply_to -> room_id for records that don't have room_id yet
        UPDATE ar SET room_id = rm.room_id
        FROM dbo.AutomationRules ar
        INNER JOIN dbo.Rooms rm ON LTRIM(RTRIM(LOWER(ar.apply_to))) = LTRIM(RTRIM(LOWER(rm.name)))
        WHERE ar.room_id IS NULL AND ar.apply_to IS NOT NULL AND ar.apply_to <> '';
      `);
      console.log('✓ Data migration: apply_to -> room_id');
    } catch (err) {
      console.warn(`⚠ Data migration failed: ${err.message}`);
    }

    console.log('✓ ensureTable() completed');
  } catch (err) {
    console.error('✗ ensureTable() error:', err.message);
    // Don't throw - just log. API will work with best-effort schema
  }
}

async function listRules() {
  await ensureTable();
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ar.rule_id,
      ar.name,
      ar.apply_to,
      ar.food_type,
      ar.metric,
      ar.compare_op,
      ar.threshold_value,
      ar.action_name,
      ar.action_device_ids,
      ar.action_device_types,
      ar.alert_level,
      ar.is_active,
      ar.room_id,
      r.name AS room_name,
      ar.food_type_id,
      COALESCE(ft.name, rft.name, ar.food_type) AS food_type_name,
      ar.action_id,
      a.action_name AS action_name_normalized,
      ar.action_mode,
      STRING_AGG(CONVERT(NVARCHAR(50), ard.device_id), ',') WITHIN GROUP (ORDER BY ard.device_id) AS action_device_ids_normalized
    FROM dbo.AutomationRules ar
    LEFT JOIN dbo.Rooms r ON r.room_id = ar.room_id
    LEFT JOIN dbo.FoodTypes ft ON ft.type_id = ar.food_type_id
    LEFT JOIN dbo.FoodTypes rft ON rft.type_id = r.food_type_id
    LEFT JOIN dbo.Actions a ON a.action_id = ar.action_id
    LEFT JOIN dbo.AutomationRuleDevices ard ON ard.rule_id = ar.rule_id
    GROUP BY ar.rule_id, ar.name, ar.apply_to, ar.food_type, ar.metric, ar.compare_op, ar.threshold_value, ar.action_name, ar.action_device_ids, ar.action_device_types, ar.alert_level, ar.is_active, ar.room_id, r.name, ar.food_type_id, ft.name, rft.name, ar.action_id, a.action_name, ar.action_mode
    ORDER BY ar.rule_id DESC
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
    action_device_ids,
    action_device_types,
    alert_level,
    is_active,
    // Normalized fields
    room_id,
    food_type_id,
    action_id,
    device_ids,
  } = payload;

  const pool = await getPool();
  let derivedFoodTypeId = food_type_id || null;
  let derivedFoodType = food_type || null;

  if (room_id && !derivedFoodTypeId) {
    const roomResult = await pool
      .request()
      .input("room_id_lookup", sql.Int, Number(room_id))
      .query(`
        SELECT TOP 1 r.food_type_id, ft.name AS food_type_name
        FROM dbo.Rooms r
        LEFT JOIN dbo.FoodTypes ft ON ft.type_id = r.food_type_id
        WHERE r.room_id = @room_id_lookup
      `);

    const roomRow = roomResult.recordset?.[0];
    if (roomRow?.food_type_id) {
      derivedFoodTypeId = roomRow.food_type_id;
      derivedFoodType = roomRow.food_type_name || derivedFoodType;
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
    .input("apply_to", sql.NVarChar, apply_to || null)
    .input("food_type", sql.NVarChar, derivedFoodType)
    .input("metric", sql.NVarChar, metric)
    .input("compare_op", sql.NVarChar, compare_op)
    .input("threshold_value", sql.Float, Number(threshold_value))
    .input("action_name", sql.NVarChar, action_name || null)
    .input("action_device_ids", sql.NVarChar, action_device_ids || null)
    .input("action_device_types", sql.NVarChar, action_device_types || null)
    .input("alert_level", sql.NVarChar, alert_level)
    .input("is_active", sql.Bit, Boolean(is_active))
    .input("room_id", sql.Int, room_id || null)
    .input("food_type_id", sql.Int, derivedFoodTypeId)
    .input("action_id", sql.Int, action_id || null)
    .input("action_mode", sql.NVarChar, payload.action_mode || null)
    .query(`
      INSERT INTO dbo.AutomationRules (
        rule_id, name, apply_to, food_type, metric, compare_op,
        threshold_value, action_name, action_device_ids, action_device_types, alert_level, is_active,
        room_id, food_type_id, action_id, action_mode
      ) VALUES (
        @rule_id, @name, @apply_to, @food_type, @metric, @compare_op,
        @threshold_value, @action_name, @action_device_ids, @action_device_types, @alert_level, @is_active,
        @room_id, @food_type_id, @action_id, @action_mode
      )
    `);

  // Insert device associations from device_ids array
  if (Array.isArray(device_ids) && device_ids.length > 0) {
    for (const deviceId of device_ids) {
      const numDeviceId = Number(deviceId);
      if (Number.isInteger(numDeviceId) && numDeviceId > 0) {
        await pool
          .request()
          .input("rule_id_dev", sql.Int, nextId)
          .input("device_id", sql.Int, numDeviceId)
          .query(`
            INSERT INTO dbo.AutomationRuleDevices (rule_id, device_id)
            VALUES (@rule_id_dev, @device_id)
          `);
      }
    }
  }

  return {
    rule_id: nextId,
    name,
    apply_to,
    food_type,
    metric,
    compare_op,
    threshold_value: Number(threshold_value),
    action_name,
    action_device_ids,
    action_device_types,
    alert_level,
    is_active: Boolean(is_active),
    room_id: room_id || null,
    food_type_id: derivedFoodTypeId,
    action_id: action_id || null,
    action_mode: action_mode || null,
    device_ids: device_ids || [],
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
  updateRule,
};

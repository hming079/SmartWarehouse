/*
  Migration: Normalize AutomationRules table to use foreign keys
  - Adds room_id, food_type_id, action_id, action_mode columns
  - Creates AutomationRuleDevices join table
  - Safe, idempotent migration (can run multiple times)
*/

USE SmartWarehouse;
GO

-- Step 1: Add new normalized columns if they don't exist
IF COL_LENGTH('dbo.AutomationRules', 'room_id') IS NULL
  ALTER TABLE dbo.AutomationRules ADD room_id INT NULL;

IF COL_LENGTH('dbo.AutomationRules', 'food_type_id') IS NULL
  ALTER TABLE dbo.AutomationRules ADD food_type_id INT NULL;

IF COL_LENGTH('dbo.AutomationRules', 'action_id') IS NULL
  ALTER TABLE dbo.AutomationRules ADD action_id INT NULL;

IF COL_LENGTH('dbo.AutomationRules', 'action_mode') IS NULL
  ALTER TABLE dbo.AutomationRules ADD action_mode NVARCHAR(20) NULL;

GO

-- Step 2: Create AutomationRuleDevices join table
IF OBJECT_ID(N'dbo.AutomationRuleDevices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AutomationRuleDevices (
    rule_id INT NOT NULL,
    device_id INT NOT NULL,
    PRIMARY KEY (rule_id, device_id)
  );

  ALTER TABLE dbo.AutomationRuleDevices
    ADD CONSTRAINT FK_AutomationRuleDevices_Rule
      FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id) ON DELETE CASCADE;

  ALTER TABLE dbo.AutomationRuleDevices
    ADD CONSTRAINT FK_AutomationRuleDevices_Device
      FOREIGN KEY (device_id) REFERENCES dbo.Devices(device_id) ON DELETE CASCADE;
END
GO

-- Step 3: Migrate data from apply_to to room_id (match numeric or by name)
UPDATE ar
SET room_id = rm.room_id
FROM dbo.AutomationRules ar
INNER JOIN dbo.Rooms rm ON (
  (ISNUMERIC(ar.apply_to) = 1 AND TRY_CAST(ar.apply_to AS INT) = rm.room_id)
  OR (LTRIM(RTRIM(LOWER(ar.apply_to))) = LTRIM(RTRIM(LOWER(rm.name))))
)
WHERE ar.room_id IS NULL AND ar.apply_to IS NOT NULL AND ar.apply_to <> '';

GO

-- Step 4: Migrate data from food_type to food_type_id (match by name)
UPDATE ar
SET food_type_id = ft.type_id
FROM dbo.AutomationRules ar
INNER JOIN dbo.FoodTypes ft ON
  LTRIM(RTRIM(LOWER(ar.food_type))) = LTRIM(RTRIM(LOWER(ft.name)))
WHERE ar.food_type_id IS NULL AND ar.food_type IS NOT NULL AND ar.food_type <> '';

GO

-- Step 5: Migrate action_name to Actions table (create entries if missing)
MERGE dbo.Actions AS T
USING (
  SELECT DISTINCT action_name 
  FROM dbo.AutomationRules 
  WHERE action_name IS NOT NULL AND action_name <> ''
) AS S(action_name)
ON LTRIM(RTRIM(LOWER(T.action_name))) = LTRIM(RTRIM(LOWER(S.action_name)))
WHEN NOT MATCHED THEN 
  INSERT (action_id, action_name) 
  VALUES (
    (SELECT ISNULL(MAX(action_id), 0) + 1 FROM dbo.Actions),
    S.action_name
  );

GO

-- Step 6: Update action_id and action_mode from action_name
UPDATE ar
SET 
  action_id = a.action_id,
  action_mode = CASE
    WHEN UPPER(ar.action_name) LIKE N'%OFF%' OR ar.action_name LIKE N'%Tắt%' THEN 'OFF'
    WHEN UPPER(ar.action_name) LIKE N'%ON%' OR ar.action_name LIKE N'%Bật%' THEN 'ON'
    ELSE 'ALERT'
  END
FROM dbo.AutomationRules ar
INNER JOIN dbo.Actions a ON
  LTRIM(RTRIM(LOWER(ar.action_name))) = LTRIM(RTRIM(LOWER(a.action_name)))
WHERE ar.action_id IS NULL;

GO

-- Step 7: Migrate device IDs from CSV string to AutomationRuleDevices join table
INSERT INTO dbo.AutomationRuleDevices (rule_id, device_id)
SELECT DISTINCT ar.rule_id, TRY_CAST(LTRIM(RTRIM(split_val.value)) AS INT) AS device_id
FROM dbo.AutomationRules ar
CROSS APPLY STRING_SPLIT(ISNULL(ar.action_device_ids, ''), ',') AS split_val
WHERE TRY_CAST(LTRIM(RTRIM(split_val.value)) AS INT) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.AutomationRuleDevices d
    WHERE d.rule_id = ar.rule_id 
      AND d.device_id = TRY_CAST(LTRIM(RTRIM(split_val.value)) AS INT)
  );

GO

-- Step 8: Add foreign key constraints to AutomationRules for the new columns
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_Room')
BEGIN
  ALTER TABLE dbo.AutomationRules
    ADD CONSTRAINT FK_AutomationRules_Room
      FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_FoodType')
BEGIN
  ALTER TABLE dbo.AutomationRules
    ADD CONSTRAINT FK_AutomationRules_FoodType
      FOREIGN KEY (food_type_id) REFERENCES dbo.FoodTypes(type_id);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AutomationRules_Action')
BEGIN
  ALTER TABLE dbo.AutomationRules
    ADD CONSTRAINT FK_AutomationRules_Action
      FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id);
END

GO

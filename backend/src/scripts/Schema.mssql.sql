/*
  SQL Server compatible schema for SmartWarehouse.
  Run this file with sqlcmd inside the Docker container.
*/

IF DB_ID(N'SmartWarehouse') IS NULL
BEGIN
  CREATE DATABASE SmartWarehouse;
END
GO

USE SmartWarehouse;
GO

IF OBJECT_ID(N'dbo.AlertSubscriptions', N'U') IS NOT NULL DROP TABLE dbo.AlertSubscriptions;
IF OBJECT_ID(N'dbo.UserPermissionAssignment', N'U') IS NOT NULL DROP TABLE dbo.UserPermissionAssignment;
IF OBJECT_ID(N'dbo.ActionLog', N'U') IS NOT NULL DROP TABLE dbo.ActionLog;
IF OBJECT_ID(N'dbo.SensorData', N'U') IS NOT NULL DROP TABLE dbo.SensorData;
IF OBJECT_ID(N'dbo.DevicesLog', N'U') IS NOT NULL DROP TABLE dbo.DevicesLog;
IF OBJECT_ID(N'dbo.Sensors', N'U') IS NOT NULL DROP TABLE dbo.Sensors;
IF OBJECT_ID(N'dbo.Alerts', N'U') IS NOT NULL DROP TABLE dbo.Alerts;
IF OBJECT_ID(N'dbo.Shedules', N'U') IS NOT NULL DROP TABLE dbo.Shedules;
IF OBJECT_ID(N'dbo.Devices', N'U') IS NOT NULL DROP TABLE dbo.Devices;
IF OBJECT_ID(N'dbo.Threshold', N'U') IS NOT NULL DROP TABLE dbo.Threshold;
IF OBJECT_ID(N'dbo.Rooms', N'U') IS NOT NULL DROP TABLE dbo.Rooms;
IF OBJECT_ID(N'dbo.Floor', N'U') IS NOT NULL DROP TABLE dbo.Floor;
IF OBJECT_ID(N'dbo.Zones', N'U') IS NOT NULL DROP TABLE dbo.Zones;
IF OBJECT_ID(N'dbo.Locations', N'U') IS NOT NULL DROP TABLE dbo.Locations;
IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL DROP TABLE dbo.RolePermissions;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID(N'dbo.Role', N'U') IS NOT NULL DROP TABLE dbo.Role;
IF OBJECT_ID(N'dbo.Actions', N'U') IS NOT NULL DROP TABLE dbo.Actions;
IF OBJECT_ID(N'dbo.AutomationRules', N'U') IS NOT NULL DROP TABLE dbo.AutomationRules;
IF OBJECT_ID(N'dbo.FoodTypes', N'U') IS NOT NULL DROP TABLE dbo.FoodTypes;
GO

CREATE TABLE dbo.Role (
  role_id INT NOT NULL PRIMARY KEY,
  role_name NVARCHAR(255) NOT NULL
);
GO

CREATE TABLE dbo.Users (
  user_id INT NOT NULL PRIMARY KEY,
  role_id INT NULL,
  username NVARCHAR(255) UNIQUE,
  password_hash NVARCHAR(255),
  email NVARCHAR(255),
  full_name NVARCHAR(255),
  is_active BIT NOT NULL DEFAULT (1),
  last_login DATETIME2 NULL
);
GO

CREATE TABLE dbo.RolePermissions (
  permission_id INT NOT NULL PRIMARY KEY,
  user_id INT NULL,
  role_id INT NULL,
  permission_code NVARCHAR(255)
);
GO

CREATE TABLE dbo.Locations (
  location_id INT NOT NULL PRIMARY KEY,
  name NVARCHAR(255),
  address NVARCHAR(MAX),
  description NVARCHAR(MAX)
);
GO

CREATE TABLE dbo.Zones (
  zone_id INT NOT NULL PRIMARY KEY,
  location_id INT NULL,
  name NVARCHAR(255)
);
GO

CREATE TABLE dbo.Floor (
  floor_id INT NOT NULL PRIMARY KEY,
  zone_id INT NULL,
  floor_number INT
);
GO

CREATE TABLE dbo.FoodTypes (
  type_id INT NOT NULL PRIMARY KEY,
  name NVARCHAR(255),
  storage_instructions NVARCHAR(MAX)
);
GO

CREATE TABLE dbo.Rooms (
  room_id INT NOT NULL PRIMARY KEY,
  floor_id INT NULL,
  food_type_id INT NULL,
  name NVARCHAR(255),
  description NVARCHAR(MAX)
);
GO

CREATE TABLE dbo.Shedules (
  shedule_id INT NOT NULL PRIMARY KEY,
  name NVARCHAR(255),
  start_time TIME,
  end_time TIME,
  days_of_week NVARCHAR(255),
  action NVARCHAR(20),
  is_active BIT NOT NULL DEFAULT (1),
  room_id INT NULL
);
GO

CREATE TABLE dbo.Actions (
  action_id INT NOT NULL PRIMARY KEY IDENTITY(1,1),
  action_name NVARCHAR(255) NOT NULL UNIQUE
);
GO

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
  is_active BIT NOT NULL DEFAULT (1),
  created_at DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
  room_id INT NULL,
  food_type_id INT NULL,
  action_id INT NULL,
  action_mode NVARCHAR(20) NULL,
  FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id)
);
GO

CREATE TABLE dbo.Threshold (
  threshold_id INT NOT NULL PRIMARY KEY,
  min_threshold FLOAT,
  max_threshold FLOAT,
  is_active BIT NOT NULL DEFAULT (1),
  updated_at DATETIME2 NULL
);
GO




CREATE TABLE dbo.Sensors (
  sensor_id INT NOT NULL PRIMARY KEY,
  threshold_id INT NULL,
  shedule_id INT NULL,
  room_id INT NULL,
  name NVARCHAR(255),
  type NVARCHAR(20) CHECK (type IN ('TEMPERATURE', 'HUMIDITY', 'CO2', 'SMOKE')),
  status NVARCHAR(20) CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  last_connection DATETIME2 NULL
);
GO

CREATE TABLE dbo.SensorData (
  sensor_data_id BIGINT NOT NULL PRIMARY KEY,
  sensor_id INT NULL,
  value FLOAT,
  unit NVARCHAR(255),
  [timestamp] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.Alerts (
  alert_id INT NOT NULL PRIMARY KEY,
  threshold_id INT NULL,
  rule_id INT NULL,
  triggered_value FLOAT,
  message NVARCHAR(MAX),
  severity NVARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_resolved BIT NOT NULL DEFAULT (0),
  [timestamp] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.ActionLog (
  action_id INT NOT NULL PRIMARY KEY,
  sensor_id INT NULL,
  user_id INT NULL,
  action_type NVARCHAR(255),
  old_value NVARCHAR(255),
  new_value NVARCHAR(255),
  [timestamp] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.AlertSubscriptions (
  alert_id INT NOT NULL,
  user_id INT NOT NULL,
  notification_channel NVARCHAR(10) CHECK (notification_channel IN ('APP', 'SMS', 'EMAIL')),
  PRIMARY KEY (alert_id, user_id)
);
GO

CREATE TABLE dbo.UserPermissionAssignment (
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  can_edit_config BIT NOT NULL DEFAULT (0),
  can_control_device BIT NOT NULL DEFAULT (0),
  PRIMARY KEY (user_id, room_id)
);
GO
CREATE TABLE dbo.Devices (
  device_id INT IDENTITY(1,1) NOT NULL,
  room_id INT NOT NULL,
  device_status NVARCHAR(5) NOT NULL CHECK (device_status IN ('ON', 'OFF')),
  last_update_time DATETIME2 NULL,
  device_type NVARCHAR(50) NULL,
  PRIMARY KEY (device_id)
);
GO

ALTER TABLE dbo.Devices
  ADD CONSTRAINT FK_Devices_Room
  FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
GO

CREATE TABLE dbo.DevicesLog (
  device_log_id INT IDENTITY(1,1) NOT NULL,
  device_id INT NOT NULL,
  device_status NVARCHAR(5) NOT NULL CHECK (device_status IN ('ON', 'OFF')),
  [timestamp] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
  PRIMARY KEY (device_log_id)
);
GO

ALTER TABLE dbo.DevicesLog
  ADD CONSTRAINT FK_Devices_Log
  FOREIGN KEY (device_id) REFERENCES dbo.Devices(device_id)
  ON DELETE CASCADE;
GO
-- Relationship constraints
ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Role FOREIGN KEY (role_id) REFERENCES dbo.Role(role_id);
ALTER TABLE dbo.RolePermissions ADD CONSTRAINT FK_RolePermissions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE;
ALTER TABLE dbo.RolePermissions ADD CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (role_id) REFERENCES dbo.Role(role_id) ON DELETE CASCADE;
ALTER TABLE dbo.Zones ADD CONSTRAINT FK_Zones_Location FOREIGN KEY (location_id) REFERENCES dbo.Locations(location_id);
ALTER TABLE dbo.Floor ADD CONSTRAINT FK_Floor_Zone FOREIGN KEY (zone_id) REFERENCES dbo.Zones(zone_id);
ALTER TABLE dbo.Rooms ADD CONSTRAINT FK_Rooms_Floor FOREIGN KEY (floor_id) REFERENCES dbo.Floor(floor_id);
ALTER TABLE dbo.Rooms ADD CONSTRAINT FK_Rooms_FoodType FOREIGN KEY (food_type_id) REFERENCES dbo.FoodTypes(type_id);
ALTER TABLE dbo.Shedules ADD CONSTRAINT FK_Shedules_Device FOREIGN KEY (device_id) REFERENCES dbo.Devices(device_id) ON DELETE SET NULL;
ALTER TABLE dbo.Shedules ADD CONSTRAINT FK_Shedules_Action FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id) ON DELETE SET NULL;
ALTER TABLE dbo.Sensors ADD CONSTRAINT FK_Sensors_Threshold FOREIGN KEY (threshold_id) REFERENCES dbo.Threshold(threshold_id);
ALTER TABLE dbo.Sensors ADD CONSTRAINT FK_Sensors_Shedule FOREIGN KEY (shedule_id) REFERENCES dbo.Shedules(shedule_id);
ALTER TABLE dbo.Sensors ADD CONSTRAINT FK_Sensors_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
ALTER TABLE dbo.SensorData ADD CONSTRAINT FK_SensorData_Sensor FOREIGN KEY (sensor_id) REFERENCES dbo.Sensors(sensor_id) ON DELETE CASCADE;
ALTER TABLE dbo.Alerts ADD CONSTRAINT FK_Alerts_Threshold FOREIGN KEY (threshold_id) REFERENCES dbo.Threshold(threshold_id);
ALTER TABLE dbo.Alerts ADD CONSTRAINT FK_Alerts_AutomationRule FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id) ON DELETE SET NULL;
ALTER TABLE dbo.ActionLog ADD CONSTRAINT FK_ActionLog_Sensor FOREIGN KEY (sensor_id) REFERENCES dbo.Sensors(sensor_id);
ALTER TABLE dbo.ActionLog ADD CONSTRAINT FK_ActionLog_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id);
ALTER TABLE dbo.AlertSubscriptions ADD CONSTRAINT FK_AlertSubscriptions_Alert FOREIGN KEY (alert_id) REFERENCES dbo.Alerts(alert_id) ON DELETE CASCADE;
ALTER TABLE dbo.AlertSubscriptions ADD CONSTRAINT FK_AlertSubscriptions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE;
ALTER TABLE dbo.UserPermissionAssignment ADD CONSTRAINT FK_UserPermissionAssignment_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id) ON DELETE CASCADE;
ALTER TABLE dbo.UserPermissionAssignment ADD CONSTRAINT FK_UserPermissionAssignment_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE;

-- Automation Rules normalized schema constraints
ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_AutomationRules_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id) ON DELETE SET NULL;
ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_AutomationRules_FoodType FOREIGN KEY (food_type_id) REFERENCES dbo.FoodTypes(type_id) ON DELETE SET NULL;

-- Create AutomationRuleDevices join table for many-to-many relationship
IF OBJECT_ID(N'dbo.AutomationRuleDevices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AutomationRuleDevices (
    rule_id INT NOT NULL,
    device_id INT NOT NULL,
    PRIMARY KEY (rule_id, device_id),
    CONSTRAINT FK_AutomationRuleDevices_Rule
      FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id) ON DELETE CASCADE,
    CONSTRAINT FK_AutomationRuleDevices_Device
      FOREIGN KEY (device_id) REFERENCES dbo.Devices(device_id) ON DELETE CASCADE
  );
END
GO

EXEC sp_addextendedproperty
  @name = N'Column_Description',
  @value = N'ADMIN, MANAGER, STAFF',
  @level0type = N'Schema', @level0name = N'dbo',
  @level1type = N'Table',  @level1name = N'Role',
  @level2type = N'Column', @level2name = N'role_name';
GO

EXEC sp_addextendedproperty
  @name = N'Column_Description',
  @value = N'EDIT_ROOM, VIEW_DATA, CONTROL_DEVICE',
  @level0type = N'Schema', @level0name = N'dbo',
  @level1type = N'Table',  @level1name = N'RolePermissions',
  @level2type = N'Column', @level2name = N'permission_code';
GO

EXEC sp_addextendedproperty
  @name = N'Column_Description',
  @value = N'Trang thai hoat dong cua thiet bi',
  @level0type = N'Schema', @level0name = N'dbo',
  @level1type = N'Table',  @level1name = N'Sensors',
  @level2type = N'Column', @level2name = N'status';
GO


IF OBJECT_ID(N'dbo.trg_AutoUpdateDeviceOnSensorData', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AutoUpdateDeviceOnSensorData;
GO

CREATE TRIGGER dbo.trg_AutoUpdateDeviceOnSensorData
ON dbo.SensorData
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DevicesToUpdate TABLE (
        device_id INT NOT NULL,
        new_status NVARCHAR(5) NOT NULL
    );

    INSERT INTO @DevicesToUpdate (device_id, new_status)
    SELECT DISTINCT
        TRY_CAST(REPLACE(LTRIM(RTRIM(split_ids.value)), 'switch-db-', '') AS INT) AS device_id,
        CASE
            WHEN UPPER(ar.action_name) LIKE N'%OFF%' OR ar.action_name LIKE N'%Tắt%' THEN 'OFF'
            WHEN UPPER(ar.action_name) LIKE N'%ON%' OR ar.action_name LIKE N'%Bật%' THEN 'ON'
            ELSE 'ON'
        END AS new_status
    FROM inserted i
    INNER JOIN dbo.Sensors s
        ON s.sensor_id = i.sensor_id
    INNER JOIN dbo.Rooms rm
        ON rm.room_id = s.room_id
    LEFT JOIN dbo.FoodTypes ft
        ON ft.type_id = rm.food_type_id
    INNER JOIN dbo.AutomationRules ar
        ON ar.is_active = 1
       AND UPPER(ar.metric) = UPPER(s.type)
       AND (
            (ar.compare_op = '>'  AND i.value >  ar.threshold_value) OR
            (ar.compare_op = '<'  AND i.value <  ar.threshold_value) OR
            (ar.compare_op = '='  AND i.value =  ar.threshold_value) OR
            (ar.compare_op = '>=' AND i.value >= ar.threshold_value) OR
            (ar.compare_op = '<=' AND i.value <= ar.threshold_value)
       )
       AND (
            ar.apply_to = rm.name
            OR ar.apply_to = CAST(rm.room_id AS NVARCHAR(50))
            OR ar.food_type = ft.name
       )
    CROSS APPLY STRING_SPLIT(COALESCE(ar.action_device_ids, ''), ',') AS split_ids
    WHERE TRY_CAST(REPLACE(LTRIM(RTRIM(split_ids.value)), 'switch-db-', '') AS INT) IS NOT NULL;

    IF EXISTS (SELECT 1 FROM @DevicesToUpdate)
    BEGIN
        UPDATE d
        SET
            d.device_status = tu.new_status,
            d.last_update_time = SYSUTCDATETIME()
        FROM dbo.Devices d
        INNER JOIN @DevicesToUpdate tu
            ON tu.device_id = d.device_id
        WHERE d.device_status <> tu.new_status;

        INSERT INTO dbo.DevicesLog (device_id, device_status, [timestamp])
        SELECT DISTINCT
            tu.device_id,
            tu.new_status,
            SYSUTCDATETIME()
        FROM @DevicesToUpdate tu;
    END
END;
GO


USE SmartWarehouse;
GO

-- 1) Drop old FKs that depend on old columns (if they exist)
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Shedules_Device')
  ALTER TABLE dbo.Shedules DROP CONSTRAINT FK_Shedules_Device;
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Shedules_Action')
  ALTER TABLE dbo.Shedules DROP CONSTRAINT FK_Shedules_Action;
GO

-- 2) Add new columns if missing
IF COL_LENGTH('dbo.Shedules', 'name') IS NULL
  ALTER TABLE dbo.Shedules ADD name NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.Shedules', 'start_time') IS NULL
  ALTER TABLE dbo.Shedules ADD start_time TIME NULL;
IF COL_LENGTH('dbo.Shedules', 'end_time') IS NULL
  ALTER TABLE dbo.Shedules ADD end_time TIME NULL;
IF COL_LENGTH('dbo.Shedules', 'days_of_week') IS NULL
  ALTER TABLE dbo.Shedules ADD days_of_week NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.Shedules', 'action') IS NULL
  ALTER TABLE dbo.Shedules ADD action NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.Shedules', 'room_id') IS NULL
  ALTER TABLE dbo.Shedules ADD room_id INT NULL;
IF COL_LENGTH('dbo.Shedules', 'is_active') IS NULL
  ALTER TABLE dbo.Shedules ADD is_active BIT NULL;
GO



-- 4) Optional: add FK for room_id
IF COL_LENGTH('dbo.Shedules', 'room_id') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Shedules_Room')
BEGIN
  ALTER TABLE dbo.Shedules
  ADD CONSTRAINT FK_Shedules_Room
  FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
END
GO

-- 5) Optional: remove old columns after migration
IF COL_LENGTH('dbo.Shedules', 'device_id') IS NOT NULL
  ALTER TABLE dbo.Shedules DROP COLUMN device_id;
IF COL_LENGTH('dbo.Shedules', 'scheduled_time') IS NOT NULL
  ALTER TABLE dbo.Shedules DROP COLUMN scheduled_time;
IF COL_LENGTH('dbo.Shedules', 'schedule_days') IS NOT NULL
  ALTER TABLE dbo.Shedules DROP COLUMN schedule_days;
IF COL_LENGTH('dbo.Shedules', 'action_id') IS NOT NULL
  ALTER TABLE dbo.Shedules DROP COLUMN action_id;
GO

ALTER TABLE dbo.Alerts
ADD rule_id INT NULL,
    CONSTRAINT FK_Alerts_AutomationRule 
    FOREIGN KEY (rule_id) REFERENCES dbo.AutomationRules(rule_id);

alter table automationrules
alter column apply_to nvarchar(255) null;
alter table automationrules
alter column food_type nvarchar(255) null;
alter table automationrules
alter column action_name nvarchar(255) null;
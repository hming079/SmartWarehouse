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
  device_id INT NULL,
  name NVARCHAR(255),
  scheduled_time TIME,
  schedule_days NVARCHAR(255),
  action_id INT NULL
);
GO

CREATE TABLE dbo.Actions (
  action_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  code NVARCHAR(50) NOT NULL UNIQUE,
  name NVARCHAR(255) NOT NULL,
  domain NVARCHAR(50) NULL,
  created_by_user_id INT NULL,
  is_active BIT NOT NULL DEFAULT (1),
  created_at DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.AutomationRules (
  rule_id INT NOT NULL PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  apply_to NVARCHAR(255) NOT NULL,
  food_type_id INT CONSTRAINT FK_Rules_FoodType FOREIGN KEY REFERENCES dbo.FoodTypes(type_id),
  threshold_id INT NOT NULL,
  action_id INT CONSTRAINT FK_Rules_Action FOREIGN KEY REFERENCES dbo.Actions(action_id),
  target_device_id INT CONSTRAINT FK_Rules_Device FOREIGN KEY REFERENCES dbo.Devices(device_id),
  is_active BIT NOT NULL DEFAULT (1),
  created_at DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO
CREATE TABLE dbo.Threshold (
  threshold_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  sensor_id INT NULL,
  metric NVARCHAR(20) NULL,
  min_threshold FLOAT NULL,
  max_threshold FLOAT NULL,
  hysteresis FLOAT NULL,
  alert_level NVARCHAR(20) NULL,
  is_active BIT NOT NULL DEFAULT (1),
  created_at DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
  updated_at DATETIME2 NULL,
  deleted_at DATETIME2 NULL
);
GO

CREATE TABLE dbo.Sensors (
  sensor_id INT NOT NULL PRIMARY KEY,
  threshold_id INT NULL,
  room_id INT NULL,
  name NVARCHAR(255),
  type NVARCHAR(20) CHECK (type IN ('TEMPERATURE', 'HUMIDITY', 'CO2', 'SMOKE')),
  status NVARCHAR(20) CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  last_value FLOAT,
  last_update FLOAT,
  last_connection DATETIME2 NULL,
  setup_status NVARCHAR(5) NOT NULL CHECK (setup_status IN ('ON', 'OFF')),
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
  triggered_value FLOAT,
  message NVARCHAR(MAX),
  severity NVARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_resolved BIT NOT NULL DEFAULT (0),
  [timestamp] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.ActionLog (
  action_log_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  action_id INT NULL,
  actor_user_id INT NULL,
  target_type NVARCHAR(20) NOT NULL,
  target_id INT NULL,
  room_id INT NULL,
  old_value NVARCHAR(MAX) NULL,
  new_value NVARCHAR(MAX) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT ('ACCEPTED'),
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
  device_name NVARCHAR(255) NULL,
  device_status NVARCHAR(5) NOT NULL CHECK (device_status IN ('ON', 'OFF')),
  last_update_time DATETIME2 NULL,
  device_type NVARCHAR(50) NULL,
  PRIMARY KEY (device_id),
  setup_status NVARCHAR(5) NOT NULL CHECK (setup_status IN ('ON', 'OFF')),
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
ALTER TABLE dbo.Sensors ADD CONSTRAINT FK_Sensors_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
ALTER TABLE dbo.Threshold ADD CONSTRAINT FK_Threshold_Sensor FOREIGN KEY (sensor_id) REFERENCES dbo.Sensors(sensor_id);
ALTER TABLE dbo.AutomationRules ADD CONSTRAINT FK_Rules_Threshold FOREIGN KEY (threshold_id) REFERENCES dbo.Threshold(threshold_id);
ALTER TABLE dbo.SensorData ADD CONSTRAINT FK_SensorData_Sensor FOREIGN KEY (sensor_id) REFERENCES dbo.Sensors(sensor_id) ON DELETE CASCADE;
ALTER TABLE dbo.Alerts ADD CONSTRAINT FK_Alerts_Threshold FOREIGN KEY (threshold_id) REFERENCES dbo.Threshold(threshold_id);
ALTER TABLE dbo.Actions ADD CONSTRAINT FK_Actions_CreatedByUser FOREIGN KEY (created_by_user_id) REFERENCES dbo.Users(user_id);
ALTER TABLE dbo.ActionLog ADD CONSTRAINT FK_ActionLog_Action FOREIGN KEY (action_id) REFERENCES dbo.Actions(action_id);
ALTER TABLE dbo.ActionLog ADD CONSTRAINT FK_ActionLog_ActorUser FOREIGN KEY (actor_user_id) REFERENCES dbo.Users(user_id);
ALTER TABLE dbo.ActionLog ADD CONSTRAINT FK_ActionLog_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id);
ALTER TABLE dbo.AlertSubscriptions ADD CONSTRAINT FK_AlertSubscriptions_Alert FOREIGN KEY (alert_id) REFERENCES dbo.Alerts(alert_id) ON DELETE CASCADE;
ALTER TABLE dbo.AlertSubscriptions ADD CONSTRAINT FK_AlertSubscriptions_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE;
ALTER TABLE dbo.UserPermissionAssignment ADD CONSTRAINT FK_UserPermissionAssignment_Room FOREIGN KEY (room_id) REFERENCES dbo.Rooms(room_id) ON DELETE CASCADE;
ALTER TABLE dbo.UserPermissionAssignment ADD CONSTRAINT FK_UserPermissionAssignment_User FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE;
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

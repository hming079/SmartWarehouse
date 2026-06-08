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

        INSERT INTO dbo.DevicesLog (device_id, device_status, cause, [timestamp])
        SELECT DISTINCT
            tu.device_id,
            tu.new_status,
            'automation_rule',
            SYSUTCDATETIME()
        FROM @DevicesToUpdate tu
        INNER JOIN dbo.Devices d
            ON d.device_id = tu.device_id;
    END
END;
GO
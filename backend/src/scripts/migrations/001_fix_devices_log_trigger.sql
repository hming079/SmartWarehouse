IF OBJECT_ID(N'dbo.trg_AutoUpdateDeviceOnSensorData', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AutoUpdateDeviceOnSensorData;
GO

CREATE TRIGGER dbo.trg_AutoUpdateDeviceOnSensorData
ON dbo.SensorData
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Bảng chứa danh sách thiết bị thỏa mãn điều kiện của Rule
    DECLARE @DevicesToUpdate TABLE (
        device_id INT NOT NULL,
        new_status NVARCHAR(5) NOT NULL
    );

    -- 2. Bảng hứng danh sách thiết bị THỰC SỰ bị thay đổi trạng thái
    DECLARE @ActuallyUpdatedDevices TABLE (
        device_id INT NOT NULL,
        new_status NVARCHAR(5) NOT NULL
    );

    -- Lọc và đưa các thiết bị thỏa mãn điều kiện vào bảng tạm
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
        -- Thực hiện UPDATE và dùng OUTPUT đẩy những dòng thực sự thay đổi vào @ActuallyUpdatedDevices
        UPDATE d
        SET
            d.device_status = tu.new_status,
            d.last_update_time = SYSUTCDATETIME()
        OUTPUT inserted.device_id, inserted.device_status INTO @ActuallyUpdatedDevices (device_id, new_status)
        FROM dbo.Devices d
        INNER JOIN @DevicesToUpdate tu
            ON tu.device_id = d.device_id
        WHERE d.device_status <> tu.new_status;

        -- CHỈ ghi log dựa trên bảng @ActuallyUpdatedDevices
        IF EXISTS (SELECT 1 FROM @ActuallyUpdatedDevices)
        BEGIN
            INSERT INTO dbo.DevicesLog (device_id, device_status, cause, [timestamp])
            SELECT DISTINCT
                device_id,
                new_status,
                'automation_rule',
                SYSUTCDATETIME()
            FROM @ActuallyUpdatedDevices;
        END
    END
END;
GO


IF OBJECT_ID('dbo.sp_ExecuteTimeSchedules', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ExecuteTimeSchedules;
GO

CREATE PROCEDURE dbo.sp_ExecuteTimeSchedules
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Lấy giờ hiện tại
    DECLARE @CurrentTime TIME = CAST(GETDATE() AS TIME);
    -- Nếu hệ thống lưu ngày trong tuần dạng chuỗi số (vd: '1,2,3'), bạn có thể lấy thứ hiện tại:
    -- DECLARE @CurrentDay INT = DATEPART(WEEKDAY, GETDATE());

    -- 2. Bảng tạm chứa thiết bị cần thay đổi trạng thái
    DECLARE @DevicesToUpdate TABLE (
        device_id INT NOT NULL,
        new_status NVARCHAR(5) NOT NULL,
        cause NVARCHAR(32) NOT NULL
    );

    -- 3. XỬ LÝ TRONG KHUNG GIỜ (Vào lịch -> Bật/Tắt theo Action)
    INSERT INTO @DevicesToUpdate (device_id, new_status, cause)
    SELECT 
        d.device_id,
        CASE 
            WHEN s.action = 'POWER_ON' THEN 'ON'
            WHEN s.action = 'POWER_OFF' THEN 'OFF'
            ELSE 'ON'
        END AS new_status,
        'schedule_start'
    FROM dbo.Devices d
    INNER JOIN dbo.Shedules s ON d.shedule_id = s.shedule_id
    WHERE s.is_active = 1
      AND @CurrentTime >= s.start_time 
      AND @CurrentTime <= s.end_time
      -- (Tùy chọn) Thêm logic kiểm tra ngày trong tuần ở đây:
      -- AND s.days_of_week LIKE '%' + CAST(@CurrentDay AS VARCHAR) + '%'
      -- Chỉ lấy những thiết bị đang KHÁC trạng thái mong muốn để tránh update thừa
      AND d.device_status <> (CASE WHEN s.action = 'POWER_ON' THEN 'ON' WHEN s.action = 'POWER_OFF' THEN 'OFF' ELSE 'ON' END);

    -- 4. XỬ LÝ NGOÀI KHUNG GIỜ (Hết lịch -> Trả về trạng thái ngược lại)
    INSERT INTO @DevicesToUpdate (device_id, new_status, cause)
    SELECT 
        d.device_id,
        CASE 
            WHEN s.action = 'POWER_ON' THEN 'OFF'
            WHEN s.action = 'POWER_OFF' THEN 'ON'
            ELSE 'OFF'
        END AS new_status,
        'schedule_end'
    FROM dbo.Devices d
    INNER JOIN dbo.Shedules s ON d.shedule_id = s.shedule_id
    WHERE s.is_active = 1
      AND (@CurrentTime < s.start_time OR @CurrentTime > s.end_time)
      -- Chỉ lấy những thiết bị đang KHÁC trạng thái trả về
      AND d.device_status <> (CASE WHEN s.action = 'POWER_ON' THEN 'OFF' WHEN s.action = 'POWER_OFF' THEN 'ON' ELSE 'OFF' END)
      AND d.device_id NOT IN (SELECT device_id FROM @DevicesToUpdate); -- Tránh trùng lặp với logic trên

    -- 5. THỰC HIỆN UPDATE & GHI LOG (Chỉ chạy khi có thiết bị cần đổi)
    IF EXISTS (SELECT 1 FROM @DevicesToUpdate)
    BEGIN
        -- Update thiết bị
        UPDATE d
        SET 
            d.device_status = tu.new_status,
            d.last_update_time = GETDATE()
        FROM dbo.Devices d
        INNER JOIN @DevicesToUpdate tu ON d.device_id = tu.device_id;

        -- Ghi vào log DevicesLog
        INSERT INTO dbo.DevicesLog (device_id, device_status, cause, [timestamp])
        SELECT 
            device_id, 
            new_status, 
            cause, 
            GETDATE()
        FROM @DevicesToUpdate;
    END
END;
GO
USE SmartWarehouse;
GO

DELETE FROM dbo.UserPermissionAssignment; 
DELETE FROM dbo.RolePermissions; 
DELETE FROM dbo.Users; 
DELETE FROM dbo.Role;  
DELETE FROM dbo.Rooms;     
DELETE FROM dbo.FoodTypes; 
DELETE FROM dbo.Floor;     
DELETE FROM dbo.Zones;     
DELETE FROM dbo.Locations; 


USE SmartWarehouse;
GO

-- =========================================================================
-- DỮ LIỆU KHÔNG GIAN (PHÒNG BAN / KHU VỰC)
-- Location -> Zone -> Floor -> Room
-- =========================================================================

INSERT INTO dbo.Locations (location_id, name, address, description) VALUES
(1, N'Kho Tổng Bến Cát', N'KCN Mỹ Phước 3, Bình Dương', N'Kho tổng phân phối Miền Nam'),
(2, N'Kho Trung Chuyển Thủ Đức', N'Khu Công Nghệ Cao, TP. HCM', N'Kho phục vụ nội thành');

INSERT INTO dbo.Zones (zone_id, location_id, name) VALUES
(1, 1, N'Khu A - Thực phẩm tươi sống'),
(2, 1, N'Khu B - Thực phẩm đông lạnh'),
(3, 2, N'Khu C - Rau củ quả');

INSERT INTO dbo.Floor (floor_id, zone_id, floor_number) VALUES
(1, 1, 1), 
(2, 2, 1), 
(3, 3, 1); 

INSERT INTO dbo.FoodTypes (type_id, name, storage_instructions) VALUES
(1, N'Thịt Bò Tươi', N'{"temp_min": 0, "temp_max": 4, "humidity": 85}'),
(2, N'Rau Củ Quả', N'{"temp_min": 5, "temp_max": 10, "humidity": 90}'),
(3, N'Hải Sản Đông Lạnh', N'{"temp_min": -22, "temp_max": -18, "humidity": 0}');

INSERT INTO dbo.Rooms (room_id, floor_id, food_type_id, name, description) VALUES
(101, 1, 1, N'Phòng Lạnh 101', N'Trữ thịt bò Úc nhập khẩu'),
(102, 3, 2, N'Phòng Mát 102', N'Trữ rau VietGAP (Kho Thủ Đức)'),
(201, 2, 3, N'Phòng Cấp Đông 201', N'Trữ cá hồi, tôm đông lạnh');


-- =========================================================================
-- PHẦN 2: DỮ LIỆU NGƯỜI DÙNG & VAI TRÒ (USERS & ROLES)
-- =========================================================================


INSERT INTO dbo.Role (role_id, role_name) VALUES
(1, N'ADMIN'),
(2, N'MANAGER'),
(3, N'STAFF');


INSERT INTO dbo.Users (user_id, role_id, username, password_hash, email, full_name, is_active, last_login) VALUES
(1, 1, 'admin_system', 'hash_pw_admin', 'admin@smartwarehouse.vn', N'Quản trị Hệ thống', 1, GETDATE()),
(2, 2, 'manager_bencat', 'hash_pw_mgr', 'manager.bc@smartwarehouse.vn', N'Trần Quản Lý', 1, GETDATE()),
(3, 3, 'staff_thit', 'hash_pw_staff1', 'staff.thit@smartwarehouse.vn', N'Nguyễn Trực Kho Thịt', 1, GETDATE()),
(4, 3, 'staff_rau', 'hash_pw_staff2', 'staff.rau@smartwarehouse.vn', N'Lê Trực Kho Rau', 1, GETDATE());


INSERT INTO dbo.RolePermissions (permission_id, user_id, role_id, permission_code) VALUES
(1, NULL, 1, 'ALL_ACCESS'),
(2, NULL, 2, 'VIEW_REPORTS'),
(3, NULL, 3, 'VIEW_DASHBOARD');


-- =========================================================================
-- PHẦN 3: DỮ LIỆU PHÂN QUYỀN (MAP USER VỚI ROOM)
-- =========================================================================

INSERT INTO dbo.UserPermissionAssignment (user_id, room_id, can_edit_config, can_control_device) VALUES
-- Manager (User 2) quản lý tất cả các phòng, được phép cấu hình (can_edit_config = 1)
(2, 101, 1, 1), 
(2, 102, 1, 1), 
(2, 201, 1, 1),

-- Staff Thịt/Hải sản (User 3) chỉ quản lý phòng 101 và 201, chỉ được điều khiển thiết bị
(3, 101, 0, 1), 
(3, 201, 0, 1),

-- Staff Rau củ (User 4) chỉ quản lý phòng 102
(4, 102, 0, 1);

PRINT N'Successful!';
GO


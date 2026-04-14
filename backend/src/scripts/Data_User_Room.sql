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
(2, N'Kho Trung Chuyển Thủ Đức', N'Khu Công Nghệ Cao, TP. HCM', N'Kho phục vụ nội thành'),
(3, N'Kho Bắc Ninh', N'VSIP Bắc Ninh, Bắc Ninh', N'Kho trung chuyển khu vực miền Bắc'),
(4, N'Kho Cần Thơ', N'KCN Trà Nóc, Cần Thơ', N'Kho phân phối Đồng bằng sông Cửu Long');

INSERT INTO dbo.Zones (zone_id, location_id, name) VALUES
(1, 1, N'Khu A - Thực phẩm tươi sống'),
(2, 1, N'Khu B - Thực phẩm đông lạnh'),
(3, 2, N'Khu C - Rau củ quả'),
(4, 2, N'Khu D - Đồ uống'),
(5, 3, N'Khu E - Hải sản tươi'),
(6, 3, N'Khu F - Sữa và chế phẩm sữa'),
(7, 4, N'Khu G - Hàng khô');

INSERT INTO dbo.Floor (floor_id, zone_id, floor_number) VALUES
(1, 1, 1), 
(2, 2, 1), 
(3, 3, 1),
(4, 4, 2),
(5, 5, 1),
(6, 6, 2),
(7, 7, 1);

INSERT INTO dbo.FoodTypes (type_id, name, storage_instructions) VALUES
(1, N'Thịt Bò Tươi', N'{"temp_min": 0, "temp_max": 4, "humidity": 85}'),
(2, N'Rau Củ Quả', N'{"temp_min": 5, "temp_max": 10, "humidity": 90}'),
(3, N'Hải Sản Đông Lạnh', N'{"temp_min": -22, "temp_max": -18, "humidity": 0}'),
(4, N'Sữa Tươi', N'{"temp_min": 2, "temp_max": 6, "humidity": 70}'),
(5, N'Trái Cây Tươi', N'{"temp_min": 6, "temp_max": 12, "humidity": 88}'),
(6, N'Nước Giải Khát', N'{"temp_min": 18, "temp_max": 25, "humidity": 60}'),
(7, N'Đồ Khô', N'{"temp_min": 18, "temp_max": 28, "humidity": 50}'),
(8, N'Thịt Gia Cầm Đông Lạnh', N'{"temp_min": -20, "temp_max": -16, "humidity": 0}');

INSERT INTO dbo.Rooms (room_id, floor_id, food_type_id, name, description) VALUES
(101, 1, 1, N'Phòng Lạnh 101', N'Trữ thịt bò Úc nhập khẩu'),
(102, 3, 2, N'Phòng Mát 102', N'Trữ rau VietGAP (Kho Thủ Đức)'),
(201, 2, 3, N'Phòng Cấp Đông 201', N'Trữ cá hồi, tôm đông lạnh'),
(202, 2, 8, N'Phòng Cấp Đông 202', N'Trữ gà, vịt đông lạnh'),
(301, 4, 6, N'Phòng Đồ Uống 301', N'Trữ nước giải khát đóng lon/chai'),
(302, 5, 3, N'Phòng Hải Sản 302', N'Trữ hải sản tươi ngắn hạn'),
(303, 6, 4, N'Phòng Sữa 303', N'Trữ sữa tươi và sữa chua'),
(401, 7, 7, N'Phòng Hàng Khô 401', N'Trữ mì gói, gia vị, đồ hộp'),
(402, 3, 5, N'Phòng Trái Cây 402', N'Trữ trái cây nhập khẩu');


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
(4, 3, 'staff_rau', 'hash_pw_staff2', 'staff.rau@smartwarehouse.vn', N'Lê Trực Kho Rau', 1, GETDATE()),
(5, 2, 'manager_thuduc', 'hash_pw_mgr2', 'manager.td@smartwarehouse.vn', N'Phạm Quản Lý Thủ Đức', 1, GETDATE()),
(6, 3, 'staff_hai_san', 'hash_pw_staff3', 'staff.haisan@smartwarehouse.vn', N'Đỗ Trực Kho Hải Sản', 1, GETDATE()),
(7, 3, 'staff_do_uong', 'hash_pw_staff4', 'staff.douong@smartwarehouse.vn', N'Vũ Trực Kho Đồ Uống', 1, GETDATE()),
(8, 3, 'staff_hang_kho', 'hash_pw_staff5', 'staff.hangkho@smartwarehouse.vn', N'Bùi Trực Kho Hàng Khô', 1, GETDATE());


INSERT INTO dbo.RolePermissions (permission_id, user_id, role_id, permission_code) VALUES
(1, NULL, 1, 'ALL_ACCESS'),
(2, NULL, 2, 'VIEW_REPORTS'),
(3, NULL, 3, 'VIEW_DASHBOARD'),
(4, NULL, 2, 'MANAGE_ROOMS'),
(5, NULL, 3, 'CONTROL_DEVICES'),
(6, NULL, 1, 'MANAGE_USERS');


-- =========================================================================
-- PHẦN 3: DỮ LIỆU PHÂN QUYỀN (MAP USER VỚI ROOM)
-- =========================================================================

INSERT INTO dbo.UserPermissionAssignment (user_id, room_id, can_edit_config, can_control_device) VALUES
-- Manager (User 2) quản lý tất cả các phòng, được phép cấu hình (can_edit_config = 1)
(2, 101, 1, 1), 
(2, 102, 1, 1), 
(2, 201, 1, 1),
(2, 202, 1, 1),
(2, 301, 1, 1),
(2, 302, 1, 1),
(2, 303, 1, 1),
(2, 401, 1, 1),
(2, 402, 1, 1),

-- Manager Thủ Đức (User 5) quản lý các phòng tại kho Thủ Đức và hỗ trợ kho lân cận
(5, 102, 1, 1),
(5, 301, 1, 1),
(5, 402, 1, 1),

-- Staff Thịt/Hải sản (User 3) chỉ quản lý phòng 101 và 201, chỉ được điều khiển thiết bị
(3, 101, 0, 1), 
(3, 201, 0, 1),
(3, 202, 0, 1),

-- Staff Rau củ (User 4) chỉ quản lý phòng 102
(4, 102, 0, 1),

-- Staff Hải sản (User 6)
(6, 201, 0, 1),
(6, 302, 0, 1),

-- Staff Đồ uống (User 7)
(7, 301, 0, 1),

-- Staff Hàng khô (User 8)
(8, 401, 0, 1);

PRINT N'Successful!';
GO
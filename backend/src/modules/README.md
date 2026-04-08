## Base URL

- /api


## User module

- GET /api/users - Lay danh sach user.


## Zone module

- GET /api/zones?locationId=... - Lay danh sach zone theo location.
- POST /api/zones - Tao zone moi.
- PATCH /api/zones/:id - Cap nhat zone theo id.
- DELETE /api/zones/:id - Xoa zone theo id.

## Floor module

- GET /api/floors?zoneId=... - Lay danh sach floor theo zone.
- POST /api/floors - Tao floor moi.
- PATCH /api/floors/:id - Cap nhat floor theo id.
- DELETE /api/floors/:id - Xoa floor theo id.


## Room module

- GET /api/rooms?floorId=... - Lay danh sach room theo floor.
- POST /api/rooms - Tao room moi.
- PATCH /api/rooms/:id - Cap nhat room theo id.
- DELETE /api/rooms/:id - Xoa room theo id.

## Automation module

- GET /api/automation - Lay danh sach automation rules.
- POST /api/automation - Tao rule tu dong hoa moi.
- PATCH /api/automation/:id/toggle - Bat/tat rule.
- DELETE /api/automation/:id - Xoa rule.


## Devices module

- GET /api/devices - Lay danh sach devices (co the loc theo roomId).
- GET /api/devices/:id - Lay chi tiet device theo id.
- POST /api/devices - Tao device moi.
- PATCH /api/devices/:id - Cap nhat thong tin device.
- PATCH /api/devices/:id/toggle - Toggle trang thai ON/OFF cua device.
- DELETE /api/devices/:id - Xoa device.

## Alerts module

- GET /api/alerts - Lay danh sach alerts (co filter status, severity, page, pageSize, roomId).
- GET /api/alerts/:id - Lay chi tiet alert theo id.
- PATCH /api/alerts/:id/ack - Danh dau da acknowledge alert.
- PATCH /api/alerts/:id/resolve - Danh dau da xu ly xong alert.
- POST /api/alerts/:id/assign - Gan alert cho user/nguoi xu ly.

## Schedules module

- GET /api/schedules - Lay danh sach schedule (co the loc theo roomId, deviceId, active).
- POST /api/schedules - Tao schedule moi.
- PATCH /api/schedules/:id - Cap nhat schedule.
- PATCH /api/schedules/:id/toggle - Bat/tat schedule.
- DELETE /api/schedules/:id - Xoa schedule.


## Dashboard module

- GET /api/dashboard/overview - Lay du lieu tong quan dashboard.
- GET /api/dashboard/timeseries - Lay du lieu bieu do theo thoi gian.
- GET /api/dashboard/device-status - Lay tong quan trang thai thiet bi.
- GET /api/dashboard/alerts-summary - Lay tong hop canh bao.


## Audit log module

- GET /api/audit-logs - Lay danh sach audit logs (co filter va phan trang).
- GET /api/audit-logs/:id - Lay chi tiet mot ban ghi audit log.
- POST /api/audit-logs/export - Tao yeu cau export audit logs.


## Settings module

- GET /api/settings - Lay cau hinh he thong.
- PATCH /api/settings - Cap nhat cau hinh he thong.
- GET /api/settings/notification-channels - Lay danh sach kenh thong bao.
- PATCH /api/settings/integration - Cap nhat cau hinh tich hop.


## IoT module

- GET /api/iot/data - Lay du lieu tu core IoT.
- POST /api/iot/control - Gui lenh dieu khien thiet bi qua IoT.
- POST /api/iot/sync - Dong bo du lieu IoT vao DB.

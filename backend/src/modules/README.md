# API Documentation

## Base URL

- `http://localhost:<PORT>/api`
- `http://localhost:<PORT>/api/v1`

Note: ca 2 prefix deu duoc map cung mot bo route.

## Response conventions

- Thanh cong thuong co dang: `{ ok: true, data: ... }`
- Danh sach thuong co them `meta` cho filter/pagination
- Loi validation thuong tra `400` voi `{ message: "..." }` hoac `{ ok: false, error: "..." }`

## User

### GET /users

- Query params: none
- Path params: none
- Body: none
- Output:
  - `200`: `{ ok: true, data: User[] }`

## Zone

### GET /zones

- Query params: `locationId` (required, number)
- Path params: none
- Body: none
- Output:
  - `200`: `{ data: Zone[] }`
  - `400`: `{ message: "locationId is required" }`

### POST /zones

- Query params: none
- Path params: none
- Body:
  - `location_id` (required, number)
  - `name` (required, string)
- Output:
  - `201`: `Zone`
  - `400`: `{ message: "location_id and name are required" }`

### PATCH /zones/:id

- Query params: none
- Path params: `id` (required, number)
- Body:
  - `location_id` (required, number)
  - `name` (required, string)
- Output:
  - `200`: `Zone`

### DELETE /zones/:id

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `{ message: "Zone deleted" }`

## Floor

### GET /floors

- Query params: `zoneId` (required, number)
- Path params: none
- Body: none
- Output:
  - `200`: `{ data: Floor[] }`
  - `400`: `{ message: "zoneId is required" }`

### POST /floors

- Query params: none
- Path params: none
- Body:
  - `zone_id` (required, number)
  - `floor_number` (required, number)
- Output:
  - `201`: `Floor`

### PATCH /floors/:id

- Query params: none
- Path params: `id` (required, number)
- Body:
  - `zone_id` (required, number)
  - `floor_number` (required, number)
- Output:
  - `200`: `Floor`

### DELETE /floors/:id

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `{ message: "Floor deleted" }`

## Room

### GET /rooms

- Query params: `floorId` (required, number)
- Path params: none
- Body: none
- Output:
  - `200`: `{ data: Room[] }`
  - `400`: `{ message: "floorId is required" }`

### GET /rooms/:id/summary

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `{ ok: true, data: { room_id, room_name, generated_at, averages, health, source } }`

### POST /rooms

- Query params: none
- Path params: none
- Body:
  - `floor_id` (required, number)
  - `name` (required, string)
  - `description` (optional, string)
- Output:
  - `201`: `Room`

### PATCH /rooms/:id

- Query params: none
- Path params: `id` (required, number)
- Body:
  - `floor_id` (required, number)
  - `name` (required, string)
  - `description` (optional, string)
- Output:
  - `200`: `Room`

### DELETE /rooms/:id

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `{ message: "Room deleted" }`

## Automation

### GET /automation

- Query params: none
- Path params: none
- Body: none
- Output:
  - `200`: `{ data: AutomationRule[] }`

### POST /automation

- Query params: none
- Path params: none
- Body (required fields):
  - `name`, `apply_to`, `food_type`, `metric`, `compare_op`, `threshold_value`, `action_name`, `alert_level`
- Output:
  - `201`: `AutomationRule`
  - `400`: `{ message: "Missing required fields" }`

### PATCH /automation/:id/toggle

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `AutomationRule`

### DELETE /automation/:id

- Query params: none
- Path params: `id` (required, number)
- Body: none
- Output:
  - `200`: `{ message: "Rule deleted" }`

## Devices

### GET /devices

- Query params (all optional):
  - `zoneId`, `floorId`, `roomId` (number)
  - `type`, `status`, `mode` or `control_mode`, `search` (string)
  - `page` (default `1`), `limit` (default `10`)
- Path params: none
- Body: none
- Output:
  - `200`: `{ ok: true, data: Device[], meta: { filters, pagination } }`

### GET /devices/:id

- Path params: `id`
- Output:
  - `200`: `{ ok: true, data: Device }`
  - `400`: `{ ok: false, error: "Device ID must be a positive integer" }`
  - `404`: `{ ok: false, error: "Device not found" }`

### POST /devices

- Body:
  - `room_id` hoac `roomId` (required, number)
  - `device_name` hoac `name` (optional, string)
  - `device_type` hoac `type` (optional, string)
  - `device_status` hoac `status` (optional, `ON`/`OFF`, default `OFF`)
  - `setup_status` hoac `setupStatus` (optional, `ON`/`OFF`, default `OFF`)
  - `control_mode` hoac `controlMode` (optional, `MANUAL`/`AUTO`, default `MANUAL`)
- Output:
  - `201`: `{ ok: true, data: Device }`
  - `400`: `{ ok: false, error: "room_id is required and must be a positive integer" }`

### POST /devices/:id/command

- Path params: `id` (device id)
- Body:
  - chap nhan 1 trong cac field: `command` | `action` | `state` | `status`
  - gia tri hop le: `ON`/`OFF`
- Output:
  - `202`: `{ ok: true, message, data: { command_id, command_status, ... } }`
  - `400`: `{ ok: false, error: "Device ID must be a positive integer" }` hoac command khong hop le
  - `409`: device dang `AUTO` nen chan lenh manual

### PATCH /devices/:id

- Path params: `id`
- Body (chi gui field can cap nhat):
  - `room_id` hoac `roomId` (number)
  - `device_name` hoac `name` (string)
  - `device_type` hoac `type` (string)
  - `device_status` hoac `status` (`ON`/`OFF`)
  - `setup_status` hoac `setupStatus` (`ON`/`OFF`)
  - `control_mode` hoac `controlMode` (`MANUAL`/`AUTO`)
- Output:
  - `200`: `{ ok: true, data: Device }`
  - `400`: id khong hop le hoac body khong co field hop le
  - `404`: `{ ok: false, error: "Device not found" }`

### PATCH /devices/:id/toggle

- Path params: `id`
- Body: none
- Output:
  - `202`: `{ ok: true, message, data }`
  - `400`: `{ ok: false, error: "Device ID must be a positive integer" }`
  - `404`: `{ ok: false, error: "Device not found" }`

### DELETE /devices/:id

- Path params: `id`
- Body: none
- Output:
  - `200`: `{ ok: true, data: { id, deleted: true } }`
  - `400`: `{ ok: false, error: "Device ID must be a positive integer" }`
  - `404`: `{ ok: false, error: "Device not found" }`

## Sensors

### GET /sensors

- Query params (all optional):
  - `zoneId`, `floorId`, `roomId` (number)
  - `type`, `status`, `search` (string)
  - `page` (default `1`), `limit` (default `20`)
- Path params: none
- Body: none
- Output:
  - `200`: `{ ok: true, data: Sensor[], meta: { filters, pagination } }`

### POST /sensors

- Query params: none
- Path params: none
- Body: payload tao sensor (theo service)
- Output:
  - `201`: `{ ok: true, data: Sensor }`

## Alerts

### GET /alerts

- Query params:
  - `roomId` (optional, number)
  - `status` (optional, default `all`)
  - `severity` (optional, default `all`)
  - `page` (optional, default `1`)
  - `pageSize` (optional, default `20`)
- Output:
  - `200`: `{ ok: true, data: Alert[], meta: { ...filters, total } }`

### GET /alerts/:id

- Path params: `id`
- Output:
  - `200`: `{ ok: true, data: Alert }`

### PATCH /alerts/:id/ack

- Path params: `id`
- Output:
  - `200`: `{ ok: true, data }`

### PATCH /alerts/:id/resolve

- Path params: `id`
- Output:
  - `200`: `{ ok: true, data }`

### POST /alerts/:id/assign

- Path params: `id`
- Body: payload gan nguoi xu ly (theo service)
- Output:
  - `200`: `{ ok: true, data }`

## Schedules

### GET /schedules/list

- Query params (optional): `roomId`, `deviceId`, `active`
- Output:
  - `200`: `{ ok: true, data: Schedule[], meta: filters }`

### POST /schedules/create

- Body: payload tao schedule (theo service)
- Output:
  - `201`: `{ ok: true, data: Schedule }`

### PATCH /schedules/:id/update

- Path params: `id`
- Body: payload cap nhat schedule
- Output:
  - `200`: `{ ok: true, data: Schedule }`

### PATCH /schedules/:id/toggle

- Path params: `id`
- Body: none
- Output:
  - `200`: `{ ok: true, data: Schedule }`

### DELETE /schedules/:id/delete

- Path params: `id`
- Body: none
- Output:
  - `200`: `{ ok: true, data }`

## Dashboard

### GET /dashboard/overview

- Query params: none
- Output:
  - `200`: `{ ok: true, data }`

### GET /dashboard/timeseries

- Query params (optional): `roomId`, `metric`, `range`
- Output:
  - `200`: `{ ok: true, data }`

### GET /dashboard/device-status

- Query params (optional): `roomId`
- Output:
  - `200`: `{ ok: true, data }`

### GET /dashboard/alerts-summary

- Query params (optional): `range`
- Output:
  - `200`: `{ ok: true, data }`

## Audit Logs

### GET /audit-logs

- Query params (optional):
  - `page` (default `1`), `pageSize` (default `20`)
  - `roomId`, `from`, `to`, `actor`, `action`
- Output:
  - `200`: `{ ok: true, data: AuditLog[], meta: { page, pageSize, total, ...filters } }`

### GET /audit-logs/:id

- Path params: `id`
- Output:
  - `200`: `{ ok: true, data: AuditLog }`

### POST /audit-logs/export

- Body: payload export filter/options
- Output:
  - `202`: `{ ok: true, data }`

## Settings

### GET /settings

- Query params: none
- Output:
  - `200`: `{ ok: true, data }`

### PATCH /settings

- Body: payload cap nhat setting he thong
- Output:
  - `200`: `{ ok: true, data }`

### GET /settings/notification-channels

- Query params: none
- Output:
  - `200`: `{ ok: true, data }`

### PATCH /settings/integration

- Body: payload cap nhat integration setting
- Output:
  - `200`: `{ ok: true, data }`

## IoT

### GET /iot/data

- Query params: none
- Path params: none
- Body: none
- Output:
  - `200`: `{ ok: true, deviceId, data, deviceStatus, switches }`
  - `4xx/5xx`: `{ ok: false, error: "..." }`

### POST /iot/control

- Query params: none
- Path params: none
- Body:
  - `key` (required): telemetry key (vi du `fan_on`)
  - `value` (required): gia tri gui len CoreIoT
- Output:
  - `200`: `{ ok: true, message, data }`
  - `4xx/5xx`: `{ ok: false, error: "..." }`

### POST /iot/sync

- Query params: `roomId` (optional, number)
- Path params: none
- Body:
  - `roomId` (optional, uu tien body truoc query)
- Output:
  - `200`: `{ ok: true, message: "CoreIoT data synced to database", summary: { ... } }`
  - `4xx/5xx`: `{ ok: false, error: "..." }`

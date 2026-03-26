# SmartWarehouse DB Setup Guide

Tai lieu nay huong dan:

- Chay SQL Server bang Docker
- Chay SQL Server local tren may
- Kiem tra ket noi DB pool da hoat dong chua

## 1) Cau hinh env

Project dang doc bien moi truong tu file `.env` o root project:

`/Users/hoangg/Slide/DADN/SmartWarehouse/.env`

Vi du cau hinh chung:

```env
DB_MODE=docker
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_HOST=127.0.0.1
DB_PORT=1433
DB_NAME=SmartWarehouse
```

Ghi chu:

- `DB_MODE` chi nhan `docker` hoac `local`.
- Neu bo trong `DB_MODE`, code se mac dinh `local`.

## 2) Chay DB bang Docker

### Buoc 1: Bat SQL Server container

```bash
cd /Users/hoangg/Slide/DADN/SmartWarehouse/database
docker compose up -d --build
docker compose ps
```

Muc tieu: thay container `smartwarehouse-mssql` o trang thai `Up`.

### Buoc 2: Tao schema

File schema hien tai:

`/Users/hoangg/Slide/DADN/SmartWarehouse/backend/src/scripts/Schema.mssql.sql`

Chay lenh:

```bash
cd /Users/hoangg/Slide/DADN/SmartWarehouse
docker cp backend/src/scripts/Schema.mssql.sql smartwarehouse-mssql:/tmp/Schema.mssql.sql
docker exec smartwarehouse-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -b -i /tmp/Schema.mssql.sql
```

### Buoc 3: Kiem tra bang da tao

```bash
docker exec smartwarehouse-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -d SmartWarehouse -Q "SELECT COUNT(*) AS table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';"
```

Ky vong: `table_count` > 0 (hien tai la 16).

## 3) Chay DB local (khong dung Docker)

### Buoc 1: Dam bao SQL Server local dang chay

- Bat SQL Server tren may (Service/SQL Server Configuration).
- Xac nhan tai khoan SQL Login (vi du `sa`) va password dung.

### Buoc 2: Cap nhat `.env`

```env
DB_MODE=local
DB_USER=sa
DB_PASSWORD=<mat_khau_sql_local>
DB_HOST=127.0.0.1
DB_PORT=1433
DB_NAME=SmartWarehouse
```

### Buoc 3: Tao schema tren local SQL Server

Neu may co `sqlcmd` local:

```bash
sqlcmd -S 127.0.0.1,1433 -U sa -P '<mat_khau_sql_local>' -C -b -i /Users/hoangg/Slide/DADN/SmartWarehouse/backend/src/scripts/Schema.mssql.sql
```

## 4) Kiem tra ket noi pool da hoat dong chua

Chay test nhanh bang Node (goi truc tiep `getPool()` trong `backend/db.js`):

```bash
cd /Users/hoangg/Slide/DADN/SmartWarehouse/backend
dotenv_config_path=../.env node -r dotenv/config -e "const {getPool,sql,dbMode}=require('./db'); (async()=>{const pool=await getPool(); const rs=await pool.request().query('SELECT 1 AS ok'); console.log('dbMode=', dbMode); console.log(rs.recordset); await sql.close(); process.exit(0);})().catch(e=>{console.error('DB FAIL:', e.message); process.exit(1);});"
```

Ky vong ket qua:

- In ra `dbMode= docker` hoac `dbMode= local`
- In ra `[{ ok: 1 }]`

## 5) Kiem tra API app da dung duoc pool

Chay backend:

```bash
cd /Users/hoangg/Slide/DADN/SmartWarehouse/backend
PORT=5001 node server.js
```

Mo terminal khac:

```bash
curl -sS http://127.0.0.1:5001/api/users
```

Neu API tra JSON hop le la backend da boot thanh cong voi cau truc moi.

## 6) Loi thuong gap

1. `zsh: event not found` khi password co `!`

Dung nhay don cho password:

```bash
-P 'YourStrong!Passw0rd'
```

2. `No such container: smartwarehouse-mssql`

Container chua chay, can:

```bash
cd /Users/hoangg/Slide/DADN/SmartWarehouse/database
docker compose up -d --build
```

3. `Cannot find module .../server.js`

Ban dang chay `node server.js` o root project. Hay chay trong folder `backend` hoac dung duong dan day du.

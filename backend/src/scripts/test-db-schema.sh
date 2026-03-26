#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CONTAINER_NAME="${DB_CONTAINER_NAME:-smartwarehouse-mssql}"
DB_USER="${DB_USER:-sa}"
DB_PASSWORD="${DB_PASSWORD:-YourStrong!Passw0rd}"
DB_NAME="${DB_NAME:-SmartWarehouse}"
SCHEMA_FILE="${SCHEMA_FILE:-$REPO_ROOT/backend/scripts/Schema.mssql.sql}"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE"
  exit 1
fi

echo "[1/3] Copy schema to container..."
docker cp "$SCHEMA_FILE" "$CONTAINER_NAME:/tmp/Schema.mssql.sql"

echo "[2/3] Execute schema with fail-fast..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U "$DB_USER" -P "$DB_PASSWORD" -C -b \
  -i /tmp/Schema.mssql.sql

echo "[3/3] Verify created tables..."
docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U "$DB_USER" -P "$DB_PASSWORD" -C -d "$DB_NAME" \
  -Q "SELECT COUNT(*) AS table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'; SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;"

echo "Schema test completed successfully."

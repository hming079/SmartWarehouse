const sql = require("mssql");
const fs = require("fs");
const path = require("path");

function resolveDbMode() {
  const explicitMode = (process.env.DB_MODE || "").trim().toLowerCase();
  if (explicitMode) {
    if (!["docker", "local"].includes(explicitMode)) {
      throw new Error("Invalid DB_MODE. Use 'docker' or 'local'.");
    }
    return explicitMode;
  }
  return "local";
}

const dbMode = resolveDbMode();
const isDockerMode = dbMode === "docker";

const dbConfig = {
  user: process.env.DB_USER || "sa",
  password:
    process.env.DB_PASSWORD || (isDockerMode ? "YourStrong!Passw0rd" : ""),
  server: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "SmartWarehouse",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 15000),
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 15000),
};

let poolPromise;
let autoInitPromise;

const AUTO_INIT_ENABLED =
  (process.env.DB_AUTO_INIT || "false").trim().toLowerCase() === "true";
const AUTO_INIT_SKIP_IF_TABLE_EXISTS =
  process.env.DB_AUTO_INIT_SKIP_IF_TABLE_EXISTS || "Users";
const SCHEMA_SCRIPT_PATH =
  process.env.DB_SCHEMA_SCRIPT_PATH ||
  path.resolve(__dirname, "src/scripts/Schema.mssql.sql");
const SEED_SCRIPT_PATH =
  process.env.DB_SEED_SCRIPT_PATH ||
  path.resolve(__dirname, "src/scripts/Data_User_Room.sql");

function validateDbConfig() {
  if (!dbConfig.password) {
    throw new Error("DB_PASSWORD is required. Set it in your environment.");
  }
}

function splitSqlBatches(sqlText) {
  const batches = [];
  const lines = sqlText.replace(/^\uFEFF/, "").split(/\r?\n/);
  let current = [];

  for (const line of lines) {
    if (line.trim().toUpperCase() === "GO") {
      const sqlBatch = current.join("\n").trim();
      if (sqlBatch) {
        batches.push(sqlBatch);
      }
      current = [];
      continue;
    }
    current.push(line);
  }

  const tail = current.join("\n").trim();
  if (tail) {
    batches.push(tail);
  }

  return batches;
}

async function runSqlFile(pool, filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const batches = splitSqlBatches(content);

  for (let i = 0; i < batches.length; i += 1) {
    try {
      // Use batch to support DDL and multi-statement SQL sections.
      await pool.request().batch(batches[i]);
    } catch (error) {
      error.message = `${error.message} (file: ${filePath}, batch: ${i + 1})`;
      throw error;
    }
  }
}

async function shouldSkipAutoInit(pool) {
  if (!AUTO_INIT_SKIP_IF_TABLE_EXISTS) {
    return false;
  }

  const result = await pool
    .request()
    .input("tableName", sql.NVarChar, AUTO_INIT_SKIP_IF_TABLE_EXISTS)
    .query(
      `SELECT TOP 1 1 AS ok
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName`,
    );

  return result.recordset.length > 0;
}

async function runAutoInitIfEnabled(pool) {
  if (!AUTO_INIT_ENABLED) {
    return;
  }

  if (!autoInitPromise) {
    autoInitPromise = (async () => {
      const skip = await shouldSkipAutoInit(pool);
      if (skip) {
        console.log(
          `[db] Auto-init skipped: table dbo.${AUTO_INIT_SKIP_IF_TABLE_EXISTS} already exists.`,
        );
        return;
      }

      console.log("[db] Auto-init enabled: running schema and seed scripts...");
      await runSqlFile(pool, SCHEMA_SCRIPT_PATH);
      await runSqlFile(pool, SEED_SCRIPT_PATH);
      console.log("[db] Auto-init completed.");
    })();
  }

  await autoInitPromise;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  const retries = Number(process.env.DB_CONNECT_RETRIES || 10);
  const delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(
          `[db] Retry connect attempt ${attempt}/${retries} in ${delayMs}ms...`,
        );
      }

      return await sql.connect(dbConfig);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

function getPool() {
  if (!poolPromise) {
    validateDbConfig();
    poolPromise = (async () => {
      try {
        const pool = await connectWithRetry();
        await runAutoInitIfEnabled(pool);
        return pool;
      } catch (err) {
        poolPromise = undefined;
        autoInitPromise = undefined;
        try {
          await sql.close();
        } catch (_) {
          // Ignore close errors while surfacing the original connect error.
        }

        throw err;
      }
    })();
  }
  return poolPromise;
}

module.exports = {
  sql,
  getPool,
  dbConfig,
  dbMode,
};

const sql = require("mssql");

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
};

let poolPromise;

function validateDbConfig() {
  if (!dbConfig.password) {
    throw new Error("DB_PASSWORD is required. Set it in your environment.");
  }
}

function getPool() {
  if (!poolPromise) {
    validateDbConfig();
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

module.exports = {
  sql,
  getPool,
  dbConfig,
  dbMode,
};

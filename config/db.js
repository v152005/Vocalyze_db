require("dotenv").config();
const mysql = require("mysql2/promise");

// ----------------------------------------------------------------------
// MySQL Connection Pool (MySQL Workbench / Local MySQL Server)
// Credentials are loaded from .env — never hard-code secrets here
// ----------------------------------------------------------------------

let pool = null;
let dbConfigError = null;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "dbms_project",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "+05:30",
  });

  console.log("✅ MySQL pool created successfully");
} catch (error) {
  dbConfigError = error;
  console.error("❌ MySQL pool creation failed:", error.message);
}

/**
 * Test the DB connection — call this on server startup to verify.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected to:", process.env.DB_NAME || "vocalyze_db");
    conn.release();
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  isDbConfigured: () => Boolean(pool && !dbConfigError),
  getDbConfigError: () => dbConfigError,
};

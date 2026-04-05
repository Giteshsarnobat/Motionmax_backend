// config/db.js  — MySQL connection pool
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "jwt_auth_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

// Test the connection once on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected successfully");
    console.log(`DB_HOST: ${process.env.DB_HOST}`);
    console.log(`DB_PORT: ${process.env.DB_PORT}`);
    console.log(`DB_USER: ${process.env.DB_USER}`);
    console.log(`DB_NAME: ${process.env.DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.log(`DB_HOST: ${DB_HOST}`);
    console.log(`DB_PORT: ${DB_PORT}`);
    console.log(`DB_USER: ${DB_USER}`);
    console.log(`DB_NAME: ${DB_NAME}`);
    process.exit(1);
  }
})();

module.exports = pool;

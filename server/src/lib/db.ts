import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

export const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || "qa",
    password: process.env.DB_PASSWORD || "qa_pass_123",
    database: process.env.DB_NAME || "qa_feedback",
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
    timezone: "+08:00",
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

// frontend/lib/db.ts
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT id, CONCAT(year, '年 ', paper_type) AS name
      FROM exams
      ORDER BY year DESC, paper_type ASC
    `);
    await connection.end();
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ 获取试卷失败:", err);
    res.status(500).json({ error: "服务器错误" });
  }
}
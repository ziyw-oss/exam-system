// File: src/pages/api/student/in-progress-exams.ts

import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    userId = decoded.id;
  } catch (err) {
    console.error("❌ Invalid token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }

  if (req.method === "GET") {
    // 查询未提交的考试
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [rows]: any = await connection.query(
        `SELECT es.id AS sessionId, e.year AS examYear, e.paper_type AS paperType, es.started_at AS startedAt, es.duration_min AS durationMin
         FROM exam_sessions AS es
         JOIN exams e ON es.exam_id = e.id
         WHERE es.user_id = ? AND es.status = 'in_progress'`,
        [userId]
      );
      await connection.end();

      return res.status(200).json(rows);
    } catch (err) {
      console.error("❌ Failed to fetch in-progress exams:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    // 删除未提交的考试
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ message: "Missing sessionId" });
    }

    try {
      const connection = await mysql.createConnection(dbConfig);

      // 删除逻辑：可以根据需要级联删除 student_answers、student_scores 等，但这里简单只删 session
      await connection.query(`DELETE FROM exam_sessions WHERE id = ? AND user_id = ?`, [
        sessionId,
        userId,
      ]);

      await connection.end();

      return res.status(200).json({ message: "Session deleted" });
    } catch (err) {
      console.error("❌ Failed to delete session:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
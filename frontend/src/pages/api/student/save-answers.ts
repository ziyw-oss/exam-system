// File: src/pages/api/student/save-answers.ts

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
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "未提供 token" });

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  const { sessionId, answers } = req.body;
  if (!sessionId || typeof answers !== "object") {
    return res.status(400).json({ message: "缺少参数 sessionId 或 answers" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 检查 session 是否属于该用户
    const [sessions]: any = await connection.query(
      `SELECT id FROM exam_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    if (sessions.length === 0) {
      await connection.end();
      return res.status(403).json({ message: "无权访问该考试" });
    }

    for (const [questionIdStr, answerText] of Object.entries(answers)) {
      const questionId = parseInt(questionIdStr);
      await connection.execute(
        `REPLACE INTO student_answers (session_id, question_id, answer_text)
         VALUES (?, ?, ?)`,
        [sessionId, questionId, answerText]
      );
    }

    await connection.end();
    return res.status(200).json({ message: "保存成功" });
  } catch (err) {
    console.error("❌ 保存学生答案失败:", err);
    return res.status(500).json({ message: "服务器错误，保存失败" });
  }
}

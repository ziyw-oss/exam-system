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
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const sessionId = req.query.sessionId;

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 验证该 session 是否属于当前用户
    const [sessions]: any = await connection.query(
      `SELECT id FROM exam_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ message: "考试记录不存在或不属于当前用户" });
    }

    // 查询该 session 每题得分、题目文本和标准答案
    const [scores]: any = await connection.query(
      `SELECT ss.question_id, ss.score, qb.text AS question_text, qa.answer AS correct_answer
       FROM student_scores ss
       JOIN question_bank qb ON ss.question_id = qb.id
       LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
       WHERE ss.session_id = ?`,
      [sessionId]
    );

    const totalScore = scores.reduce((sum: number, q: any) => sum + (q.score ?? 0), 0);
    const avgScore = scores.length > 0 ? totalScore / scores.length : 0;

    await connection.end();

    return res.status(200).json({
      totalScore,
      avgScore,
      questionCount: scores.length,
      scores,
    });
  } catch (err) {
    console.error("❌ 查询考试成绩失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
}
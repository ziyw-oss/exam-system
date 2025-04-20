import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import fs from 'fs';
console.log("✅ .env.local 文件存在吗：", fs.existsSync(".env.local"));

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
    console.log("当前 JWT_SECRET:", process.env.JWT_SECRET);
    console.log("✅ Token 解码成功:", decoded);  // ✅ 新增调试日志
    userId = decoded.id;
  } catch (err) {
    console.error("❌ Token 解析失败:", err);    // ✅ 新增调试日志
    return res.status(401).json({ message: "Token 无效" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 查询考试 session 是否属于当前用户
    const [sessions]: any = await connection.query(
      `SELECT duration_min, started_at FROM exam_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ message: "未找到考试记录" });
    }

    const session = sessions[0];

    // 查询该 session 对应的题目
    const [questions]: any = await connection.query(
        `SELECT qb.id, qb.text, qb.marks AS mark FROM exam_session_questions esq
         JOIN question_bank qb ON esq.question_id = qb.id
         WHERE esq.session_id = ?`,
        [sessionId]
      );

    // 计算剩余时间（秒）
    const startedAt = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000); // 已用秒数
    const total = session.duration_min * 60;
    const remainingTime = Math.max(0, total - elapsed);

    await connection.end();

    return res.status(200).json({
      questions,
      remainingTime,
    });
  } catch (err) {
    console.error("❌ 查询 session 失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
}
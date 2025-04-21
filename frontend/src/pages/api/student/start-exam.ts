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

  const { mode, duration, examId, keypointIds, questionCount } = req.body;
  console.log("📨 Incoming body:", req.body);
  if (!mode || !duration || (mode === "exam" && !examId) || (mode === "keypoint" && (!Array.isArray(keypointIds) || keypointIds.length === 0))) {
    console.warn("⚠️ 请求字段不完整:", { mode, duration, examId, keypointIds });
    return res.status(400).json({ message: "缺少必要字段" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    console.log("✅ Token decoded:", decoded);
    userId = decoded.id;
  } catch (err) {
    console.error("❌ Token 解析失败:", err);
    return res.status(401).json({ message: "Token 无效" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    let questions: any[] = [];
    if (mode === "exam") {
      const [rows]: any = await connection.execute(
        `SELECT qb.id, qb.text FROM exam_questions eq
         JOIN question_bank qb ON eq.question_bank_id = qb.id
         WHERE eq.exam_id = ?`,
        [examId]
      );
      questions = rows;
    } else if (mode === "keypoint") {
      const placeholders = keypointIds.map(() => "?").join(",");
      const [rows]: any = await connection.execute(
        `SELECT qb.id, qb.text FROM question_keypoints qk
         JOIN question_bank qb ON qk.question_id = qb.id
         WHERE qk.keypoint_id IN (${placeholders}) AND qb.marks > 0
         ORDER BY RAND()
         LIMIT ?`,
        [...keypointIds, questionCount || 10]
      );
      questions = rows;
    } else {
      return res.status(400).json({ message: "未知考试模式" });
    }

    // 创建考试记录（exam_sessions）
    const [result]: any = await connection.execute(
      `INSERT INTO exam_sessions (user_id, mode, duration_min, exam_id, keypoint_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        mode,
        duration,
        mode === "exam" ? examId : null,
        mode === "keypoint" ? JSON.stringify(keypointIds) : null,
      ]
    );
    const sessionId = result.insertId;

    // 保存考试题目（exam_session_questions）
    const insertValues = questions.map((q) => [sessionId, q.id]);
    if (insertValues.length > 0) {
      await connection.query(
        `INSERT INTO exam_session_questions (session_id, question_id) VALUES ?`,
        [insertValues]
      );
    }

    await connection.end();

    res.status(200).json({ sessionId, questions });
  } catch (err) {
    console.error("❌ 启动考试失败:", err);
    res.status(500).json({ message: "启动考试失败" });
  }


}

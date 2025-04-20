import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

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

  const { mode, duration, examId, keypointIds } = req.body;

  if (!mode || !duration || (mode === "exam" && !examId) || (mode === "keypoint" && !keypointIds)) {
    return res.status(400).json({ message: "缺少必要参数" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    let questions: any[] = [];
    if (mode === "exam") {
      const [rows] = await connection.execute(
        `SELECT qb.id, qb.text FROM exam_questions eq
         JOIN question_bank qb ON eq.qid = qb.id
         WHERE eq.exam_id = ?`, [examId]
      );
      questions = rows as any[];
    } else if (mode === "keypoint") {
      const placeholders = keypointIds.map(() => "?").join(",");
      const [rows] = await connection.execute(
        `SELECT DISTINCT qb.id, qb.text
         FROM question_keypoints qk
         JOIN question_bank qb ON qk.question_id = qb.id
         WHERE qk.keypoint_id IN (${placeholders})
         LIMIT 20`, keypointIds
      );
      questions = rows as any[];
    }

    // 创建考试记录（exam_sessions）
    const [result]: any = await connection.execute(
      `INSERT INTO exam_sessions (mode, duration_min)
       VALUES (?, ?)`,
      [mode, duration]
    );
    const examSessionId = result.insertId;

    // 保存题目到 session_questions
    for (const q of questions) {
      await connection.execute(
        `INSERT INTO session_questions (session_id, question_id) VALUES (?, ?)`,
        [examSessionId, q.id]
      );
    }

    await connection.end();
    res.status(200).json({ examId: examSessionId });
  } catch (err) {
    console.error("❌ 启动考试失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
}

// File: /api/student/exam-questions.ts

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
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    console.log("✅ Token 解码成功:", decoded);
    userId = decoded.id;
  } catch (err) {
    console.error("❌ Token 解析失败:", err);
    return res.status(401).json({ message: "Token 无效" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 查询 session 是否属于该用户，连表查询 exams 拿 year 和 paper_type
    const [sessions]: any = await connection.query(
      `SELECT 
        es.duration_min, 
        es.started_at,
        es.exam_id,
        e.year,
        e.paper_type
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.id = ? AND es.user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ message: "未找到考试记录" });
    }

    const session = sessions[0];

    // 查询题目信息 + 学生答案 + code_block 内容
    const [questions]: any = await connection.query(
        `SELECT 
            qb.id AS question_bank_id,
            qb.text AS question_text,
            qb.marks AS mark,
            qb.question_type,
            qc.code AS code_block,
            (
              SELECT sa.answer_text 
              FROM student_answers sa
              WHERE sa.session_id = esq.session_id 
                AND sa.question_id = esq.question_id
              LIMIT 1
            ) AS student_answer
         FROM exam_session_questions esq
         JOIN question_bank qb ON esq.question_id = qb.id
         LEFT JOIN question_codeblock qc ON qb.id = qc.question_bank_id
         WHERE esq.session_id = ?`,
        [sessionId]
      );
      
    console.log("🔍 Loaded questions count:", questions.length);
    

    const startedAt = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);
    const total = session.duration_min * 60;
    const remainingTime = Math.max(0, total - elapsed);

    await connection.end();

    // after loading questions...
    const answers: Record<number, string> = {};
    questions.forEach((q: any) => {
    if (q.student_answer) {
        answers[q.question_bank_id] = q.student_answer;
    }
    });

    return res.status(200).json({
    questions,
    answers,
    remainingTime,
    examYear: session.year,
    paperType: session.paper_type,
    });
  } catch (err) {
    console.error("❌ 查询 session 失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
}
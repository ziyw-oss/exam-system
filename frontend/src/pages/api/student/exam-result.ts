// File: src/pages/api/student/exam-result.ts

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

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token not provided" });

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ message: "Missing sessionId" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [sessionRows]: any = await connection.query(
      `SELECT id FROM exam_sessions WHERE id = ? AND user_id = ? AND status = 'submitted'`,
      [sessionId, userId]
    );
    if (sessionRows.length === 0) {
      await connection.end();
      return res.status(403).json({ message: "Session not found or unauthorized" });
    }

    const [scoreRows]: any = await connection.query(
      `SELECT sc.question_id, sc.score, qa.marks, qb.text as question_text, sa.answer_text, qa.answer as correct_answer
       FROM student_scores sc
       JOIN question_bank qb ON sc.question_id = qb.id
       LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
       LEFT JOIN student_answers sa ON sa.question_id = sc.question_id AND sa.session_id = sc.session_id
       WHERE sc.session_id = ?`,
      [sessionId]
    );

    let totalScore = 0;
    let fullScore = 0;
    const wrongQuestions = [];

    for (const r of scoreRows) {
      totalScore += r.score || 0;
      fullScore += r.marks || 0;
      if ((r.score || 0) < (r.marks || 0)) {
        wrongQuestions.push({
          question_id: r.question_id,
          question_text: r.question_text,
          student_answer: r.answer_text,
          correct_answer: r.correct_answer,
        });
      }
    }

    const [keyStats]: any = await connection.query(
      `SELECT qk.keypoint_id, kp.name, COUNT(*) as total,
              SUM(CASE WHEN sc.score = qa.marks THEN 1 ELSE 0 END) as correct
       FROM student_scores sc
       JOIN question_keypoints qk ON sc.question_id = qk.question_id
       LEFT JOIN question_answer qa ON sc.question_id = qa.question_bank_id
       LEFT JOIN keypoints kp ON kp.id = qk.keypoint_id
       WHERE sc.session_id = ?
       GROUP BY qk.keypoint_id`,
      [sessionId]
    );

    const keypointStats: Record<number, { name: string; correctRate: number }> = {};
    for (const stat of keyStats) {
        keypointStats[stat.keypoint_id] = {
            name: stat.name,
            correctRate: stat.total ? (stat.correct / stat.total) * 100 : 0,
        };
    }

    const percent = fullScore > 0 ? (totalScore / fullScore) * 100 : 0;
    const questionCount = scoreRows.length;

    await connection.end();

    return res.status(200).json({
      totalScore,
      fullScore,
      percent,
      questionCount,
      wrongQuestions,
      keypointStats,
    });
  } catch (err) {
    console.error("❌ Failed to query exam result:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

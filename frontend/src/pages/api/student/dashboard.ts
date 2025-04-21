// File: src/pages/api/student/dashboard.ts

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

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [lastSessionRows]: any = await connection.query(
      `SELECT id, submitted_at FROM exam_sessions
       WHERE user_id = ? AND status = 'submitted'
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );
    const lastSession = lastSessionRows[0];

    let totalScore = 0, fullScore = 0, percent = 0, questionCount = 0;
    let wrongQuestions = [], keypointStats = [], weakestKeypoints = [];

    if (lastSession) {
      const [scoreRows]: any = await connection.query(
        `SELECT sc.question_id, sc.score, qa.marks, qb.text as question_text
         FROM student_scores sc
         JOIN question_bank qb ON sc.question_id = qb.id
         LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
         WHERE sc.session_id = ?`,
        [lastSession.id]
      );

      for (const r of scoreRows) {
        totalScore += r.score || 0;
        fullScore += r.marks || 0;
        if ((r.score || 0) < (r.marks || 0)) {
          wrongQuestions.push({ id: r.question_id, text: r.question_text });
        }
      }
      percent = fullScore ? (totalScore / fullScore) * 100 : 0;
      questionCount = scoreRows.length;

      const [keyStats]: any = await connection.query(
        `SELECT qk.keypoint_id, kp.name, COUNT(*) as total,
                SUM(CASE WHEN sc.score = qa.marks THEN 1 ELSE 0 END) as correct
         FROM student_scores sc
         JOIN question_keypoints qk ON sc.question_id = qk.question_id
         JOIN keypoints kp ON kp.id = qk.keypoint_id
         LEFT JOIN question_answer qa ON sc.question_id = qa.question_bank_id
         WHERE sc.session_id = ?
         GROUP BY qk.keypoint_id`,
        [lastSession.id]
      );

      keypointStats = keyStats.map((k: any) => ({
        id: k.keypoint_id,
        name: k.name,
        correctRate: k.total ? (k.correct / k.total) * 100 : 0,
      }));

      weakestKeypoints = keypointStats.filter((k: any) => k.correctRate < 60);
    }

    const [allSessions]: any = await connection.query(
      `SELECT s.id, s.status, s.submitted_at,
              COUNT(sc.question_id) AS question_count
       FROM exam_sessions s
       LEFT JOIN student_scores sc ON s.id = sc.session_id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.submitted_at DESC`,
      [userId]
    );

    const sessions = allSessions.filter((s: any) => s.question_count > 0).map((s: any) => ({
      id: s.id,
      status: s.status,
      submitted_at: s.submitted_at,
    }));

    await connection.end();

    return res.status(200).json({
      totalScore,
      fullScore,
      percent,
      questionCount,
      wrongQuestions,
      keypointStats,
      weakestKeypoints,
      sessions,
    });
  } catch (err) {
    console.error("❌ Failed to query dashboard:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
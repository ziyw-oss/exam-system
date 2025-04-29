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

  const sessionId = req.query.sessionId;
  const token = req.headers.authorization?.split(" ")[1];

  if (!sessionId || !token) {
    return res.status(400).json({ message: "Missing sessionId or token" });
  }

  let userId: any;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    userId = decoded.id;

    const connection = await mysql.createConnection(dbConfig);

    const [fullScoreRows]: any = await connection.query(
      `SELECT SUM(qb.marks) AS total
       FROM exam_session_questions esq
       JOIN question_bank qb ON esq.question_id = qb.id
       WHERE esq.session_id = ? AND qb.marks IS NOT NULL AND qb.marks > 0`,
      [sessionId]
    );

    const [questionCountRows]: any = await connection.query(
      `SELECT COUNT(*) AS total
       FROM exam_session_questions esq
       JOIN question_bank qb ON esq.question_id = qb.id
       WHERE esq.session_id = ? AND qb.marks IS NOT NULL AND qb.marks > 0`,
      [sessionId]
    );

    const fullScore = Number(fullScoreRows[0]?.total || 0);

    const [scoreRows]: any = await connection.query(
      `SELECT SUM(score) AS totalScore, COUNT(*) AS questionCount
       FROM student_scores WHERE session_id = ?`,
      [sessionId]
    );

    const totalScore = Number(scoreRows[0]?.totalScore || 0);
    const questionCount = Number(scoreRows[0]?.questionCount || 0);

    const [rawWrongRows]: any = await connection.query(
      `SELECT sa.question_id, sa.answer_text AS student_answer, qa.answer AS correct_answer,
              qb.text AS question_text, ss.gpt_reasoning AS reason, ss.score AS score
       FROM student_scores ss
       JOIN student_answers sa ON ss.session_id = sa.session_id AND ss.question_id = sa.question_id
       JOIN question_answer qa ON ss.question_id = qa.question_bank_id
       JOIN question_bank qb ON ss.question_id = qb.id
       WHERE ss.session_id = ? AND ss.score < qa.marks`,
      [sessionId]
    );

    const wrongMap: Record<number, any> = {};
    rawWrongRows.forEach((row: any) => {
      if (!wrongMap[row.question_id]) {
        wrongMap[row.question_id] = row;
      }
    });
    const wrongQuestions = Object.values(wrongMap);

    const [keypointStatsRows]: any = await connection.query(
      `SELECT qk.keypoint_id, kp.name, COUNT(*) AS total,
              SUM(CASE WHEN ss.score = qa.marks THEN 1 ELSE 0 END) AS correct
       FROM student_scores ss
       JOIN question_keypoints qk ON ss.question_id = qk.question_id
       JOIN keypoints kp ON qk.keypoint_id = kp.id
       JOIN question_answer qa ON ss.question_id = qa.question_bank_id
       WHERE ss.session_id = ?
       GROUP BY qk.keypoint_id`,
      [sessionId]
    );

    const keypointStats: Record<string, { name: string; correctRate: number }> = {};
    for (const row of keypointStatsRows) {
      keypointStats[row.keypoint_id] = {
        name: row.name,
        correctRate: row.total > 0 ? (row.correct / row.total) * 100 : 0,
      };
    }

    await connection.end();

    return res.status(200).json({
      totalScore,
      fullScore,
      percent: fullScore > 0 ? (totalScore / fullScore) * 100 : 0,
      questionCount,
      totalQuestions: Number(questionCountRows[0]?.total || 0),
      wrongQuestions,
      keypointStats,
    });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    console.error("❌ Failed to fetch exam result:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

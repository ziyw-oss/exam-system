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
  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: "缺少 sessionId" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 验证 session 是否存在并归属当前用户
    const [sessions]: any = await connection.query(
      `SELECT id FROM exam_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    if (sessions.length === 0) {
      await connection.end();
      return res.status(403).json({ message: "无权访问该考试或考试不存在" });
    }

    // 获取答案详情
    const [answers]: any = await connection.query(
      `SELECT
        sa.question_id,
        sa.answer_text,
        qb.text AS question_text,
        qa.answer AS correct_answer,
        qa.guidance,
        qa.marks,
        qr.report_text,
        qr.exemplar_text,
        qb.question_type,
        sa.keypoint_id
      FROM student_answers sa
      JOIN question_bank qb ON sa.question_id = qb.id
      LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
      LEFT JOIN question_report qr ON qb.id = qr.question_bank_id
      WHERE sa.session_id = ?`,
      [sessionId]
    );

    let totalScore = 0;
    let fullScore = 0;
    const wrongQuestions = [];
    const keypointStats: Record<number, { total: number; correct: number; correctRate?: number }> = {};
    const suggestedKeypoints: number[] = [];

    for (const ans of answers) {
      fullScore += ans.marks || 0;
      const score = 0; // Assume score calculation logic is here
      totalScore += score;

      if (score < (ans.marks || 0)) {
        wrongQuestions.push({
          question_id: ans.question_id,
          student_answer: ans.answer_text,
          correct_answer: ans.correct_answer,
        });
      }

      const keypointId = ans.keypoint_id;
      if (!keypointStats[keypointId]) {
        keypointStats[keypointId] = { total: 0, correct: 0 };
      }
      keypointStats[keypointId].total += 1;
      if (score === ans.marks) {
        keypointStats[keypointId].correct += 1;
      }

      await connection.execute(
        `INSERT INTO student_scores (session_id, question_id, score) VALUES (?, ?, ?)`,
        [sessionId, ans.question_id, score]
      );
    }

    for (const keypointId in keypointStats) {
      const stat = keypointStats[+keypointId];
      stat.correctRate = (stat.correct / stat.total) * 100;
      if (stat.correctRate < 60) {
        suggestedKeypoints.push(+keypointId);
      }
    }

    const percent = fullScore > 0 ? (totalScore / fullScore) * 100 : 0;

    await connection.end();
    return res.status(200).json({
      totalScore,
      fullScore,
      percent,
      questionCount: answers.length,
      keypointStats,
      wrongQuestions,
      suggestedKeypoints,
    });
  } catch (err) {
    console.error("❌ 提交考试失败:", err);
    res.status(500).json({ message: "服务器错误，提交失败" });
  }
}
// File: src/pages/api/student/submit-exam.ts

import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

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

    const [sessions]: any = await connection.query(
      `SELECT id FROM exam_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    if (sessions.length === 0) {
      await connection.end();
      return res.status(403).json({ message: "无权访问该考试或考试不存在" });
    }

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
        qk.keypoint_id,
        kp.name AS keypoint_name
      FROM student_answers sa
      JOIN question_bank qb ON sa.question_id = qb.id
      LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
      LEFT JOIN question_report qr ON qb.id = qr.question_bank_id
      LEFT JOIN question_keypoints qk ON qb.id = qk.question_id
      LEFT JOIN keypoints kp ON qk.keypoint_id = kp.id
      WHERE sa.session_id = ?`,
      [sessionId]
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    let totalScore = 0;
    let fullScore = 0;
    const wrongQuestions = [];
    const keypointStats: Record<number, { name: string; total: number; correct: number; correctRate?: number }> = {};
    const suggestedKeypoints: number[] = [];

    for (const ans of answers) {
      if (!ans.answer_text?.trim() || !ans.marks || ans.marks <= 0) {
        continue;
      }

      fullScore += ans.marks;

      const prompt = `你是一位考试评卷官，请根据以下信息为学生作答评分，满分为 ${ans.marks} 分。
题目：${ans.question_text}
参考答案：${ans.correct_answer || "无"}
评分指南：${ans.guidance || "无"}
考官报告：${ans.report_text || "无"}
优秀作答示例：${ans.exemplar_text || "无"}
学生作答：${ans.answer_text || "无"}
请直接输出一个数字分数（0-${ans.marks}），不要添加解释：`;

      let score = 0;
      try {
        console.log("📤 GPT评分Prompt:\n", prompt);
        const gptRes = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
        });
        const content = gptRes.choices[0]?.message?.content?.trim() || "0";
        score = Math.min(parseInt(content), ans.marks);
      } catch (err) {
        console.error("评分失败:", err);
      }

      totalScore += score;

      if (score < ans.marks) {
        wrongQuestions.push({
          question_id: ans.question_id,
          student_answer: ans.answer_text,
          correct_answer: ans.correct_answer,
        });
      }

      const keypointId = ans.keypoint_id;
      if (keypointId) {
        if (!keypointStats[keypointId]) {
          keypointStats[keypointId] = { name: ans.keypoint_name || "", total: 0, correct: 0 };
        }
        keypointStats[keypointId].total += 1;
        if (score === ans.marks) {
          keypointStats[keypointId].correct += 1;
        }
      }

      await connection.execute(
        `REPLACE INTO student_scores (session_id, question_id, score) VALUES (?, ?, ?)`,
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

    await connection.execute(
      `UPDATE exam_sessions SET submitted_at = NOW(), status = 'submitted' WHERE id = ?`,
      [sessionId]
    );

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
    return res.status(500).json({ message: "服务器错误，提交失败" });
  }
}

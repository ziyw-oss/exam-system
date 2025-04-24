// File: src/pages/api/student/submit-exam.ts

import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { getGptScore } from "@/lib/gptScoring";
import fs from "fs";
import path from "path";

function logGptEvaluation(promptData: any, result: { score: number; reason: string }) {
    const logDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
  
    const logPath = path.join(logDir, "gpt_evaluations.log");
    const logEntry = {
      timestamp: new Date().toISOString(),
      prompt: promptData,
      result,
    };
  
    fs.appendFileSync(logPath, JSON.stringify(logEntry, null, 2) + ",\n", "utf-8");
  }

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

// ✅ 封装插入学习进度函数
async function saveLearningProgress(
  connection: mysql.Connection,
  sessionId: number,
  userId: number,
  questionId: number,
  keypointId: number | null,
  answerText: string,
  score: number
) {
  await connection.execute(
    `REPLACE INTO learning_progress (session_id, user_id, question_id, keypoint_id, answer_text, score)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, userId, questionId, keypointId, answerText, score]
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "未提供 token" });

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "缺少 sessionId" });

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

    // ✅ 正确计算整张试卷的满分
    const [markSumRows]: any = await connection.query(
      `SELECT SUM(qb.marks) AS total
       FROM exam_session_questions esq
       JOIN question_bank qb ON esq.question_id = qb.id
       WHERE esq.session_id = ? AND qb.marks IS NOT NULL AND qb.marks > 0`,
      [sessionId]
    );
    const fullScore = Number(markSumRows[0]?.total) || 0;
    console.log("✅ 试卷总分 fullScore:", fullScore);

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

    let totalScore = 0;
    let answeredQuestions = 0;
    let totalQuestions = 0;

    const wrongQuestions = [];
    const keypointStats: Record<number, { name: string; total: number; correct: number; correctRate?: number }> = {};
    const suggestedKeypoints: number[] = [];

    for (const ans of answers) {
      if (!ans.answer_text?.trim() || !ans.marks || ans.marks <= 0) continue;

      answeredQuestions++;

      let score = 0;
      let reason = "";
      try {
        const result = await getGptScore({
          questionText: ans.question_text,
          referenceAnswer: ans.correct_answer,
          guidance: ans.guidance,
          report: ans.report_text,
          exemplar: ans.exemplar_text,
          studentAnswer: ans.answer_text,
          marks: ans.marks,
        });
        const promptData = {
            questionText: ans.question_text,
            referenceAnswer: ans.correct_answer,
            guidance: ans.guidance,
            report: ans.report_text,
            exemplar: ans.exemplar_text,
            studentAnswer: ans.answer_text,
            marks: ans.marks,
          };
          
        logGptEvaluation(promptData, { score, reason });
        
        score = result.score;
        reason = result.reason;
      } catch (err) {
        console.error("评分失败:", err);
      }

      totalScore += score;

      if (score < ans.marks) {
        wrongQuestions.push({
          question_id: ans.question_id,
          student_answer: ans.answer_text,
          correct_answer: ans.correct_answer,
          reason,
        });
      }
      console.log("Ts 文件里的Reason:",reason);
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
        `REPLACE INTO student_scores (session_id, question_id, score, gpt_reasoning) VALUES (?, ?, ?, ?)`,
        [sessionId, ans.question_id, score, reason]
      );

      await saveLearningProgress(connection, sessionId, userId, ans.question_id, ans.keypoint_id, ans.answer_text, score);
    }

    const [qCountRows]: any = await connection.query(
      `SELECT COUNT(*) AS total FROM exam_session_questions esq
       JOIN question_bank qb ON esq.question_id = qb.id
       WHERE esq.session_id = ? AND qb.marks IS NOT NULL AND qb.marks > 0`,
      [sessionId]
    );
    totalQuestions = qCountRows[0]?.total || 0;

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

    const result = {
      totalScore,
      fullScore,
      percent,
      questionCount: answeredQuestions,
      totalQuestions,
      keypointStats,
      wrongQuestions,
      suggestedKeypoints,
    };

    //console.log("📤 返回给前端的数据:", result);

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ 提交考试失败:", err);
    return res.status(500).json({ message: "服务器错误，提交失败" });
  }
}

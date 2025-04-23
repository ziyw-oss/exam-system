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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "未提供 token" });

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "缺少 sessionId" });

  try {
    const connection = await mysql.createConnection(dbConfig);

    // 获取答题记录及题目信息
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
        qb.question_type
      FROM student_answers sa
      JOIN question_bank qb ON sa.question_id = qb.id
      LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
      LEFT JOIN question_report qr ON qb.id = qr.question_bank_id
      WHERE sa.session_id = ?`,
      [sessionId]
    );

    const scores: { question_id: number; score: number }[] = [];

    for (const a of answers) {
      let score = 0;

      if (a.question_type === "single" || a.question_type === "boolean") {
        if (a.answer_text.trim().toLowerCase() === a.correct_answer.trim().toLowerCase()) {
          score = a.marks;
        }
      } else if (a.question_type === "subjective") {
        // 调用 OpenAI API 进行评分
        const prompt = `你是一位考试评卷官，请根据以下信息为学生作答评分，满分为 ${a.marks} 分。
题目：${a.question_text}
参考答案：${a.correct_answer}
评分指南：${a.guidance || "无"}
考官报告：${a.report_text || "无"}
优秀作答示例：${a.exemplar_text || "无"}
学生作答：${a.answer_text}
请直接输出一个数字分数（0-${a.marks}），不要添加解释：`;
console.log("📤 GPT评分Prompt:\n", prompt); // ✅ 这句会输出到终端
console.log(`✅ 题目 ${a.question_id} 得分: ${score} / ${a.marks}`);

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: "Hello, GPT!",
            },
          ],
        });
        console.log(completion.choices[0].message.content);
        const reply = completion.choices[0].message?.content || "0";
        score = parseFloat(reply);
        if (isNaN(score)) score = 0;
        score = Math.min(Math.max(score, 0), a.marks);
      }

      scores.push({ question_id: a.question_id, score });
    }

    // 保存评分结果
    for (const s of scores) {
      await connection.execute(
        `REPLACE INTO student_scores (session_id, question_id, score) VALUES (?, ?, ?)`,
        [sessionId, s.question_id, s.score]
      );
    }

    await connection.end();
    res.status(200).json({ message: "评分完成", scores });
  } catch (err) {
    console.error("❌ 自动评分失败:", err);
    res.status(500).json({ message: "评分失败" });
  }
}
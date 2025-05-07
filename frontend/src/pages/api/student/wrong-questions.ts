// File: src/pages/api/student/wrong-questions.ts

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

    const [rows]: any = await connection.query(
      `SELECT qb.id AS question_id,
              qb.text AS question_text,
              qb.parent_id,
              qb.level,
              sa.answer_text AS student_answer,
              qa.answer AS correct_answer,
              ss.gpt_reasoning,
              parent.text AS parent_text,
              grandparent.text AS grandparent_text
       FROM student_answers sa
       JOIN exam_sessions es ON sa.session_id = es.id
       JOIN question_bank qb ON sa.question_id = qb.id
       LEFT JOIN question_bank parent ON qb.parent_id = parent.id
       LEFT JOIN question_bank grandparent ON parent.parent_id = grandparent.id
       LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
       LEFT JOIN student_scores ss ON sa.session_id = ss.session_id AND sa.question_id = ss.question_id
       WHERE es.user_id = ? AND ss.score IS NOT NULL AND qa.marks IS NOT NULL AND ss.score < qa.marks`,
      [userId]
    );

    const wrongQuestions = rows;

    const parentIds = new Set<number>();
    wrongQuestions.forEach((q: any) => {
      if (q.parent_id) parentIds.add(q.parent_id);
    });

    const [parentRows]: any = await connection.query(
      `SELECT id AS question_id, text AS question_text, parent_id, level
       FROM question_bank
       WHERE id IN (?)`,
      [[...parentIds]]
    );

    const grandparentIds = new Set<number>();
    parentRows.forEach((p: any) => {
      if (p.parent_id) grandparentIds.add(p.parent_id);
    });

    const [grandparentRows]: any = await connection.query(
      `SELECT id AS question_id, text AS question_text, parent_id, level
       FROM question_bank
       WHERE id IN (?)`,
      [[...grandparentIds]]
    );

    // 合并并去重
    const allQuestions = [...wrongQuestions];

    parentRows.forEach((p: any) => {
      if (!allQuestions.find((q: any) => q.question_id === p.question_id)) {
        allQuestions.push({ ...p });
      }
    });

    grandparentRows.forEach((gp: any) => {
      if (!allQuestions.find((q: any) => q.question_id === gp.question_id)) {
        allQuestions.push({ ...gp });
      }
    });

    await connection.end();

    res.status(200).json(allQuestions);
    return;
  } catch (err) {
    console.error("❌ Failed to fetch wrong questions:", err);
    res.status(500).json({ message: "Server error" });
  }
}

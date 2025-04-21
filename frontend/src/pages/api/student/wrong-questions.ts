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
      `SELECT sa.question_id, qb.text AS question_text, sa.answer_text AS student_answer,
              qa.answer AS correct_answer, ss.gpt_reasoning
       FROM student_answers sa
       JOIN exam_sessions es ON sa.session_id = es.id
       JOIN question_bank qb ON sa.question_id = qb.id
       LEFT JOIN question_answer qa ON qb.id = qa.question_bank_id
       LEFT JOIN student_scores ss ON sa.session_id = ss.session_id AND sa.question_id = ss.question_id
       WHERE es.user_id = ? AND ss.score IS NOT NULL AND qa.marks IS NOT NULL AND ss.score < qa.marks`,
      [userId]
    );

    await connection.end();

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch wrong questions:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// /pages/api/student/recheck-answer.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from "mysql2/promise";
import { getGptScore } from '@/lib/gptScoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { question_id, answer } = req.body;
  if (!question_id || typeof answer !== "string") {
    return res.status(400).json({ error: "Missing question_id or answer" });
  }

  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "exam_system",
    });

    const [questions]: any = await connection.query(
      "SELECT * FROM question_bank WHERE id = ?",
      [question_id]
    );
    if (!questions || questions.length === 0) {
      await connection.end();
      return res.status(404).json({ error: "Question not found" });
    }

    const question = questions[0];

    const gptResult = await getGptScore({
      questionText: question.text,
      studentAnswer: answer,
      referenceAnswer: question.reference_answer || question.correct_answer || "",
      marks: question.marks,
    });

    const isCorrect = gptResult.score >= question.marks;

    await connection.end();

    res.status(200).json({ correct: isCorrect });
  } catch (err) {
    console.error("Error rechecking answer:", err);
    res.status(500).json({ error: "Server error" });
  }
}
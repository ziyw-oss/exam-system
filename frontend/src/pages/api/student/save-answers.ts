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
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  let userId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ message: "Token 无效" });
  }

  const { sessionId, answers } = req.body;

  if (!sessionId || typeof answers !== "object") {
    return res.status(400).json({ message: "参数缺失或格式不正确" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    for (const questionId of Object.keys(answers)) {
      const answer = answers[questionId];
      await connection.execute(
        `REPLACE INTO student_answers (session_id, question_id, answer_text)
         VALUES (?, ?, ?)`,
        [sessionId, questionId, answer]
      );
    }

    await connection.end();
    return res.status(200).json({ message: "保存成功" });
  } catch (error) {
    console.error("❌ 保存失败", error);
    return res.status(500).json({ message: "服务器错误" });
  }
}

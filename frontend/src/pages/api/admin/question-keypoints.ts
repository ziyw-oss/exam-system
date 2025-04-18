import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(`
      SELECT question_id, keypoint_id
      FROM question_keypoints
    `);

    await connection.end();

    const bindings: Record<number, number[]> = {};

    for (const row of rows as any[]) {
      const qid = row.question_id;
      const kid = row.keypoint_id;
      if (!bindings[qid]) {
        bindings[qid] = [];
      }
      bindings[qid].push(kid);
    }

    res.status(200).json(bindings);
  } catch (err) {
    console.error("❌ 查询失败:", err);
    res.status(500).json({ error: "查询失败" });
  }
}
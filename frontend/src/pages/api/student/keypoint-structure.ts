import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [sections] = await connection.execute(
      `SELECT id, name FROM sections`
    );

    const [chapters] = await connection.execute(
      `SELECT id, section_id, name FROM chapters`
    );

    const [keypoints] = await connection.execute(
      `SELECT DISTINCT kp.id, kp.chapter_id, kp.name
       FROM keypoints kp
       JOIN question_keypoints qk ON kp.id = qk.keypoint_id
       JOIN question_bank qb ON qk.question_id = qb.id
       WHERE qb.marks > 0`
    );

    await connection.end();

    const structure = (sections as any[]).map((section) => {
      const sectionChapters = (chapters as any[]).filter((c) => c.section_id === section.id);
      return {
        id: section.id,
        name: section.name,
        chapters: sectionChapters.map((chapter) => {
          const chapterKeypoints = (keypoints as any[]).filter((k) => k.chapter_id === chapter.id);
          return {
            id: chapter.id,
            name: chapter.name,
            keypoints: chapterKeypoints.map((kp) => ({ id: kp.id, name: kp.name }))
          };
        }),
      };
    });

    res.status(200).json(structure);
  } catch (err) {
    console.error("❌ 查询知识点结构失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
}

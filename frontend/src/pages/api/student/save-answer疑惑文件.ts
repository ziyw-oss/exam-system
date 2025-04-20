import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'exam_system',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求' });

  const { examId, questionId, answerText } = req.body;
  if (!examId || !questionId) {
    return res.status(400).json({ error: '缺少参数 examId 或 questionId' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    await connection.execute(
      `INSERT INTO exam_answers (session_id, question_id, answer_text, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE answer_text = ?, updated_at = NOW()`,
      [examId, questionId, answerText, answerText]
    );

    await connection.end();
    return res.status(200).json({ message: '答题记录已保存 ✅' });
  } catch (err) {
    console.error('❌ 保存答案失败:', err);
    return res.status(500).json({ error: '服务器错误' });
  }
}

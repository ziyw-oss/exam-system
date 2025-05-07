// frontend/src/pages/api/student/debug-question-label.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getQuestionLabelInfoFromDb } from '@/lib/getQuestionLabelInfo';
import mysql from 'mysql2/promise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { qid } = req.query;
  if (!qid || Array.isArray(qid)) {
    return res.status(400).json({ error: 'Invalid qid' });
  }

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'exam_system', // ⚠️ 请替换为你自己的数据库名
  });

  try {
    const info = await getQuestionLabelInfoFromDb(Number(qid), connection);
    if (!info) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.status(200).json(info);
  } catch (error) {
    console.error('❌ Error fetching label info:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await connection.end();
  }
}

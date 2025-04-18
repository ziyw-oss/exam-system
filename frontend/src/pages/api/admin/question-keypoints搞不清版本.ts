import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'exam_system',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { bindings } = req.body;

  if (!bindings || typeof bindings !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const deleteQuery = 'DELETE FROM question_keypoints WHERE question_id = ?';
    const insertQuery = 'INSERT INTO question_keypoints (question_id, keypoint_id) VALUES (?, ?)';

    for (const questionId of Object.keys(bindings)) {
      const keypointIds = bindings[questionId];
      const qid = parseInt(questionId);

      // 删除该题原有的知识点绑定
      await connection.execute(deleteQuery, [qid]);

      // 插入新的绑定关系
      for (const kid of keypointIds) {
        await connection.execute(insertQuery, [qid, kid]);
      }
    }

    await connection.end();
    return res.status(200).json({ message: '绑定成功' });
  } catch (error) {
    console.error('数据库操作失败：', error);
    return res.status(500).json({ message: '服务器错误' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'exam_system',
  });

  const [rows] = await connection.execute('SELECT id, name FROM keypoints');
  await connection.end();

  res.status(200).json(rows);
}
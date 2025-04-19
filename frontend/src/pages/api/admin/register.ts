import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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

  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: '缺少必要字段' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await mysql.createConnection(dbConfig);

    // 检查邮箱是否已存在
    const [existingRows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if ((existingRows as any[]).length > 0) {
      await connection.end();
      return res.status(409).json({ message: '该邮箱已注册' });
    }

    await connection.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    await connection.end();

    return res.status(200).json({ success: true, message: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
}

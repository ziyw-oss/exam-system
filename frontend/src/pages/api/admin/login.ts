import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'exam_system',
};

// ✅ 更稳妥的方式：在函数中进行检查，避免模块级别抛错影响构建
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("❌ JWT_SECRET 未设置，请检查 .env 文件");
  }
  return secret;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    await connection.end();

    const user: any = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: '密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      getJwtSecret(), // ✅ 动态检查
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
}
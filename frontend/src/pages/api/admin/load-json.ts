// src/pages/api/admin/load-json.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { uuid, file } = req.query;

  if (!uuid || !file || typeof uuid !== 'string' || typeof file !== 'string') {
    return res.status(400).json({ error: '❌ 缺少 uuid 或 file 参数' });
  }

  const filePath = path.join(process.cwd(), '..', 'backend', 'outputs', uuid, file);
  console.log("🧪 读取文件:", filePath);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '❌ 文件不存在' });
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(data);

    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({ error: '❌ 读取失败', detail: (error as Error).message });
  }
}
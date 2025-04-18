// frontend/src/pages/api/admin/test-db.ts
import type { NextApiRequest, NextApiResponse } from "next";
import db from "../../../../../../exam-system/backend/config/db"; // 👈直接相对路径

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query("SELECT 1 AS result");
    conn.release();

    res.status(200).json({ success: true, result: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

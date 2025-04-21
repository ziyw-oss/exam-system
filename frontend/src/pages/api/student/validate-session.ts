// File: src/pages/api/student/validate-session.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ valid: false, error: "Missing sessionId" });
  }

  try {
    const [rows]: any[] = await pool.query(
      `SELECT COUNT(*) AS count FROM student_answers WHERE session_id = ?`,
      [sessionId]
    );
    const valid = rows[0]?.count > 0;
    return res.status(200).json({ valid });
  } catch (err) {
    console.error("Validate session error:", err);
    return res.status(500).json({ valid: false, error: "Server error" });
  }
}
// File: /pages/api/student/check-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { jwtDecode } from "jwt-decode";
import { pool } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const user: any = jwtDecode(token);

    const [rows] = await pool.execute(
        "SELECT id FROM exam_sessions WHERE user_id = ? AND status = 'in_progress' LIMIT 1",
        [user.id]
      );

    const sessionRow = (rows as any[])[0];

    return res.status(200).json({
      sessionId: sessionRow?.id ?? null,
    });
  } catch (err) {
    console.error("check-session error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
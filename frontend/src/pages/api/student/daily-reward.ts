// File: src/pages/api/student/daily-reward.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { jwtDecode } from "jwt-decode";
import { pool } from "@/lib/db";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
  exp: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const user = jwtDecode<DecodedToken>(token);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = today.toISOString().slice(0, 19).replace("T", " ");
    const end = new Date(today.getTime() + 86400000).toISOString().slice(0, 19).replace("T", " ");

    // ✅ 查询所有 session 时间（不限 mode）
    const [sessionRows]: any[] = await pool.query(
      `SELECT id, mode, started_at AS start_time, submitted_at AS end_time
       FROM exam_sessions
       WHERE user_id = ? AND started_at BETWEEN ? AND ?`,
      [user.id, start, end]
    );

    let reward = 0;
    const rewardList = [];

    for (const session of sessionRows) {
      // ✅ 仅正式考试才参与得分奖励计算
      if (session.mode === "exam") {
        const [scoreRows]: any[] = await pool.query(
          `SELECT SUM(score) AS total_score FROM student_scores WHERE session_id = ?`,
          [session.id]
        );
        const totalScore = scoreRows[0]?.total_score || 0;

        const [fullRows]: any[] = await pool.query(
          `SELECT SUM(qb.marks) AS full_score
           FROM student_scores ss
           JOIN question_bank qb ON ss.question_id = qb.id
           WHERE ss.session_id = ?`,
          [session.id]
        );
        const fullScore = fullRows[0]?.full_score || 0;

        const percentage = fullScore > 0 ? (totalScore / fullScore) * 100 : 0;

        if (percentage >= 50) {
          let bonus = 0;
          if (percentage < 60) bonus = 10;
          else if (percentage < 70) bonus = 20;
          else if (percentage < 80) bonus = 30;
          else if (percentage < 90) bonus = 40;
          else if (percentage < 100) bonus = 50;
          else bonus = 100;
          reward += bonus;
          rewardList.push({ reason: `Scored ${Math.round(percentage)}% on Practice`, amount: bonus });
        }
      }
    }

    return res.status(200).json({ totalHours: 0, totalReward: reward, rewards: rewardList });
  } catch (err) {
    console.error("Reward API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

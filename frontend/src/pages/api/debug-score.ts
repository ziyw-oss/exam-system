// File: src/pages/api/debug-score.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getGptScore } from "@/lib/gptScoring";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    questionText,
    referenceAnswer,
    studentAnswer,
    marks,
  } = req.body;

  const score = await getGptScore({
    questionText,
    referenceAnswer,
    studentAnswer,
    marks,
  });

  return res.status(200).json({ score });
}
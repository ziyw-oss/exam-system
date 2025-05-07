// File: src/lib/gptScoring.ts

import OpenAI from "openai/index.mjs";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface GptScoreInput {
  questionText: string;
  referenceAnswer?: string;
  guidance?: string;
  report?: string;
  exemplar?: string;
  studentAnswer: string;
  marks: number;
}

export async function getGptScore(input: GptScoreInput): Promise<{ score: number; reason: string }> {
  const {
    questionText,
    referenceAnswer,
    guidance,
    report,
    exemplar,
    studentAnswer,
    marks,
  } = input;

  const prompt = `You are a professional exam grader. Please evaluate the student's answer based on the following materials. The maximum score is ${marks}.

Question: ${questionText}
Reference Answer: ${referenceAnswer || "N/A"}
Marking Scheme: ${guidance || "N/A"}
Examiner Report: ${report || "N/A"}
Exemplar Answer: ${exemplar || "N/A"}
Student's Answer: ${studentAnswer || "N/A"}

Step 1: Evaluate the student's answer in terms of relevance, accuracy, and completeness.
Step 2: Return:
- \"score\": the numerical score (0 to ${marks})
- \"reason\": a short explanation for why this score was given.

Respond in the following JSON format:
{
  "score": number,
  "reason": "your explanation"
}`;

  // Save prompt to log file
  const logsDir = path.resolve(process.cwd(), "gpt_logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  const logFile = path.join(logsDir, `prompt_${Date.now()}.txt`);
  fs.writeFileSync(logFile, prompt, "utf-8");

  // Cleanup old log files (older than 10 days)
  const files = fs.readdirSync(logsDir);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > 10 * 24 * 60 * 60 * 1000) { // 10 days in ms
      fs.unlinkSync(filePath);
    }
  }

  try {
    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = gptRes.choices[0]?.message?.content?.trim();
    //console.log("\ud83d\udce4 GPT Raw Output:", raw);

    let parsed = { score: 0, reason: "Unable to parse GPT response." };
    try {
      if (raw) {
        const match = raw.match(/\{[\s\S]*?\}/); // 尝试提取 JSON
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }
    } catch (err) {
      console.warn("\u26a0\ufe0f GPT returned invalid JSON format");
    }
    return parsed;
  } catch (err) {
    console.error("\u274c GPT Scoring failed:", err);
    return { score: 0, reason: "GPT scoring error." };
  }
}

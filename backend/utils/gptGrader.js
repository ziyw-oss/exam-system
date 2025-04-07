// backend/utils/gptGrader.js (含 examiner report 提示增强)
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gradeCode } from "./codeRunner.js";
import { scoreShortAnswer } from "./scoreShortAnswer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const report = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/report.json"), "utf-8"));

let openaiInstance = null;
function getOpenAI() {
  if (!openaiInstance) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("❌ Missing OPENAI_API_KEY in environment");
    openaiInstance = new OpenAI({ apiKey: key });
  }
  return openaiInstance;
}

function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.warn("⚠️ Failed inner JSON parse:", match[0]);
        return null;
      }
    }
    console.warn("⚠️ No JSON block found in GPT response:", text);
    return null;
  }
}

export async function gradeAnswer(qid, answer, schema) {
  if (!schema) {
    return { score: 0, max: 0, feedback: "No schema found" };
  }

  if (schema.type === "code") {
    return gradeCode(qid, answer, schema.tests);
  }

  if (schema.type === "short") {
    return scoreShortAnswer(answer, schema);
  }

  const prompt = `
You are an OCR AS-Level Computer Science examiner.
Please grade the following student's answer for question ${qid}.

Examiners report guidance:
${report[qid] || ""}

Mark scheme:
${JSON.stringify(schema, null, 2)}

Student's answer:
"""
${answer}
"""

Provide JSON only:
{
  "score": <number>,
  "max": <number>,
  "feedback": "..."
}
`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });
    const text = completion.choices[0].message.content;
    console.log("🧠 GPT raw response:\n", text);
    const result = extractJSON(text);
    if (!result) throw new Error("GPT returned non-JSON content.");
    return result;
  } catch (err) {
    console.error("❌ GPT grading error:", err.message);
    return { score: 0, max: schema?.max || 0, feedback: "GPT output error. Please retry or check logs." };
  }
}

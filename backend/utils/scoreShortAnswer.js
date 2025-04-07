// backend/utils/scoreShortAnswer.js (ESM + 语义匹配增强)
import natural from "natural";
const tokenizer = new natural.WordTokenizer();

export function scoreShortAnswer(answer, schema) {
  if (!schema || schema.type !== "short") {
    return { score: 0, max: 0, feedback: "Invalid schema." };
  }

  const keywords = schema.keywords || [];
  const maxScore = schema.max || keywords.length;

  const answerTokens = tokenizer.tokenize(answer.toLowerCase());

  const hits = [];
  for (const keyword of keywords) {
    const keyTokens = tokenizer.tokenize(keyword.toLowerCase());
    const overlap = keyTokens.filter(t => answerTokens.includes(t));
    const scoreRatio = overlap.length / keyTokens.length;
    if (scoreRatio >= 0.5) {
      hits.push(keyword);
    }
  }

  const score = Math.min(hits.length, maxScore);

  return {
    score,
    max: maxScore,
    feedback: `Matched ${score} keyword(s): ${hits.join(", ")}`
  };
}

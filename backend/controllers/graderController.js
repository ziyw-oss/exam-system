// backend/controllers/graderController.js (添加 examinerReport 到返回结果中)
import { gradeAnswer } from "../utils/gptGrader.js";
import markScheme from "../config/markScheme.json" assert { type: "json" };
import report from "../config/report.json" assert { type: "json" };

export async function autoGrade(req, res) {
  const { paperId, answers } = req.body;
  const result = {};

  for (const [qid, answer] of Object.entries(answers)) {
    const schema = markScheme[qid];
    const scoreResult = await gradeAnswer(qid, answer, schema);
    result[qid] = {
      ...scoreResult,
      examinerReport: report[qid] || null
    };
  }

  res.json({ paperId, graded: result });
}

import mysql from "mysql2/promise";

export interface Question {
  question_id: number;
  text: string;
  parent_id?: number;
  level: "question" | "sub_question" | "subsub_question";
}

export interface QuestionLabelInfo {
  id: number;
  fullLabel: string; // e.g. 1(a)(i)
  text: string;
  level: string;
  parent?: QuestionLabelInfo;
}

const numberToAlpha = (n: number) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[n - 1] || "?"; // n starts from 1
};

const numberToRoman = (n: number) => {
  const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return romans[n - 1] || `(${n})`;
};

const getIndex = (list: Question[], id: number): number => {
  //console.log("🔎 getIndex list:", list.map(q => q.question_id), "target id:", id);
  return list.findIndex(q => q.question_id === id) + 1;
};

export async function getQuestionLabelInfoFromDb(
  qid: number,
  connection: mysql.Connection
): Promise<QuestionLabelInfo | undefined> {
  const [rows]: any = await connection.query(
    `WITH RECURSIVE question_tree AS (
       SELECT id AS question_id, text, parent_id, level
       FROM question_bank
       WHERE id = ?

       UNION ALL

       SELECT qb.id, qb.text, qb.parent_id, qb.level
       FROM question_bank qb
       INNER JOIN question_tree qt ON qb.id = qt.parent_id
     ),
     all_ids AS (
       SELECT question_id FROM question_tree
       UNION
       SELECT id FROM question_bank WHERE parent_id IN (SELECT question_id FROM question_tree)
     )
     SELECT id AS question_id, text, parent_id, level
     FROM question_bank
     WHERE id IN (SELECT question_id FROM all_ids)`,
    [qid]
  );

  if (!rows || rows.length === 0) return undefined;

  const questions: Question[] = rows.map((row: any) => ({
    question_id: row.question_id,
    text: row.text,
    parent_id: row.parent_id ?? row.parent,  // 支持 parent 字段名
    level: row.level,
  }));

  // Find the root question (top-most ancestor)
  const findRootQuestion = (questions: Question[], qid: number): Question => {
    let current = questions.find(q => q.question_id === qid);
    while (current?.parent_id) {
      current = questions.find(q => q.question_id === current!.parent_id);
    }
    return current!;
  };

  const rootQuestion = findRootQuestion(questions, qid);

  const [siblingRows]: any = await connection.query(
    `SELECT id AS question_id, text, parent_id, level
     FROM question_bank
     WHERE parent_id ${rootQuestion.parent_id === null ? 'IS NULL' : '= ?'} AND level = 'question'`,
    rootQuestion.parent_id === null ? [] : [rootQuestion.parent_id]
  );

  siblingRows.forEach((row: any) => {
    if (!questions.find(q => q.question_id === row.question_id)) {
      questions.push({
        question_id: row.question_id,
        text: row.text,
        parent_id: row.parent_id ?? undefined,
        level: row.level,
      });
    }
  });

  const [topLevelRows]: any = await connection.query(
    `SELECT id AS question_id, text, parent_id, level
     FROM question_bank
     WHERE level = 'question' AND parent_id IS NULL`
  );
  topLevelRows.forEach((row: any) => {
    if (!questions.find(q => q.question_id === row.question_id)) {
      questions.push({
        question_id: row.question_id,
        text: row.text,
        parent_id: row.parent_id ?? undefined,
        level: row.level,
      });
    }
  });

  return getQuestionLabelInfo(qid, questions);
}

export function getQuestionLabelInfo(
  qid: number,
  questions: Question[]
): QuestionLabelInfo | undefined {
  const questionMap = new Map<number, Question>(
    questions.map(q => [q.question_id, q])
  );
  const mainQuestions = questions
    .filter(q => q.level === "question" && !q.parent_id)
    .sort((a, b) => a.question_id - b.question_id);

  const labelCache = new Map<number, QuestionLabelInfo>();

  const buildLabel = (q: Question): QuestionLabelInfo => {
    if (labelCache.has(q.question_id)) return labelCache.get(q.question_id)!;

    let label = "";
    let parentInfo: QuestionLabelInfo | undefined;

    if (q.level === "question") {
      //console.log("🔢 mainQuestions:", mainQuestions.map(q => q.question_id));
      const index = getIndex(mainQuestions, q.question_id);
      label = `${index}.`;
    }

    if (q.level === "sub_question") {
      const parent = questionMap.get(q.parent_id!);
      //console.log("🔁 sub_question parent:", parent);
      parentInfo = parent ? buildLabel(parent) : undefined;

      const siblings = questions
        .filter(sq => sq.parent_id === q.parent_id && sq.level === q.level)
        .sort((a, b) => a.question_id - b.question_id);
      //console.log("🔍 sub_question siblings raw:", siblings.map(s => s.question_id));
      //console.log("🔍 siblings for sub_question", q.question_id, siblings.map(s => s.question_id));
      //console.log("👨‍👦 sub_question siblings:", siblings.map(q => q.question_id));
      const index = getIndex(siblings, q.question_id);
      label = `${parentInfo?.fullLabel || "?"}(${numberToAlpha(index)})`;
    }

    if (q.level === "subsub_question") {
      const parent = questionMap.get(q.parent_id!);
      //console.log("🔁 subsub_question parent:", parent);
      parentInfo = parent ? buildLabel(parent) : undefined;

      const subsubSiblings = questions
        .filter(sq => sq.parent_id === q.parent_id && sq.level === q.level)
        .sort((a, b) => a.question_id - b.question_id);
      //console.log("🔍 subsub_question siblings raw:", subsubSiblings.map(s => s.question_id));
      //console.log("🔍 siblings for subsub_question", q.question_id, subsubSiblings.map(s => s.question_id));
      //console.log("👨‍👦 subsub siblings:", subsubSiblings.map(q => q.question_id));
      const subsubIndex = numberToRoman(getIndex(subsubSiblings, q.question_id));

      label = `${parentInfo?.fullLabel || "?"}(${subsubIndex})`;
    }

    const result = {
      id: q.question_id,
      fullLabel: label,
      text: q.text,
      level: q.level,
      parent: parentInfo,
    };

    labelCache.set(q.question_id, result);
    return result;
  };

  //console.log("🎯 target qid:", qid, "target object:", questionMap.get(qid));
  const target = questionMap.get(qid);
  if (!target) return undefined;
  //console.log("✅ final target object:", target);
  return buildLabel(target);
}
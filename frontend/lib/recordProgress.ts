// File: lib/recordProgress.ts
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "exam_system",
};

export async function recordLearningProgress(
  sessionId: number,
  userId: number,
  questionId: number,
  keypointId: number | null,
  answerText: string,
  score: number
) {
  const connection = await mysql.createConnection(dbConfig);

  const [[row]]: any = await connection.query(
    `SELECT MAX(attempt) AS maxAttempt FROM learning_progress WHERE session_id = ? AND user_id = ? AND question_id = ?`,
    [sessionId, userId, questionId]
  );

  const attempt = (row?.maxAttempt || 0) + 1;

  await connection.execute(
    `INSERT INTO learning_progress (session_id, user_id, question_id, keypoint_id, attempt, answer_text, score)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       answer_text = VALUES(answer_text),
       score = VALUES(score),
       updated_at = CURRENT_TIMESTAMP`,
    [sessionId, userId, questionId, keypointId, attempt, answerText, score]
  );

  await connection.end();
}

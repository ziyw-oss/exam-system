
const express = require("express");
const db = require("../config/db");
const router = express.Router();

// 📌 获取某个学生的总学习进度（所有章节的汇总）
router.get("/:user_id", (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const sqlQuery = `
        SELECT DATE_FORMAT(updated_at, '%Y-%m-%d') AS date, ROUND(AVG(correct_rate * 100), 2) AS score
        FROM learning_progress 
        WHERE user_id = ? 
        GROUP BY date 
        ORDER BY date ASC
    `;

    console.log("Executing SQL:", sqlQuery, "with user_id =", user_id);
    db.query(sqlQuery, [user_id], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 📌 获取某个学生在某个章节的学习进度
router.get("/:user_id/chapter/:chapter_id", (req, res) => {
    const { user_id, chapter_id } = req.params;

    db.query(
        `SELECT kp.id AS keypoint_id, kp.name, lp.practice_count, lp.correct_rate 
         FROM keypoints kp
         LEFT JOIN learning_progress lp ON kp.id = lp.keypoint_id AND lp.user_id = ?
         WHERE kp.chapter_id = ?`,
        [user_id, chapter_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// 📌 更新学生的学习进度
router.post("/update", (req, res) => {
    const { user_id, keypoint_id, correct } = req.body;

    if (!user_id || !keypoint_id || correct === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    db.query(
        "SELECT practice_count, correct_rate FROM learning_progress WHERE user_id = ? AND keypoint_id = ?",
        [user_id, keypoint_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length > 0) {
                // 更新已有进度
                const { practice_count, correct_rate } = results[0];
                const newCount = practice_count + 1;
                const newRate = ((correct_rate * practice_count) + (correct ? 1 : 0)) / newCount;

                db.query(
                    "UPDATE learning_progress SET practice_count = ?, correct_rate = ? WHERE user_id = ? AND keypoint_id = ?",
                    [newCount, newRate, user_id, keypoint_id],
                    (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: "Progress updated" });
                    }
                );
            } else {
                // 插入新记录
                db.query(
                    "INSERT INTO learning_progress (user_id, keypoint_id, practice_count, correct_rate) VALUES (?, ?, 1, ?)",
                    [user_id, keypoint_id, correct ? 1 : 0],
                    (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: "Progress inserted" });
                    }
                );
            }
        }
    );
});

module.exports = router;
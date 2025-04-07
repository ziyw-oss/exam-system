const express = require("express");
const db = require("../config/db");
const router = express.Router();

// 获取所有学习目录（Sections）
router.get("/sections", (req, res) => {
    db.query("SELECT * FROM sections", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 获取某个目录的所有章节
router.get("/section/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM chapters WHERE section_id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 获取某章节的详细内容
router.get("/chapter/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM chapters WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

router.get("/chapter/:id/keypoints", (req, res) => {
    const chapterId = req.params.id;
    db.query("SELECT * FROM keypoints WHERE chapter_id = ?", [chapterId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "No keypoints found" });
        res.json(results);
    });
});

// 获取某个知识点的详细内容
router.get("/keypoint/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM keypoints WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

module.exports = router;
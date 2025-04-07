// backend/routes/learn.js (ESM 版本)
import express from "express";

const router = express.Router();

router.get("/chapters", (req, res) => {
  res.json({ message: "📘 返回章节列表（示例数据）" });
});

export default router;
// backend/routes/progress.js (ESM 版本)
import express from "express";

const router = express.Router();

router.get("/student", (req, res) => {
  res.json({ message: "📈 返回学生进度（示例数据）" });
});

export default router;

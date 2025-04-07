// backend/routes/graderRouter.js (ESM 版本)
import express from "express";
import { autoGrade } from "../controllers/graderController.js";

const router = express.Router();

router.post("/grade", autoGrade);

// ✅ 添加默认导出
export default router;
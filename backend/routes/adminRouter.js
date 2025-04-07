// backend/routes/adminRouter.js
import express from "express";
import { uploadMiddleware, importExamHandler } from "../controllers/importController.js";

const router = express.Router();

// 📥 上传试卷 + 自动导入题库
router.post("/import-exam", uploadMiddleware, importExamHandler);

export default router;

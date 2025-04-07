// backend/controllers/importController.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";

const UPLOAD_DIR = path.join("uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uid = req.uid;
    const dir = path.join(UPLOAD_DIR, uid);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
export const uploadMiddleware = upload.fields([
  { name: "paper", maxCount: 1 },
  { name: "markscheme", maxCount: 1 },
  { name: "report", maxCount: 1 },
]);

export const importExamHandler = async (req, res) => {
  try {
    const uid = uuidv4();
    req.uid = uid;
    const uploadPath = path.join(UPLOAD_DIR, uid);
    const paperPath = path.join(uploadPath, "paper.pdf");

    const py = spawn("python3", [
      "scripts/parse_pdf.py",
      "--pdf",
      paperPath,
      "--outdir",
      uploadPath
    ]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => (stdout += data.toString()));
    py.stderr.on("data", (data) => (stderr += data.toString()));

    py.on("close", (code) => {
      console.log("📦 脚本 stdout:", stdout);
      console.log("📦 脚本 stderr:", stderr);
      console.log("📦 退出码:", code);

      if (code !== 0) {
        return res.status(500).json({ error: "结构化失败", stderr });
      }

      const structuredPath = path.join(uploadPath, "structured_with_code_blocks.json");
      try {
        const structured = JSON.parse(fs.readFileSync(structuredPath, "utf-8"));
        return res.json({ message: "导入成功", structured });
      } catch (e) {
        return res.status(500).json({ error: "结果文件读取失败", details: e.message });
      }
    });
  } catch (e) {
    console.error("导入异常:", e);
    res.status(500).json({ error: "导入失败" });
  }
};

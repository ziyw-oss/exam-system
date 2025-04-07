// frontend/src/pages/api/admin/import-exam.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { spawnSync, spawn } from 'child_process';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({ multiples: false, uploadDir, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    const paper = Array.isArray(files.paper) ? files.paper[0] : files.paper;
    const markscheme = Array.isArray(files.markscheme) ? files.markscheme[0] : files.markscheme;
    const report = Array.isArray(files.report) ? files.report[0] : files.report;

    if (!paper || !markscheme || !report) {
      return res.status(400).json({ error: '缺少上传文件' });
    }

    const serverRoot = path.resolve(process.cwd(), '..');
    const pythonPath = 'python3';

    // Step 1: 临时解析 paper 获取 exam_id
    const tmpOutput = path.join(serverRoot, 'backend', 'outputs', 'tmp');
    fs.mkdirSync(tmpOutput, { recursive: true });
    const probe = spawnSync(pythonPath, ['backend/scripts/parse_pdf.py', paper.filepath, tmpOutput], { cwd: serverRoot });

    const outputJsonPath = path.join(tmpOutput, 'output.json');
    if (!fs.existsSync(outputJsonPath)) {
      return res.status(500).json({ error: '无法读取结构化文件', detail: probe.stderr.toString() });
    }

    let examId = 'unknown';
    try {
      const parsed = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
      examId = parsed?.[0]?.exam_id?.toString() || 'unknown';
    } catch (e: any) {
      return res.status(500).json({ error: '解析 output.json 失败', detail: e.message });
    }

    // Step 2: 移动上传文件到 uploads/{examId}
    const finalUploadDir = path.join(serverRoot, 'uploads', examId);
    fs.mkdirSync(finalUploadDir, { recursive: true });

    const moveFile = (file: formidable.File, name: string) => {
      const target = path.join(finalUploadDir, name);
      fs.renameSync(file.filepath, target);
      return target;
    };

    const finalPaperPath = moveFile(paper, 'paper.pdf');
    const finalMarkPath = moveFile(markscheme, 'markscheme.pdf');
    const finalReportPath = moveFile(report, 'report.pdf');

    // Step 3: 重新解析主试卷
    const finalOutputDir = path.join(serverRoot, 'backend', 'outputs', examId);
    fs.mkdirSync(finalOutputDir, { recursive: true });

    const python = spawn(pythonPath, ['backend/scripts/parse_pdf.py', finalPaperPath, finalOutputDir], {
      cwd: serverRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    
    let stdout = '', stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log("📥 python stdout:", data.toString());
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error("❌ python stderr:", data.toString());
    });
    
    python.on('close', (code) => {
      console.log("📦 python exited:", code);
      console.log("🟢 总 stdout:", stdout);
      console.log("🔴 总 stderr:", stderr);
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: '❌ parse_pdf 执行失败', detail: stderr });
      }
    
    // Step 4: 结构化评分标准 / 考官报告
    console.log("📦 调用 parse_markscheme.py:", finalMarkPath, finalOutputDir);
    const markschemeJsonPath = path.join(finalOutputDir, 'markscheme.json');
    const markResult = spawnSync(pythonPath, ['backend/scripts/parse_markscheme.py', finalMarkPath, finalOutputDir], {
      cwd: serverRoot,
    });
    console.log("✅ markscheme stdout:", markResult.stdout.toString());
    console.error("❌ markscheme stderr:", markResult.stderr.toString());
    console.log("📦 markscheme exit:", markResult.status);

    console.log("📦 调用 parse_report.py:", finalReportPath, finalOutputDir);
    const reportJsonPath = path.join(finalOutputDir, 'report.json');
    const reportResult = spawnSync(pythonPath, ['backend/scripts/parse_report.py', finalReportPath, finalOutputDir], {
      cwd: serverRoot,
    });
    console.log("✅ report stdout:", reportResult.stdout.toString());
    console.error("❌ report stderr:", reportResult.stderr.toString());
    console.log("📦 report exit:", reportResult.status);

      // ✅ Step 5: 返回最终结构化数据
      try {
        const structured = JSON.parse(
          fs.readFileSync(path.join(finalOutputDir, 'output.json'), 'utf-8')
        );
        return res.status(200).json({ structured, uuid: examId });
      } catch (e: any) {
        return res.status(500).json({ error: '读取结构化数据失败', detail: e.message });
      }
    });

   
  });
}
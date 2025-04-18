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

  const form = formidable({
    multiples: false,
    uploadDir,
    keepExtensions: true,
  });

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

    // 🔍 第一步：解析 exam_id
    const tmpPaperPath = paper.filepath;
    const tmpOutput = path.join(serverRoot, 'backend', 'outputs', 'tmp');
    fs.mkdirSync(tmpOutput, { recursive: true });

    const probe = spawnSync(pythonPath, ['backend/scripts/parse_pdf.py', tmpPaperPath, tmpOutput], {
      cwd: serverRoot,
    });

    const outputJsonPath = path.join(tmpOutput, 'output.json');
    if (!fs.existsSync(outputJsonPath)) {
      return res.status(500).json({ error: '无法读取结构化文件，output.json 未生成', detail: probe.stderr.toString() });
    }

    let examId = 'unknown';
    try {
      const parsed = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
      examId = parsed?.[0]?.exam_id?.toString() || 'unknown';
    } catch (e: any) {
      return res.status(500).json({ error: '解析 output.json 失败', detail: e.message });
    }

    // 🔄 第二步：移动文件到 uploads/{exam_id}
    const finalUploadDir = path.join(serverRoot, 'uploads', examId);
    fs.mkdirSync(finalUploadDir, { recursive: true });

    const moveFile = (file: formidable.File, name: string) => {
      const target = path.join(finalUploadDir, name);
      fs.renameSync(file.filepath, target);
      return target;
    };

    const finalPaperPath = moveFile(paper, 'paper.pdf');
    moveFile(markscheme, 'markscheme.pdf');
    moveFile(report, 'report.pdf');

    // 🔁 第三步：再次运行结构化脚本写入 outputs/{exam_id}
    const finalOutputDir = path.join(serverRoot, 'backend', 'outputs', examId);
    fs.mkdirSync(finalOutputDir, { recursive: true });

    const python = spawn(pythonPath, ['backend/scripts/parse_pdf.py', finalPaperPath, finalOutputDir], {
      cwd: serverRoot,
    });

    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d.toString());
    python.stderr.on('data', d => stderr += d.toString());

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: '❌ Python 脚本执行失败', detail: stderr });
      }

      try {
        const structured = JSON.parse(fs.readFileSync(path.join(finalOutputDir, 'output.json'), 'utf-8'));
        return res.status(200).json({ structured, uuid: examId });
      } catch (e: any) {
        return res.status(500).json({ error: '读取结构化数据失败', detail: e.message });
      }
    });
  });
}

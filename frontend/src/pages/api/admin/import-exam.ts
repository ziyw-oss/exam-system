// frontend/src/pages/api/admin/import-exam.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';


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

    const finalOutputDir = path.join(serverRoot, 'backend', 'outputs', examId);
    fs.mkdirSync(finalOutputDir, { recursive: true });

    const markResult = spawnSync(pythonPath, ['backend/scripts/parse_markscheme.py', finalMarkPath, finalOutputDir, examId.toString()], {
      cwd: serverRoot,
    });
    const markstdout = markResult.stdout.toString();
    const markstderr = markResult.stderr.toString();
    
    console.log("📥 markscheme stdout:", markstdout);
    
    const python = spawn(pythonPath, ['backend/scripts/parse_pdf.py', finalPaperPath, finalOutputDir], {
      cwd: serverRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    }); 

    let stdout = '', stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
      
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: '❌ parse_pdf 执行失败', detail: stderr || '未知错误' });
      }

      const reportResult = spawnSync(pythonPath, ['backend/scripts/parse_report.py', finalReportPath, finalOutputDir, examId.toString()], {
        cwd: serverRoot,
      });
      const reportstderr = reportResult.stderr.toString();
      

      try {
        const structured = JSON.parse(
          fs.readFileSync(path.join(finalOutputDir, 'output.json'), 'utf-8')
        );
        return res.status(200).json({
          structured,
          uuid: examId,
          logs: {
            parse_pdf: stderr,
            parse_markscheme: markstderr,
            parse_report: reportstderr
          }
        });
      } catch (e: any) {
        return res.status(200).json({
          error: '读取结构化数据失败',
          detail: e.message,
          logs: {
            parse_pdf: stderr,
            parse_markscheme: markstderr,
            parse_report: reportstderr
          }
        });
      }
    });
  });
}

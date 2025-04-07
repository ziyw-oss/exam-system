import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { uuid } = req.query;
  if (!uuid || typeof uuid !== "string") {
    return res.status(400).json({ error: "❌ 缺少 uuid 参数" });
  }

  const outputDir = path.resolve(process.cwd(), "..", "backend", "outputs", uuid);

  try {
    const structuredPath = path.join(outputDir, "output.json");
    const structured = JSON.parse(fs.readFileSync(structuredPath, "utf-8"));

    let markscheme = null;
    let report = null;

    const markPath = path.join(outputDir, "markscheme.json");
    const reportPath = path.join(outputDir, "report.json");

    if (fs.existsSync(markPath)) {
      markscheme = JSON.parse(fs.readFileSync(markPath, "utf-8"));
    }

    if (fs.existsSync(reportPath)) {
      report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    }

    return res.status(200).json({
      uuid,
      structured,
      markscheme,
      report,
    });
  } catch (e: any) {
    return res.status(500).json({ error: "❌ 读取结构化数据失败", detail: e.message });
  }
}
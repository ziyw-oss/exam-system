// scripts/route-auditor.ts

import fs from "fs";
import path from "path";

const ROUTE_DIR = path.resolve(__dirname, "../frontend/app");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

function hasDefaultExport(content: string): boolean {
  return /export\s+default\s+(function|class|const)/.test(content);
}

function auditRoutes() {
  const files = walk(ROUTE_DIR);
  const problems: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const relativePath = path.relative(process.cwd(), file);

    if (!hasDefaultExport(content)) {
      problems.push(`🛑 Missing default export → ${relativePath}`);
    }
  }

  if (problems.length === 0) {
    console.log("✅ All route files have valid default exports!");
  } else {
    console.log("🔍 Route Issues Found:");
    problems.forEach((line) => console.log("   " + line));
    process.exitCode = 1;
  }
}

auditRoutes();
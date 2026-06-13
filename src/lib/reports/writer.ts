import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";

export async function writeMarkdownReport(relativePath: string, content: string) {
  const config = getConfig();
  const target = path.join(process.cwd(), config.reportsDir, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return path.relative(process.cwd(), target).replace(/\\/g, "/");
}

export function repoReportPath(owner: string, repo: string) {
  return `repos/${owner}__${repo}.md`;
}

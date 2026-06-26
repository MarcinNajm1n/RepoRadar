import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";
export { repoQuickBriefPath, repoReportPath } from "./paths";

export async function writeMarkdownReport(relativePath: string, content: string) {
  const config = getConfig();
  const reportsRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.reportsDir);
  const target = path.resolve(reportsRoot, relativePath);
  if (!target.startsWith(`${reportsRoot}${path.sep}`) && target !== reportsRoot) {
    throw new Error("Report path must stay inside REPORTS_DIR");
  }
  if (path.extname(target).toLowerCase() !== ".md") {
    throw new Error("Report path must use a .md extension");
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return path.relative(/*turbopackIgnore: true*/ process.cwd(), target).replace(/\\/g, "/");
}

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "check-sensitive-files.ps1");
const runOnWindows = process.platform === "win32" ? it : it.skip;

function withTempGitRepo(run: (repoDir: string) => void) {
  const repoDir = mkdtempSync(path.join(tmpdir(), "reporadar-sensitive-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: repoDir });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: repoDir });
    run(repoDir);
  } finally {
    rmSync(repoDir, { recursive: true, force: true });
  }
}

function stageFile(repoDir: string, filePath: string, content: string) {
  writeFileSync(path.join(repoDir, filePath), content);
  execFileSync("git", ["add", filePath], { cwd: repoDir });
}

function runSensitiveCheck(repoDir: string) {
  return spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Staged"], {
    cwd: repoDir,
    encoding: "utf8"
  });
}

describe("check-sensitive-files.ps1", () => {
  runOnWindows("blocks staged AI provider API key assignments", () => {
    withTempGitRepo((repoDir) => {
      const keyName = ["GEMINI", "API", "KEY"].join("_");
      const fakeGoogleKey = ["AI", "za", "A".repeat(35)].join("");
      stageFile(repoDir, "leak.md", `${keyName}=${fakeGoogleKey}`);

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain("Possible secret content in: leak.md");
    });
  });

  runOnWindows("blocks staged npm registry auth tokens", () => {
    withTempGitRepo((repoDir) => {
      const fakeNpmToken = ["npm", "_", "B".repeat(36)].join("");
      stageFile(repoDir, ".npmrc", `//registry.npmjs.org/:_authToken=${fakeNpmToken}\n`);

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain("Possible secret content in: .npmrc");
    });
  });

  runOnWindows("allows empty secret placeholders in env examples", () => {
    withTempGitRepo((repoDir) => {
      const keyName = ["GEMINI", "API", "KEY"].join("_");
      stageFile(repoDir, ".env.example", `${keyName}=\n`);

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Sensitive file check passed.");
    });
  });
});

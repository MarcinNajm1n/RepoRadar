import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "check-sensitive-files.ps1");
const runOnWindows = process.platform === "win32" ? it : it.skip;
const securityScriptTestTimeoutMs = 20_000;
const securityScriptProcessTimeoutMs = 15_000;

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
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Staged"], {
    cwd: repoDir,
    encoding: "utf8",
    timeout: securityScriptProcessTimeoutMs
  });

  if (result.error) {
    throw result.error;
  }

  return result;
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
  }, securityScriptTestTimeoutMs);

  runOnWindows("blocks staged npm registry auth tokens", () => {
    withTempGitRepo((repoDir) => {
      const fakeNpmToken = ["npm", "_", "B".repeat(36)].join("");
      stageFile(repoDir, ".npmrc", `//registry.npmjs.org/:_authToken=${fakeNpmToken}\n`);

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain("Possible secret content in: .npmrc");
    });
  }, securityScriptTestTimeoutMs);

  runOnWindows("blocks staged legacy npm auth credentials", () => {
    withTempGitRepo((repoDir) => {
      const fakeBasicAuth = "C".repeat(28);
      const fakePassword = "D".repeat(28);
      stageFile(repoDir, ".npmrc", `_auth=${fakeBasicAuth}\n//registry.npmjs.org/:_password=${fakePassword}\n`);

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain("Possible secret content in: .npmrc");
    });
  }, securityScriptTestTimeoutMs);

  runOnWindows("blocks staged generic secret assignments in env examples", () => {
    withTempGitRepo((repoDir) => {
      const secretName = ["NEXTAUTH", "SECRET"].join("_");
      const passwordName = ["DATABASE", "PASSWORD"].join("_");
      const privateKeyName = ["APP", "PRIVATE", "KEY"].join("_");
      const webhookName = ["DISCORD", "WEBHOOK", "URL"].join("_");
      const secretKeyName = ["SECRET", "KEY"].join("_");
      const exportedSecretKeyName = ["EXPORTED", "SECRET", "KEY"].join("_");
      const openQuoteSecretName = ["OPENQUOTE", "SECRET"].join("_");
      stageFile(
        repoDir,
        ".env.example",
        `${secretName}="#x"\n${passwordName}='#'\n${privateKeyName}=' spaced key value '\n${webhookName}=https://example.com/webhook\n${secretKeyName}=tiny\nexport ${exportedSecretKeyName}=tiny\n${openQuoteSecretName}="tiny\n`
      );

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(1);
      expect(`${result.stdout}\n${result.stderr}`).toContain("Possible secret content in: .env.example");
    });
  }, securityScriptTestTimeoutMs);

  runOnWindows("allows empty secret placeholders in env examples", () => {
    withTempGitRepo((repoDir) => {
      const keyName = ["GEMINI", "API", "KEY"].join("_");
      const secretName = ["NEXTAUTH", "SECRET"].join("_");
      const passwordName = ["DATABASE", "PASSWORD"].join("_");
      const secretKeyName = ["SECRET", "KEY"].join("_");
      const exportedSecretKeyName = ["EXPORTED", "SECRET", "KEY"].join("_");
      stageFile(
        repoDir,
        ".env.example",
        `${keyName}=\n${secretName}=\"\"\n${passwordName}='   '\n${secretKeyName}=# comment\nexport ${exportedSecretKeyName}=\n`
      );

      const result = runSensitiveCheck(repoDir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Sensitive file check passed.");
    });
  }, securityScriptTestTimeoutMs);
});

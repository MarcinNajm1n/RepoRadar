import { describe, expect, it } from "vitest";
import { getWindowsTaskCommand } from "../../src/lib/scheduler/windows-task";

describe("getWindowsTaskCommand", () => {
  it("uses a stable PowerShell runner instead of npm directly", () => {
    const command = getWindowsTaskCommand("C:\\RepoRadar");

    expect(command.program).toBe("powershell.exe");
    expect(command.arguments).toContain("-NoProfile");
    expect(command.arguments).toContain("-ExecutionPolicy Bypass");
    expect(command.arguments).toContain("run-scheduled-scan.ps1");
    expect(command.arguments).not.toContain("npm run scan");
    expect(command.workingDirectory).toBe("C:\\RepoRadar");
    expect(command.runnerScript).toBe("C:\\RepoRadar\\scripts\\run-scheduled-scan.ps1");
    expect(command.logDirectory).toBe("C:\\RepoRadar\\logs\\scans");
  });
});

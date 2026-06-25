import { describe, expect, it } from "vitest";
import {
  buildWindowsTaskStatusCommand,
  formatWindowsTaskResult,
  getWindowsTaskCommand,
  isMissingTaskError,
  parseWindowsTaskStatusJson
} from "../../src/lib/scheduler/windows-task";

describe("getWindowsTaskCommand", () => {
  it("uses a stable PowerShell runner instead of npm directly", () => {
    const command = getWindowsTaskCommand("C:\\RepoRadar");

    expect(command.program).toBe("powershell.exe");
    expect(command.arguments).toContain("-NoProfile");
    expect(command.arguments).toContain("-ExecutionPolicy Bypass");
    expect(command.arguments).toContain("run-scheduled-scan.ps1");
    expect(command.arguments).not.toContain("npm run scan");
    expect(command.taskName).toBe("RepoRadar Daily Scan");
    expect(command.workingDirectory).toBe("C:\\RepoRadar");
    expect(command.runnerScript).toBe("C:\\RepoRadar\\scripts\\run-scheduled-scan.ps1");
    expect(command.logDirectory).toBe("C:\\RepoRadar\\logs\\scans");
    expect(command.checkCommand).toBe('schtasks /Query /TN "RepoRadar Daily Scan" /V /FO LIST');
    expect(command.runCommand).toBe('schtasks /Run /TN "RepoRadar Daily Scan"');
  });

  it("escapes task names in the PowerShell status query", () => {
    const command = buildWindowsTaskStatusCommand("RepoRadar Owner's Scan");

    expect(command).toContain("$TaskName = 'RepoRadar Owner''s Scan'");
    expect(command).toContain("Get-ScheduledTaskInfo");
    expect(command).toContain("ConvertTo-Json -Compress");
    expect(command).not.toContain("@{;");
  });

  it("parses PowerShell scheduled task JSON into stable status fields", () => {
    const status = parseWindowsTaskStatusJson(
      JSON.stringify({
        TaskName: "RepoRadar Daily Scan",
        State: "Ready",
        LastRunTime: "2026-06-25T09:00:00.000Z",
        NextRunTime: "2026-06-26T09:00:00.000Z",
        LastTaskResult: 0,
        NumberOfMissedRuns: 1
      })
    );

    expect(status).toEqual({
      taskName: "RepoRadar Daily Scan",
      state: "Ready",
      lastRunAt: "2026-06-25T09:00:00.000Z",
      nextRunAt: "2026-06-26T09:00:00.000Z",
      lastResultCode: 0,
      lastResultLabel: "0 (OK)",
      missedRuns: 1
    });
  });

  it("formats non-zero Task Scheduler result codes with hexadecimal context", () => {
    expect(formatWindowsTaskResult(267009)).toBe("267009 (0x41301)");
  });

  it("treats pre-2000 Task Scheduler placeholder dates as missing", () => {
    const status = parseWindowsTaskStatusJson(
      JSON.stringify([
        {
          TaskName: "RepoRadar Daily Scan",
          State: "Ready",
          LastRunTime: "1999-11-30T00:00:00.000Z",
          NextRunTime: "2026-06-26T09:00:00.000Z",
          LastTaskResult: null,
          NumberOfMissedRuns: 0
        }
      ])
    );

    expect(status.lastRunAt).toBeNull();
    expect(status.nextRunAt).toBe("2026-06-26T09:00:00.000Z");
  });

  it("parses PowerShell JSON date wrappers returned by scheduled task info", () => {
    const status = parseWindowsTaskStatusJson(
      JSON.stringify({
        TaskName: "RepoRadar Daily Scan",
        State: "Ready",
        LastRunTime: "/Date(1782378000000)/",
        NextRunTime: "/Date(1782464400000)/",
        LastTaskResult: "0",
        NumberOfMissedRuns: "0"
      })
    );

    expect(status.lastRunAt).toBe("2026-06-25T09:00:00.000Z");
    expect(status.nextRunAt).toBe("2026-06-26T09:00:00.000Z");
    expect(status.lastResultLabel).toBe("0 (OK)");
  });

  it("recognizes the actual PowerShell missing scheduled task message", () => {
    expect(
      isMissingTaskError(
        "No MSFT_ScheduledTask objects found with property 'TaskName' equal to 'RepoRadar Daily Scan'."
      )
    ).toBe(true);
  });
});

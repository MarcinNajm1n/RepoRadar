import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { SchedulerStatusSummary } from "@/types/repository";

export const REPORADAR_WINDOWS_TASK_NAME = "RepoRadar Daily Scan";

type ScheduledTaskJson = {
  TaskName?: string;
  State?: string;
  LastRunTime?: string | null;
  NextRunTime?: string | null;
  LastTaskResult?: number | string | null;
  NumberOfMissedRuns?: number | string | null;
};

type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export function getWindowsTaskCommand(projectDir = process.cwd(), taskName = REPORADAR_WINDOWS_TASK_NAME) {
  const workingDirectory = path.resolve(projectDir);
  const runnerScript = path.join(workingDirectory, "scripts", "run-scheduled-scan.ps1");

  return {
    taskName,
    program: "powershell.exe",
    arguments: `-NoProfile -ExecutionPolicy Bypass -File "${runnerScript}"`,
    workingDirectory,
    runnerScript,
    logDirectory: path.join(workingDirectory, "logs", "scans"),
    checkCommand: `schtasks /Query /TN "${taskName}" /V /FO LIST`,
    runCommand: `schtasks /Run /TN "${taskName}"`
  };
}

function execFileAsync(file: string, args: string[]) {
  return new Promise<ExecFileResult>((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 2500, maxBuffer: 64 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function quotePowerShellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildWindowsTaskStatusCommand(taskName = REPORADAR_WINDOWS_TASK_NAME) {
  const taskNameLiteral = quotePowerShellString(taskName);

  return [
    "$ErrorActionPreference = 'Stop'",
    `$TaskName = ${taskNameLiteral}`,
    "$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop",
    "$Info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop",
    "$Output = [pscustomobject]@{ TaskName = $Task.TaskName; State = $Task.State.ToString(); LastRunTime = $Info.LastRunTime; NextRunTime = $Info.NextRunTime; LastTaskResult = $Info.LastTaskResult; NumberOfMissedRuns = $Info.NumberOfMissedRuns }",
    "$Output | ConvertTo-Json -Compress"
  ].join("; ");
}

function toIsoOrNull(value: unknown) {
  if (!value || value === "N/A") {
    return null;
  }

  if (typeof value === "string") {
    const dotNetDate = /\/Date\((\d+)\)\//.exec(value);
    if (dotNetDate) {
      return new Date(Number(dotNetDate[1])).toISOString();
    }
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000) {
    return null;
  }

  return date.toISOString();
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatWindowsTaskResult(code: number | null) {
  if (code === null) {
    return "brak danych";
  }
  if (code === 0) {
    return "0 (OK)";
  }

  return `${code} (0x${code.toString(16).toUpperCase()})`;
}

export function parseWindowsTaskStatusJson(rawJson: string) {
  const parsedJson = JSON.parse(rawJson) as ScheduledTaskJson | ScheduledTaskJson[];
  const parsed = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
  const lastResultCode = toNumberOrNull(parsed.LastTaskResult);

  return {
    taskName: parsed.TaskName ?? REPORADAR_WINDOWS_TASK_NAME,
    state: parsed.State ?? "UNKNOWN",
    lastRunAt: toIsoOrNull(parsed.LastRunTime),
    nextRunAt: toIsoOrNull(parsed.NextRunTime),
    lastResultCode,
    lastResultLabel: formatWindowsTaskResult(lastResultCode),
    missedRuns: toNumberOrNull(parsed.NumberOfMissedRuns)
  };
}

async function getLatestScanLog(logDirectory: string) {
  try {
    const entries = await fs.readdir(logDirectory, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
        .map(async (entry) => {
          const fullPath = path.join(logDirectory, entry.name);
          const stats = await fs.stat(fullPath);
          return { path: fullPath, updatedAt: stats.mtime };
        })
    );
    const latest = files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return latest ? { path: latest.path, updatedAt: latest.updatedAt.toISOString() } : null;
  } catch {
    return null;
  }
}

function buildBaseSchedulerStatus(
  command: ReturnType<typeof getWindowsTaskCommand>,
  latestLog: { path: string; updatedAt: string } | null
): Pick<
  SchedulerStatusSummary,
  "taskName" | "platform" | "runnerScript" | "logDirectory" | "latestLogPath" | "latestLogUpdatedAt" | "checkCommand" | "runCommand"
> {
  return {
    taskName: command.taskName,
    platform: process.platform,
    runnerScript: command.runnerScript,
    logDirectory: command.logDirectory,
    latestLogPath: latestLog?.path ?? null,
    latestLogUpdatedAt: latestLog?.updatedAt ?? null,
    checkCommand: command.checkCommand,
    runCommand: command.runCommand
  };
}

export function isMissingTaskError(message: string) {
  return /cannot find|not found|does not exist|no msft_scheduledtask objects found|nie mo/i.test(message);
}

export async function getWindowsSchedulerStatus(projectDir = process.cwd()): Promise<SchedulerStatusSummary> {
  const command = getWindowsTaskCommand(projectDir);
  const latestLog = await getLatestScanLog(command.logDirectory);
  const base = buildBaseSchedulerStatus(command, latestLog);

  if (process.platform !== "win32") {
    return {
      ...base,
      status: "unavailable",
      installed: false,
      canQuery: false,
      state: null,
      lastRunAt: null,
      nextRunAt: null,
      lastResultCode: null,
      lastResultLabel: "brak danych",
      missedRuns: null,
      note: "Status Task Scheduler jest dostepny tylko na Windows. Skrypt rejestracji i logi pozostaja widoczne lokalnie.",
      error: null
    };
  }

  try {
    const result = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      buildWindowsTaskStatusCommand(command.taskName)
    ]);
    const parsed = parseWindowsTaskStatusJson(result.stdout.trim());

    return {
      ...base,
      status: "ready",
      installed: true,
      canQuery: true,
      state: parsed.state,
      lastRunAt: parsed.lastRunAt,
      nextRunAt: parsed.nextRunAt,
      lastResultCode: parsed.lastResultCode,
      lastResultLabel: parsed.lastResultLabel,
      missedRuns: parsed.missedRuns,
      note: "Zadanie Windows Task Scheduler istnieje i moze uruchamiac lokalny scan.",
      error: null
    };
  } catch (error) {
    const details =
      error instanceof Error
        ? [error.message, "stderr" in error ? String((error as { stderr?: unknown }).stderr ?? "") : ""].filter(Boolean).join(" ")
        : "Nieznany blad odczytu Task Scheduler.";
    const missing = isMissingTaskError(details);

    return {
      ...base,
      status: missing ? "missing" : "error",
      installed: false,
      canQuery: true,
      state: null,
      lastRunAt: null,
      nextRunAt: null,
      lastResultCode: null,
      lastResultLabel: "brak danych",
      missedRuns: null,
      note: missing
        ? "Zadanie nie jest zarejestrowane. Uzyj scripts/register-windows-task.ps1, zeby wlaczyc codzienny scan."
        : "Nie udalo sie odczytac statusu Task Scheduler.",
      error: details.slice(0, 500)
    };
  }
}

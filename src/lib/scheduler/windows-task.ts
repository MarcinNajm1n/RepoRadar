import path from "node:path";

export function getWindowsTaskCommand(projectDir = process.cwd()) {
  const workingDirectory = path.resolve(projectDir);
  const runnerScript = path.join(workingDirectory, "scripts", "run-scheduled-scan.ps1");

  return {
    program: "powershell.exe",
    arguments: `-NoProfile -ExecutionPolicy Bypass -File "${runnerScript}"`,
    workingDirectory,
    runnerScript,
    logDirectory: path.join(workingDirectory, "logs", "scans")
  };
}

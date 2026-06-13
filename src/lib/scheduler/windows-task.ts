import path from "node:path";

export function getWindowsTaskCommand(projectDir = process.cwd()) {
  const npmCommand = "npm";
  return {
    program: npmCommand,
    arguments: "run scan",
    workingDirectory: path.resolve(projectDir)
  };
}

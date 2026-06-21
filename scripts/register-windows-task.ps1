param(
  [string]$TaskName = "RepoRadar Daily Scan",
  [string]$Time = "09:00",
  [switch]$DryRun
)

$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path
$RunnerScript = Join-Path $ProjectDir "scripts\run-scheduled-scan.ps1"
$LogDir = Join-Path $ProjectDir "logs\scans"
$ActionProgram = "powershell.exe"
$ActionArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$RunnerScript`""

if ($DryRun) {
  Write-Host "Task name: $TaskName"
  Write-Host "Daily trigger: $Time"
  Write-Host "Program: $ActionProgram"
  Write-Host "Arguments: $ActionArguments"
  Write-Host "Working directory: $ProjectDir"
  Write-Host "Log directory: $LogDir"
  exit 0
}

$Action = New-ScheduledTaskAction -Execute $ActionProgram -Argument $ActionArguments -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Runs RepoRadar GitHub scan once per day." -Force

Write-Host "Registered task '$TaskName' for $Time in $ProjectDir"
Write-Host "Logs will be written to $LogDir"

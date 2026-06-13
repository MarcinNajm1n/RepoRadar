param(
  [string]$TaskName = "RepoRadar Daily Scan",
  [string]$Time = "09:00"
)

$ProjectDir = Resolve-Path "$PSScriptRoot\.."
$Action = New-ScheduledTaskAction -Execute "npm" -Argument "run scan" -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Runs RepoRadar GitHub scan once per day." -Force

Write-Host "Registered task '$TaskName' for $Time in $ProjectDir"

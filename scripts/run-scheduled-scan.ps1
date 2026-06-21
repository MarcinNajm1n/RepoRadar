param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ResolvedProjectDir = (Resolve-Path $ProjectDir).Path
$LogDir = Join-Path $ResolvedProjectDir "logs\scans"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $LogDir "scan-$Timestamp.log"

function Write-ScanLog {
  param([string]$Message)

  $Line = "$(Get-Date -Format o) $Message"
  Add-Content -Path $LogPath -Value $Line -Encoding UTF8
  Write-Host $Line
}

try {
  $NpmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
} catch {
  Write-ScanLog "ERROR: npm.cmd was not found on PATH."
  exit 1
}

Push-Location $ResolvedProjectDir
try {
  Write-ScanLog "RepoRadar scheduled scan started."
  Write-ScanLog "Working directory: $ResolvedProjectDir"
  Write-ScanLog "Command: $NpmCommand run scan"

  $ProcessInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $ProcessInfo.FileName = $NpmCommand
  $ProcessInfo.Arguments = "run scan"
  $ProcessInfo.WorkingDirectory = $ResolvedProjectDir
  $ProcessInfo.RedirectStandardOutput = $true
  $ProcessInfo.RedirectStandardError = $true
  $ProcessInfo.UseShellExecute = $false
  $ProcessInfo.CreateNoWindow = $true

  $Process = [System.Diagnostics.Process]::Start($ProcessInfo)
  $StdOut = $Process.StandardOutput.ReadToEnd()
  $StdErr = $Process.StandardError.ReadToEnd()
  $Process.WaitForExit()

  if ($StdOut.Trim().Length -gt 0) {
    Add-Content -Path $LogPath -Value $StdOut -Encoding UTF8
  }

  if ($StdErr.Trim().Length -gt 0) {
    Add-Content -Path $LogPath -Value $StdErr -Encoding UTF8
  }

  Write-ScanLog "RepoRadar scheduled scan finished with exit code $($Process.ExitCode)."
  exit $Process.ExitCode
} catch {
  Write-ScanLog "ERROR: $($_.Exception.Message)"
  exit 1
} finally {
  Pop-Location
}

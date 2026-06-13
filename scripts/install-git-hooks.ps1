$ErrorActionPreference = "Stop"

git config core.hooksPath .githooks

if (Get-Command chmod -ErrorAction SilentlyContinue) {
  chmod +x .githooks/pre-commit
}

Write-Host "Git hooks installed. Future commits will run scripts/check-sensitive-files.ps1 on staged files."

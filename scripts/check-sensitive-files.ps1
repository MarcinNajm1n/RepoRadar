param(
  [switch]$Staged
)

$ErrorActionPreference = "Stop"

$blockedPathPatterns = @(
  '(^|[\\/])\.env($|[\\.])',
  '\.pem$',
  '\.key$',
  '\.p12$',
  '\.pfx$',
  '\.crt$',
  '\.cer$',
  '(^|[\\/])id_rsa(\.|$)',
  '(^|[\\/])id_ed25519(\.|$)',
  '(^|[\\/]).*credentials?.*\.json$',
  '(^|[\\/]).*secrets?.*\.json$',
  '(^|[\\/]).*tokens?.*\.json$',
  '(^|[\\/])client_secret.*\.json$',
  '(^|[\\/]).*service[-_]?account.*\.json$',
  '(^|[\\/])firebase-adminsdk.*\.json$',
  '(^|[\\/])google-credentials.*\.json$',
  '\.sqlite$',
  '\.sqlite3$',
  '\.db$',
  '\.db-journal$'
)

$allowedExactPaths = @(
  ".env.example",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
  "tailwind.config.ts",
  "vitest.config.ts",
  "playwright.config.ts"
)

$secretContentPatterns = @(
  '-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----',
  '(?i)\bsk-[A-Za-z0-9_-]{20,}\b',
  '(?i)\bAIza[0-9A-Za-z_-]{35}\b',
  '(?i)\bhf_[A-Za-z0-9]{20,}\b',
  '(?i)\bgithub_pat_[A-Za-z0-9_]{20,}\b',
  '(?i)\bgh[pousr]_[A-Za-z0-9_]{20,}\b',
  '(?i)\bxox[baprs]-[A-Za-z0-9-]{20,}\b',
  '\bAKIA[0-9A-Z]{16}\b',
  '(?im)^[ \t]*((OPENAI_API_KEY|GITHUB_TOKEN|SMTP_PASSWORD|DISCORD_WEBHOOK_URL|ANTHROPIC_API_KEY|GOOGLE_API_KEY|GEMINI_API_KEY|HUGGINGFACE_API_TOKEN|HF_TOKEN|SLACK_BOT_TOKEN|X_BEARER_TOKEN|PRODUCT_HUNT_TOKEN)|[A-Z0-9_]*(API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|APP_PASSWORD))[ \t]*=[ \t]*["'']?[^#\s"'']{8,}',
  '(?im)^[ \t]*DATABASE_URL[ \t]*=[ \t]*["'']?(postgres|postgresql|mysql|mongodb)[^#\s"'']*:[^#\s"'']+@'
)

function Normalize-PathForGit([string]$PathValue) {
  return $PathValue.Replace("\", "/")
}

function Is-AllowedPath([string]$PathValue) {
  $normalized = Normalize-PathForGit $PathValue
  return $allowedExactPaths -contains $normalized
}

function Get-FilesToCheck {
  if ($Staged) {
    $files = git diff --cached --name-only --diff-filter=ACMR
    return @($files | Where-Object { $_ -and $_.Trim().Length -gt 0 })
  }

  $files = git ls-files --others --cached --exclude-standard
  return @($files | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function Get-FileText([string]$PathValue) {
  if ($Staged) {
    $content = git show ":$PathValue" 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return ($content -join "`n")
  }

  if (!(Test-Path -LiteralPath $PathValue -PathType Leaf)) {
    return $null
  }

  $item = Get-Item -LiteralPath $PathValue
  if ($item.Length -gt 1048576) {
    return $null
  }

  return Get-Content -LiteralPath $PathValue -Raw -ErrorAction SilentlyContinue
}

$violations = New-Object System.Collections.Generic.List[string]

foreach ($file in Get-FilesToCheck) {
  $normalized = Normalize-PathForGit $file

  if (!(Is-AllowedPath $normalized)) {
    foreach ($pattern in $blockedPathPatterns) {
      if ($normalized -match $pattern) {
        $violations.Add("Blocked sensitive path: $normalized")
        break
      }
    }
  }

  $text = Get-FileText $file
  if ($null -eq $text) {
    continue
  }

  foreach ($pattern in $secretContentPatterns) {
    if ($text -match $pattern) {
      $violations.Add("Possible secret content in: $normalized")
      break
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Sensitive file check failed:" -ForegroundColor Red
  $violations | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Move real secrets to .env or another ignored local file. Commit only .env.example with empty placeholders." -ForegroundColor Yellow
  exit 1
}

Write-Host "Sensitive file check passed."

# START_AUTONOMOUS.ps1 — Pre-flight setup for ERP generator watchdog
# Backs up settings, verifies environment, creates tools/.env, and launches the watchdog.
#
# Usage:
#   cd C:\Users\ssala\OneDrive\Desktop\MMORPG\erp
#   powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1

$ErrorActionPreference = "Stop"
$WorkDir = "C:\Users\ssala\OneDrive\Desktop\MMORPG\erp"
$WatchdogDir = Join-Path $WorkDir "tools\watchdog"
$ClaudeSettingsDir = Join-Path $env:USERPROFILE ".claude"
$ClaudeSettings = Join-Path $ClaudeSettingsDir "settings.local.json"
$ClaudeSettingsBackup = Join-Path $WatchdogDir ".settings_backup.json"

Set-Location $WorkDir

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ERP GENERATOR PIPELINE — AUTONOMOUS STARTUP" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# --- Step 1: Back up Claude Code settings ---
Write-Host "[1/7] Backing up Claude settings..." -ForegroundColor Cyan
if (Test-Path $ClaudeSettings) {
    Copy-Item $ClaudeSettings $ClaudeSettingsBackup -Force
    Write-Host "  Backed up to: $ClaudeSettingsBackup" -ForegroundColor DarkGray
} else {
    Write-Host "  No settings.local.json found (using defaults)" -ForegroundColor DarkGray
}

# --- Step 2: Verify Docker is running (for PostgreSQL) ---
Write-Host "[2/7] Checking Docker..." -ForegroundColor Cyan
try {
    $dockerStatus = docker ps --format "{{.Names}}" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Docker not running. Start Docker Desktop first!" -ForegroundColor Yellow
        Write-Host "  The generators need PostgreSQL. Press Enter to continue anyway, or Ctrl+C to abort."
        Read-Host
    } else {
        $pgContainer = $dockerStatus | Select-String "postgres|erp.*db"
        if ($pgContainer) {
            Write-Host "  PostgreSQL container found: $pgContainer" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: No PostgreSQL container detected. Containers running:" -ForegroundColor Yellow
            Write-Host "  $dockerStatus" -ForegroundColor DarkGray
            Write-Host "  Press Enter to continue anyway, or Ctrl+C to abort."
            Read-Host
        }
    }
} catch {
    Write-Host "  WARNING: Docker check failed. Continuing..." -ForegroundColor Yellow
}

# --- Step 3: Verify backend/.env has DATABASE_URL ---
Write-Host "[3/7] Checking backend/.env..." -ForegroundColor Cyan
$backendEnv = Join-Path $WorkDir "backend\.env"
if (Test-Path $backendEnv) {
    $dbUrl = Get-Content $backendEnv | Select-String "DATABASE_URL"
    if ($dbUrl) {
        Write-Host "  DATABASE_URL found in backend/.env" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: DATABASE_URL not found in backend/.env!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ERROR: backend/.env not found!" -ForegroundColor Red
    exit 1
}

# --- Step 4: Create/verify tools/.env ---
Write-Host "[4/7] Checking tools/.env..." -ForegroundColor Cyan
$toolsEnv = Join-Path $WorkDir "tools\.env"
$toolsEnvExample = Join-Path $WorkDir "tools\.env.example"
if (-not (Test-Path $toolsEnv)) {
    if (Test-Path $toolsEnvExample) {
        Copy-Item $toolsEnvExample $toolsEnv
        Write-Host "  Created tools/.env from .env.example" -ForegroundColor Green
    } else {
        # Create a default tools/.env
        @"
AI_CLI_PROVIDER=claude
AI_CLI_PROVIDER_FALLBACK=gemini
AI_CLI_MODEL=claude-sonnet-4-6
AI_CLI_TIMEOUT=120
AI_CLI_MAX_RETRIES=3
"@ | Set-Content $toolsEnv
        Write-Host "  Created tools/.env with defaults" -ForegroundColor Green
    }
} else {
    Write-Host "  tools/.env exists" -ForegroundColor Green
}

# --- Step 5: Verify Python + dependencies ---
Write-Host "[5/7] Checking Python environment..." -ForegroundColor Cyan
try {
    $pyVersion = python --version 2>&1
    Write-Host "  $pyVersion" -ForegroundColor Green

    # Quick check for required packages
    python -c "import psycopg2, dotenv, tqdm; print('  Required packages: OK')" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Installing missing packages..." -ForegroundColor Yellow
        pip install psycopg2-binary python-dotenv tqdm 2>&1 | Out-Null
        Write-Host "  Packages installed" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERROR: Python not found!" -ForegroundColor Red
    exit 1
}

# --- Step 6: Verify DB connection ---
Write-Host "[6/7] Testing DB connection..." -ForegroundColor Cyan
$dbTest = python -c "from tools.lib.db_client import DBClient; db = DBClient(); print('DB OK'); db.close()" 2>&1
if ($dbTest -match "DB OK") {
    Write-Host "  Database connection OK" -ForegroundColor Green
} else {
    Write-Host "  WARNING: DB connection failed. Output:" -ForegroundColor Yellow
    Write-Host "  $dbTest" -ForegroundColor DarkGray
    Write-Host "  The agent will retry. Press Enter to continue, or Ctrl+C to abort."
    Read-Host
}

# --- Step 7: Create dev branch ---
Write-Host "[7/7] Setting up git branch..." -ForegroundColor Cyan
$currentBranch = git branch --show-current 2>&1
Write-Host "  Current branch: $currentBranch" -ForegroundColor DarkGray
# We stay on the current branch (feature/generator-pipeline) — no need for a separate dev branch
# The generators only modify the database, not code files

# --- Initialize progress file ---
$progressFile = Join-Path $WatchdogDir "AUTONOMOUS_PROGRESS.md"
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
@"
# ERP Generator Watchdog — Autonomous Progress

## Current State
- Phase: 0 (Pre-flight)
- Started: $timestamp
- Branch: $currentBranch
- DB backup: pending
- Baseline gaps: pending

## Heartbeat Log
"@ | Set-Content $progressFile

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  PRE-FLIGHT COMPLETE — LAUNCHING WATCHDOG" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The watchdog will open Claude in a NEW window." -ForegroundColor Cyan
Write-Host "You can close THIS terminal — the watchdog owns the Claude process." -ForegroundColor Cyan
Write-Host "To stop: run tools\watchdog\STOP_AUTONOMOUS.ps1" -ForegroundColor Cyan
Write-Host ""

# --- Launch watchdog in separate window ---
Start-Process powershell `
    -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", (Join-Path $WatchdogDir "WATCHDOG_AUTO.ps1") `
    -WorkingDirectory $WorkDir

Write-Host "Watchdog launched in new window. You may close this terminal." -ForegroundColor Green

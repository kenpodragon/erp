# START_AUTONOMOUS.ps1 — Setup for the overnight ERP generator agent
# Run from PowerShell:
#   cd C:\Users\ssala\OneDrive\Desktop\MMORPG\erp
#   powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1

$WorkDir = 'C:\Users\ssala\OneDrive\Desktop\MMORPG\erp'
Set-Location $WorkDir

Write-Host ''
Write-Host '=== ERP Generator Pipeline - Autonomous Setup ===' -ForegroundColor Cyan
Write-Host ('Started: ' + (Get-Date))
Write-Host ''

# 0. Pre-flight manual checks
Write-Host '=========================================' -ForegroundColor Yellow
Write-Host '  MANUAL CHECKS BEFORE STARTING' -ForegroundColor Yellow
Write-Host '=========================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '  [ ] Pause Windows Update:'
Write-Host '      Settings > Windows Update > Pause updates'
Write-Host ''
Write-Host '  [ ] Disable sleep/hibernation:'
Write-Host '      Settings > System > Power > Screen and sleep > Never'
Write-Host ''
Write-Host '  [ ] Pause OneDrive sync:'
Write-Host '      System tray > OneDrive icon > Pause syncing > 24 hours'
Write-Host ''
Write-Host '  [ ] Plug in power adapter'
Write-Host ''
Write-Host '  [ ] Verify backend/.env has DATABASE_URL for localhost PostgreSQL'
Write-Host ''
Write-Host '  [ ] Verify claude CLI is installed and authenticated'
Write-Host ''
Read-Host 'Press ENTER when all checks are done, or Ctrl+C to abort'

# 1. Backup current settings
Write-Host '[1/5] Backing up settings...' -ForegroundColor Green
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$settingsFile = Join-Path $env:USERPROFILE '.claude\settings.local.json'
$backupDir = Join-Path $WorkDir 'tools\watchdog'
if (Test-Path $settingsFile) {
    Copy-Item $settingsFile (Join-Path $backupDir ".settings_backup.$timestamp.json")
    Copy-Item $settingsFile (Join-Path $backupDir '.settings_backup.json')
    Write-Host ('  Backed up to .settings_backup.' + $timestamp + '.json')
} else {
    Write-Host '  No existing settings.local.json found - OK for first run'
}

# 2. Create tools/.env if missing
Write-Host '[2/5] Checking tools/.env...' -ForegroundColor Green
$toolsEnv = Join-Path $WorkDir 'tools\.env'
$toolsEnvExample = Join-Path $WorkDir 'tools\.env.example'
if (-not (Test-Path $toolsEnv)) {
    if (Test-Path $toolsEnvExample) {
        Copy-Item $toolsEnvExample $toolsEnv
        Write-Host '  Created tools/.env from .env.example'
    } else {
        Set-Content $toolsEnv "AI_CLI_PROVIDER=claude`nAI_CLI_PROVIDER_FALLBACK=gemini`nAI_CLI_MODEL=claude-sonnet-4-6`nAI_CLI_TIMEOUT=120`nAI_CLI_MAX_RETRIES=3"
        Write-Host '  Created tools/.env with defaults'
    }
} else {
    Write-Host '  tools/.env exists'
}

# 2b. Clean stale artifacts from prior runs
Write-Host '[2b/5] Cleaning stale artifacts from prior runs...' -ForegroundColor Green
$staleFiles = @(
    'tools\watchdog\FAMILY_BODY_PLANS.md',
    'tools\watchdog\QUALITY_REVIEW_REPORT.md',
    'tools\watchdog\LORE_QUALITY_REPORT.md',
    'tools\watchdog\fix_template_lore.py',
    'tools\watchdog\_db_test.py'
)
foreach ($sf in $staleFiles) {
    $sfPath = Join-Path $WorkDir $sf
    if (Test-Path $sfPath) {
        Remove-Item $sfPath -Force
        Write-Host ('  Removed stale: ' + $sf) -ForegroundColor Yellow
    }
}
# Also remove any .py/.sh/.js scripts the agent may have created
Get-ChildItem (Join-Path $WorkDir 'tools\watchdog') -Include '*.py','*.sh','*.js' -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host ('  Removed script: ' + $_.Name) -ForegroundColor Yellow
}

# 3. Initialize progress file
Write-Host '[3/5] Initializing progress file...' -ForegroundColor Green
$progressFile = Join-Path $backupDir 'AUTONOMOUS_PROGRESS.md'
$timestamp2 = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$currentBranch = git branch --show-current 2>&1
Set-Content $progressFile "# ERP Generator Watchdog - Autonomous Progress`n`n## Current State`n- Phase: 0 Pre-flight`n- Started: $timestamp2`n- Branch: $currentBranch`n- DB backup: pending`n- Baseline gaps: pending`n`n## Heartbeat Log"
Write-Host ('  Branch: ' + $currentBranch)

# 4. Verify key files exist
Write-Host '[4/5] Verifying key files...' -ForegroundColor Green
$requiredFiles = @(
    'tools\watchdog\AGENT_INSTRUCTIONS.md',
    'tools\watchdog\AGENT_GOALS.md',
    'tools\watchdog\WATCHDOG_AUTO.ps1',
    'backend\.env',
    'AGENTS.md',
    'docs\explanation\lore\BOOKS_SUMMARY.md',
    'docs\explanation\lore\CHARACTER_GUIDE.md',
    'docs\explanation\lore\ENVIRONMENT_GUIDE.md',
    'tools\watchdog\REVIEW_AGENT_PROMPT.md'
)
$allOk = $true
foreach ($f in $requiredFiles) {
    $fullPath = Join-Path $WorkDir $f
    if (Test-Path $fullPath) {
        Write-Host ('  OK: ' + $f) -ForegroundColor DarkGray
    } else {
        Write-Host ('  MISSING: ' + $f) -ForegroundColor Red
        $allOk = $false
    }
}
if (-not $allOk) {
    Write-Host '  Some files missing. Fix before continuing.' -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '=== Setup Complete ===' -ForegroundColor Green
Write-Host ''

# 5. Launch watchdog in a new terminal window
Write-Host '[LAUNCH] Starting watchdog in new window...' -ForegroundColor Cyan
$watchdogPath = Join-Path $WorkDir 'tools\watchdog\WATCHDOG_AUTO.ps1'
Start-Process powershell -ArgumentList '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', $watchdogPath -WorkingDirectory $WorkDir
Write-Host '  Watchdog launched - it will spawn Claude automatically.' -ForegroundColor Green
Write-Host ''
Write-Host '  Check status anytime:  type tools\watchdog\.autonomous_status' -ForegroundColor DarkGray
Write-Host '  In the morning:  powershell -ExecutionPolicy Bypass -File tools\watchdog\STOP_AUTONOMOUS.ps1' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  You can close this terminal now. The watchdog window owns everything.' -ForegroundColor DarkGray

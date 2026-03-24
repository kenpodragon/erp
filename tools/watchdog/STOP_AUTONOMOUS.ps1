# STOP_AUTONOMOUS.ps1 — Morning revert script for ERP generator watchdog
# Restores Claude settings, shows what was accomplished, provides restore instructions.
#
# Usage:
#   cd C:\Users\ssala\OneDrive\Desktop\MMORPG\erp
#   powershell -ExecutionPolicy Bypass -File tools\watchdog\STOP_AUTONOMOUS.ps1

$WorkDir = "C:\Users\ssala\OneDrive\Desktop\MMORPG\erp"
$WatchdogDir = Join-Path $WorkDir "tools\watchdog"
$ClaudeSettingsDir = Join-Path $env:USERPROFILE ".claude"
$ClaudeSettings = Join-Path $ClaudeSettingsDir "settings.local.json"
$ClaudeSettingsBackup = Join-Path $WatchdogDir ".settings_backup.json"
$ProgressFile = Join-Path $WatchdogDir "AUTONOMOUS_PROGRESS.md"
$StatusFile = Join-Path $WatchdogDir ".autonomous_status"
$LogFile = Join-Path $WatchdogDir "watchdog.log"

Set-Location $WorkDir

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  ERP GENERATOR PIPELINE — SHUTDOWN REPORT" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# --- Step 1: Restore Claude settings ---
Write-Host "[1/6] Restoring Claude settings..." -ForegroundColor Cyan
if (Test-Path $ClaudeSettingsBackup) {
    Copy-Item $ClaudeSettingsBackup $ClaudeSettings -Force
    Write-Host "  Restored settings.local.json from backup" -ForegroundColor Green
} else {
    Write-Host "  No backup found (settings unchanged)" -ForegroundColor DarkGray
}

# --- Step 2: Show final status ---
Write-Host ""
Write-Host "[2/6] Final Status..." -ForegroundColor Cyan
if (Test-Path $StatusFile) {
    $status = Get-Content $StatusFile -Raw
    Write-Host "  $status" -ForegroundColor White
} else {
    Write-Host "  No status file found" -ForegroundColor DarkGray
}

# --- Step 3: Show progress summary ---
Write-Host ""
Write-Host "[3/6] Progress Summary..." -ForegroundColor Cyan
if (Test-Path $ProgressFile) {
    $completedCount = (Get-Content $ProgressFile | Select-String "COMPLETED:").Count
    $failedCount = (Get-Content $ProgressFile | Select-String "FAIL").Count
    Write-Host "  Completed tasks: $completedCount" -ForegroundColor Green
    if ($failedCount -gt 0) {
        Write-Host "  Failed tasks: $failedCount" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  --- Last 30 lines of progress ---" -ForegroundColor DarkGray
    Get-Content $ProgressFile | Select-Object -Last 30 | ForEach-Object {
        $color = "White"
        if ($_ -match "COMPLETED:.*PASS") { $color = "Green" }
        elseif ($_ -match "COMPLETED:.*FAIL") { $color = "Red" }
        elseif ($_ -match "SPAWNING:") { $color = "Cyan" }
        elseif ($_ -match "HEARTBEAT:") { $color = "DarkGray" }
        Write-Host "  $_" -ForegroundColor $color
    }
} else {
    Write-Host "  No progress file found" -ForegroundColor DarkGray
}

# --- Step 4: Show watchdog log tail ---
Write-Host ""
Write-Host "[4/6] Watchdog Log (last 20 lines)..." -ForegroundColor Cyan
if (Test-Path $LogFile) {
    Get-Content $LogFile | Select-Object -Last 20 | ForEach-Object {
        $color = "DarkGray"
        if ($_ -match "STUCK|FAIL|RED|ERROR") { $color = "Red" }
        elseif ($_ -match "SUCCESS|COMPLETE|OK") { $color = "Green" }
        elseif ($_ -match "Restart") { $color = "Yellow" }
        Write-Host "  $_" -ForegroundColor $color
    }
} else {
    Write-Host "  No watchdog log found" -ForegroundColor DarkGray
}

# --- Step 5: Run gap scan ---
Write-Host ""
Write-Host "[5/6] Current Content Gaps..." -ForegroundColor Cyan
Write-Host "  Running scan_content_gaps.py..." -ForegroundColor DarkGray
try {
    $gapOutput = python tools/scan_content_gaps.py 2>&1
    # Show just the summary lines
    $gapOutput | Select-String "TOTAL|gap|missing|complete" -CaseSensitive:$false | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
    if (-not ($gapOutput | Select-String "gap|missing" -CaseSensitive:$false)) {
        Write-Host "  No gaps detected!" -ForegroundColor Green
    }
} catch {
    Write-Host "  Could not run gap scan (DB may be down)" -ForegroundColor Yellow
}

# --- Step 6: DB restore instructions ---
Write-Host ""
Write-Host "[6/6] Database Restore Instructions..." -ForegroundColor Cyan
$backupDir = Join-Path $WorkDir "db\backups"
if (Test-Path $backupDir) {
    $latestBackup = Get-ChildItem $backupDir -Filter "*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestBackup) {
        Write-Host "  Latest backup: $($latestBackup.Name) ($($latestBackup.LastWriteTime))" -ForegroundColor White
        Write-Host "  To restore: python tools/db_dump_restore.py restore $($latestBackup.Name)" -ForegroundColor Yellow
    } else {
        Write-Host "  No .dump files found in db/backups/" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  db/backups/ directory not found" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  NEXT STEPS" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Review tools/watchdog/AUTONOMOUS_PROGRESS.md for full details" -ForegroundColor White
Write-Host "  2. Start the admin panel and open Asset Viewer to visually verify:" -ForegroundColor White
Write-Host "     cd admin && npm run dev" -ForegroundColor Cyan
Write-Host "     Navigate to: http://localhost:5174/asset-viewer" -ForegroundColor Cyan
Write-Host "  3. If results are bad, restore from backup:" -ForegroundColor White
Write-Host "     python tools/db_dump_restore.py restore <backup_file>" -ForegroundColor Cyan
Write-Host "  4. If results are good, finalize:" -ForegroundColor White
Write-Host "     - Create migration 069 with NOT NULL constraints" -ForegroundColor Cyan
Write-Host "     - Merge feature/generator-pipeline -> main" -ForegroundColor Cyan
Write-Host ""

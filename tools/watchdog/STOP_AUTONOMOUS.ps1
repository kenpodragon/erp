# STOP_AUTONOMOUS.ps1 — Morning revert script for ERP generator watchdog
# Restores Claude settings, shows what was accomplished, provides restore instructions.
#
# Usage:
#   cd C:\Users\ssala\OneDrive\Desktop\MMORPG\erp
#   powershell -ExecutionPolicy Bypass -File tools\watchdog\STOP_AUTONOMOUS.ps1

$WorkDir = 'C:\Users\ssala\OneDrive\Desktop\MMORPG\erp'
$WatchdogDir = Join-Path $WorkDir 'tools\watchdog'
$ClaudeSettingsDir = Join-Path $env:USERPROFILE '.claude'
$ClaudeSettings = Join-Path $ClaudeSettingsDir 'settings.local.json'
$ClaudeSettingsBackup = Join-Path $WatchdogDir '.settings_backup.json'
$ProgressFile = Join-Path $WatchdogDir 'AUTONOMOUS_PROGRESS.md'
$StatusFile = Join-Path $WatchdogDir '.autonomous_status'
$LogFile = Join-Path $WatchdogDir 'watchdog.log'

Set-Location $WorkDir

Write-Host ''
Write-Host '================================================' -ForegroundColor Yellow
Write-Host '  ERP GENERATOR PIPELINE - SHUTDOWN REPORT' -ForegroundColor Yellow
Write-Host '================================================' -ForegroundColor Yellow
Write-Host ''

# --- Step 1: Restore Claude settings ---
Write-Host '[1/9] Restoring Claude settings...' -ForegroundColor Cyan
if (Test-Path $ClaudeSettingsBackup) {
    Copy-Item $ClaudeSettingsBackup $ClaudeSettings -Force
    Write-Host '  Restored settings.local.json from backup' -ForegroundColor Green
} else {
    Write-Host '  No backup found - settings unchanged' -ForegroundColor DarkGray
}

# --- Step 2: Show final status ---
Write-Host ''
Write-Host '[2/9] Final Status...' -ForegroundColor Cyan
if (Test-Path $StatusFile) {
    $status = Get-Content $StatusFile -Raw
    Write-Host ('  ' + $status) -ForegroundColor White
} else {
    Write-Host '  No status file found' -ForegroundColor DarkGray
}

# --- Step 3: Show progress summary ---
Write-Host ''
Write-Host '[3/9] Progress Summary...' -ForegroundColor Cyan
if (Test-Path $ProgressFile) {
    $completedCount = (Get-Content $ProgressFile | Select-String 'COMPLETED:').Count
    $failedCount = (Get-Content $ProgressFile | Select-String 'FAIL').Count
    Write-Host ('  Completed tasks: ' + $completedCount) -ForegroundColor Green
    if ($failedCount -gt 0) {
        Write-Host ('  Failed tasks: ' + $failedCount) -ForegroundColor Red
    }
    Write-Host ''
    Write-Host '  --- Last 30 lines of progress ---' -ForegroundColor DarkGray
    Get-Content $ProgressFile | Select-Object -Last 30 | ForEach-Object {
        $color = 'White'
        if ($_ -match 'COMPLETED:.*PASS') { $color = 'Green' }
        elseif ($_ -match 'COMPLETED:.*FAIL') { $color = 'Red' }
        elseif ($_ -match 'SPAWNING:') { $color = 'Cyan' }
        elseif ($_ -match 'HEARTBEAT:') { $color = 'DarkGray' }
        Write-Host ('  ' + $_) -ForegroundColor $color
    }
} else {
    Write-Host '  No progress file found' -ForegroundColor DarkGray
}

# --- Step 4: Show AGENT_GOALS scorecard ---
Write-Host ''
Write-Host '[4/9] Agent Goals Scorecard...' -ForegroundColor Cyan
$goalsFile = Join-Path $WatchdogDir 'AGENT_GOALS.md'
if (Test-Path $goalsFile) {
    $passedCount = (Get-Content $goalsFile | Select-String '^\s*- \[x\]').Count
    $totalCount = (Get-Content $goalsFile | Select-String '^\s*- \[[ x]\]').Count
    $failedGoals = $totalCount - $passedCount
    $goalColor = 'Yellow'
    if ($failedGoals -eq 0) { $goalColor = 'Green' }
    Write-Host ('  Goals passed: ' + $passedCount + ' / ' + $totalCount) -ForegroundColor $goalColor
    if ($failedGoals -gt 0) {
        Write-Host '  Unchecked goals:' -ForegroundColor Yellow
        Get-Content $goalsFile | Select-String '^\s*- \[ \]' | ForEach-Object {
            Write-Host ('    ' + $_) -ForegroundColor Red
        }
    }
} else {
    Write-Host '  No goals file found' -ForegroundColor DarkGray
}

# --- Step 5: Show watchdog log tail ---
Write-Host ''
Write-Host '[5/9] Watchdog Log - last 20 lines...' -ForegroundColor Cyan
if (Test-Path $LogFile) {
    Get-Content $LogFile | Select-Object -Last 20 | ForEach-Object {
        $color = 'DarkGray'
        if ($_ -match 'STUCK|FAIL|ERROR') { $color = 'Red' }
        elseif ($_ -match 'SUCCESS|COMPLETE|OK') { $color = 'Green' }
        elseif ($_ -match 'Restart') { $color = 'Yellow' }
        Write-Host ('  ' + $_) -ForegroundColor $color
    }
} else {
    Write-Host '  No watchdog log found' -ForegroundColor DarkGray
}

# --- Step 6: Run gap scan ---
Write-Host ''
Write-Host '[6/9] Current Content Gaps...' -ForegroundColor Cyan
Write-Host '  Running scan_content_gaps.py...' -ForegroundColor DarkGray
try {
    $gapOutput = python tools/scan_content_gaps.py 2>&1
    $summaryLines = $gapOutput | Select-String -Pattern 'TOTAL|gap|missing|complete|OK|FAIL'
    if ($summaryLines) {
        $summaryLines | ForEach-Object {
            $color = 'White'
            if ($_ -match 'missing|gap|FAIL') { $color = 'Red' }
            elseif ($_ -match 'OK|complete') { $color = 'Green' }
            Write-Host ('  ' + $_) -ForegroundColor $color
        }
    } else {
        Write-Host '  Could not parse summary - showing raw output' -ForegroundColor DarkGray
        $gapOutput | Select-Object -Last 10 | ForEach-Object {
            Write-Host ('  ' + $_) -ForegroundColor White
        }
    }
} catch {
    Write-Host '  Could not run gap scan - DB may be down' -ForegroundColor Yellow
}

# --- Step 7: DB restore instructions ---
Write-Host ''
Write-Host '[7/9] Database Restore Instructions...' -ForegroundColor Cyan
$backupDir = Join-Path $WorkDir 'db\backups'
if (Test-Path $backupDir) {
    $latestBackup = Get-ChildItem $backupDir -Filter '*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestBackup) {
        Write-Host ('  Latest backup: ' + $latestBackup.Name + ' (' + $latestBackup.LastWriteTime + ')') -ForegroundColor White
        Write-Host ('  To restore: python tools/db_dump_restore.py restore ' + $latestBackup.Name) -ForegroundColor Yellow
    } else {
        Write-Host '  No .dump files found in db/backups/' -ForegroundColor DarkGray
    }
} else {
    Write-Host '  db/backups/ directory not found' -ForegroundColor DarkGray
}

# --- Step 8: Clean up temp files ---
Write-Host ''
Write-Host '[8/9] Cleanup...' -ForegroundColor Cyan
$promptFile = Join-Path $WatchdogDir '.claude_prompt.txt'
if (Test-Path $promptFile) {
    Remove-Item $promptFile -Force
    Write-Host '  Removed .claude_prompt.txt' -ForegroundColor DarkGray
}
$settingsBackup = Join-Path $WatchdogDir '.settings_backup.json'
if (Test-Path $settingsBackup) {
    Remove-Item $settingsBackup -Force
    Write-Host '  Removed .settings_backup.json' -ForegroundColor DarkGray
}
Write-Host '  Cleanup complete' -ForegroundColor Green

# --- Step 9: Next steps ---
Write-Host ''
Write-Host '================================================' -ForegroundColor Yellow
Write-Host '  [9/9] NEXT STEPS' -ForegroundColor Yellow
Write-Host '================================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '  1. Review tools/watchdog/AGENT_GOALS.md - see which checkboxes passed' -ForegroundColor White
Write-Host '  2. Review tools/watchdog/AUTONOMOUS_PROGRESS.md for full details' -ForegroundColor White
Write-Host '  3. Start the admin panel and open Asset Viewer to visually verify:' -ForegroundColor White
Write-Host '     cd admin ; npm run dev' -ForegroundColor Cyan
Write-Host '     Navigate to: http://localhost:5174/asset-viewer' -ForegroundColor Cyan
Write-Host '  4. If results are bad, restore from backup:' -ForegroundColor White
Write-Host '     python tools/db_dump_restore.py restore BACKUP_FILE' -ForegroundColor Cyan
Write-Host '  5. If results are good, finalize:' -ForegroundColor White
Write-Host '     - Create migration 069 with NOT NULL constraints' -ForegroundColor Cyan
Write-Host '     - Merge feature/generator-pipeline to main' -ForegroundColor Cyan
Write-Host ''

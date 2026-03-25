# WATCHDOG_AUTO.ps1 — Launches, monitors, and restarts Claude Code for ERP generator pipeline
# Spawns Claude in a separate window, tracks by PID, auto-restarts on failure.
#
# Usage:
#   cd C:\Users\ssala\OneDrive\Desktop\MMORPG\erp
#   powershell -ExecutionPolicy Bypass -File tools\watchdog\WATCHDOG_AUTO.ps1

$WorkDir = "C:\Users\ssala\OneDrive\Desktop\MMORPG\erp"
$WatchdogDir = Join-Path $WorkDir "tools\watchdog"
$ProgressFile = Join-Path $WatchdogDir "AUTONOMOUS_PROGRESS.md"
$StatusFile = Join-Path $WatchdogDir ".autonomous_status"
$LogFile = Join-Path $WatchdogDir "watchdog.log"
$PromptFile = Join-Path $WatchdogDir ".claude_prompt.txt"
$TimeoutSeconds = 1200  # 20 minutes no progress = stuck
$CheckInterval = 60     # poll every 60 seconds
$MaxRestarts = 10
$RestartCount = 0
$script:ClaudePID = $null

Set-Location $WorkDir

$InitialPrompt = @'
Read tools/watchdog/AGENT_INSTRUCTIONS.md and execute as the ORCHESTRATOR. This is v3 — FULL CONTENT REGENERATION. All visual data (sprites, lore, icons, backgrounds) exists but is garbage (blobs, template text, identical configs). REPLACE ALL IN-PLACE via upsert — never delete rows. Read ALL mandatory files — especially tools/watchdog/AGENT_GOALS.md (84 acceptance criteria). Read docs/explanation/lore/BOOKS_SUMMARY.md + CHARACTER_GUIDE.md + ENVIRONMENT_GUIDE.md for high-level lore context. Use story_beats.raw_text from DB as PRIMARY lore source for each entity. Execute phases 0-12 in order. Phase 2: design family body plans BEFORE generating sprites. Phase 3: regenerate ALL entity sprites family-by-family with recognizable silhouettes (NOT blobs). Phase 4: regenerate ALL entity lore with book-grounded prose. Phase 5-7: achievement icons, item sprites, backgrounds. Spawn REVIEW AGENTS that READ actual SVG structure and prose — string length checks are MEANINGLESS. Heartbeat every task. Write STATUS: COMPLETE to tools/watchdog/.autonomous_status only when quality gates pass.
'@

$ResumePrompt = @'
Read tools/watchdog/AGENT_INSTRUCTIONS.md and execute as ORCHESTRATOR (v3 — full content regeneration via upsert). Read tools/watchdog/AGENT_GOALS.md (check which items are [x] vs [ ]). Resume from RESUME_STATE in tools/watchdog/AUTONOMOUS_PROGRESS.md. Skip completed families/phases. Use story_beats.raw_text from DB as PRIMARY lore source. Lore docs at docs/explanation/lore/BOOKS_SUMMARY.md for high-level context. REVIEW AGENTS must READ actual SVG elements and prose — NOT count string length. Template text or blob sprites are CRITICAL FAILs. Heartbeat every task. Write STATUS: COMPLETE only when all 84 quality gates pass.
'@

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $Message"
    Write-Host $line -ForegroundColor $Color
    Add-Content $LogFile $line
}

function Launch-Claude {
    param([string]$Prompt)
    Write-Log "Launching Claude Code in new PowerShell window..." "Green"
    # Write prompt to file to avoid quote mangling, keep stdin as real terminal
    Set-Content $PromptFile $Prompt -NoNewline
    $claudeCmd = "Set-Location '$WorkDir'; `$p = Get-Content '$PromptFile' -Raw; claude --dangerously-skip-permissions `$p"
    $proc = Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", $claudeCmd `
        -PassThru
    Write-Log ("Claude launched - PID: " + $proc.Id) "DarkGray"
    return $proc
}

function Get-FileAge {
    param([string]$Path)
    if (Test-Path $Path) {
        $fileAge = [int]((Get-Date) - (Get-Item $Path).LastWriteTime).TotalSeconds
        $watchdogAge = if ($script:WatchdogStartTime) { [int]((Get-Date) - $script:WatchdogStartTime).TotalSeconds } else { $fileAge }
        return [Math]::Min($fileAge, $watchdogAge)
    }
    # Missing progress file = maximally stale (triggers restart)
    return ($TimeoutSeconds + 1)
}

function Get-TaskCount {
    if (Test-Path $ProgressFile) {
        try { return (Get-Content $ProgressFile | Select-String "COMPLETED:").Count } catch { return 0 }
    }
    return 0
}

function Get-CurrentPhase {
    if (Test-Path $ProgressFile) {
        try {
            # Look for the last "## Phase X" or "## Review: Phase X" header
            # Also check SPAWNING/COMPLETED lines for the most recent activity
            $lines = Get-Content $ProgressFile -ErrorAction SilentlyContinue
            $lastPhase = "0"
            foreach ($line in $lines) {
                if ($line -match "## (?:Review: )?Phase (\d+)") {
                    $lastPhase = $Matches[1]
                }
            }
            return $lastPhase
        } catch { }
    }
    return "?"
}

function Test-ClaudeAlive {
    if ($null -eq $script:ClaudePID) { return $false }
    try {
        $proc = Get-Process -Id $script:ClaudePID -ErrorAction Stop
        return (-not $proc.HasExited)
    } catch {
        return $false
    }
}

function Stop-Claude {
    Write-Log ("Killing Claude PID: " + $script:ClaudePID) "Yellow"
    try {
        $proc = Get-Process -Id $script:ClaudePID -ErrorAction SilentlyContinue
        if ($proc) {
            # Kill child processes first
            Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $script:ClaudePID } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
            $proc | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Log 'Kill failed - may have already exited' 'DarkGray'
    }
    Start-Sleep -Seconds 5
}

function Format-Status {
    param($ProcessId, $Alive, $Age, $Tasks, $Elapsed, $Restarts, $Max, $Phase)
    $aliveStr = if ($Alive) { "ALIVE" } else { "DEAD" }
    $now = Get-Date -Format 'HH:mm:ss'
    return "WATCHDOG - PID:$ProcessId $aliveStr - Phase:$Phase - Age:${Age}s - Tasks:$Tasks - Up:${Elapsed}m - R:$Restarts/$Max - $now"
}

# ============================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ERP GENERATOR PIPELINE WATCHDOG" -ForegroundColor Cyan
$infoMsg = "  Timeout: {0} min - Max restarts: {1}" -f ($TimeoutSeconds / 60), $MaxRestarts
Write-Host $infoMsg -ForegroundColor DarkGray
Write-Host "  Progress: $ProgressFile" -ForegroundColor DarkGray
Write-Host "  Log: $LogFile" -ForegroundColor DarkGray
Write-Host "  Ctrl+C to stop everything" -ForegroundColor DarkGray
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
# ============================================================

Set-Content $LogFile ("=== Watchdog started " + (Get-Date) + " ===")
$startStatus = "WATCHDOG - Starting " + (Get-Date -Format 'HH:mm:ss')
Set-Content $StatusFile $startStatus
$script:WatchdogStartTime = Get-Date

# Touch progress file so staleness is measured from this launch
if (Test-Path $ProgressFile) {
    (Get-Item $ProgressFile).LastWriteTime = Get-Date
}

# --- INITIAL LAUNCH ---
$claudeProc = Launch-Claude -Prompt $InitialPrompt
$script:ClaudePID = $claudeProc.Id
$launchTime = Get-Date

Write-Log 'Grace period 60s - letting Claude start up...' 'DarkGray'
Start-Sleep -Seconds 60

# --- MONITOR LOOP ---
while ($true) {
    Start-Sleep -Seconds $CheckInterval

    # ---------------------------------------------------------
    # CHECK: Agent signaled completion via .autonomous_status
    # ---------------------------------------------------------
    if (Test-Path $StatusFile) {
        $statusContent = Get-Content $StatusFile -Raw -ErrorAction SilentlyContinue
        if ($statusContent -match "STATUS:\s*COMPLETE") {
            Write-Log "Agent completed all work - exiting gracefully" "Green"
            $completionStatus = "WATCHDOG - AGENT COMPLETE - " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
            Set-Content $StatusFile $completionStatus
            Add-Content $LogFile ("=== Agent signaled STATUS: COMPLETE at " + (Get-Date) + " ===")
            exit 0
        }
    }

    $alive = Test-ClaudeAlive
    $age = Get-FileAge -Path $ProgressFile
    $tasksDone = Get-TaskCount
    $phase = Get-CurrentPhase
    $elapsed = [int]((Get-Date) - $launchTime).TotalMinutes

    $statusLine = Format-Status -ProcessId $script:ClaudePID -Alive $alive -Age $age -Tasks $tasksDone -Elapsed $elapsed -Restarts $RestartCount -Max $MaxRestarts -Phase $phase
    Set-Content $StatusFile $statusLine -ErrorAction SilentlyContinue

    # ---------------------------------------------------------
    # CASE 1: Process died (crash, token exhaustion, session end)
    # ---------------------------------------------------------
    if (-not $alive) {
        Write-Log ("Claude process DIED - PID: " + $script:ClaudePID) "Yellow"

        # Check if work is complete
        if (Test-Path $StatusFile) {
            $content = Get-Content $StatusFile -Raw -ErrorAction SilentlyContinue
            if ($content -match "STATUS:\s*COMPLETE") {
                Write-Log ("SUCCESS - All phases complete! Tasks: " + $tasksDone) "Green"
                break
            }
        }

        $RestartCount++
        if ($RestartCount -gt $MaxRestarts) {
            Write-Log ("MAX RESTARTS (" + $MaxRestarts + ") exceeded. Stopping.") "Red"
            Set-Content $StatusFile ("WATCHDOG - STOPPED max restarts - Phase:$phase - Tasks:" + $tasksDone)
            break
        }

        Write-Log ("Restart #" + $RestartCount + " of " + $MaxRestarts + " - respawning in 15s...") "Cyan"
        Start-Sleep -Seconds 15

        $claudeProc = Launch-Claude -Prompt $ResumePrompt
        $script:ClaudePID = $claudeProc.Id
        $launchTime = Get-Date
        $script:WatchdogStartTime = Get-Date
        if (Test-Path $ProgressFile) { (Get-Item $ProgressFile).LastWriteTime = Get-Date }

        # Post-restart verification
        Start-Sleep -Seconds 10
        if (-not (Test-ClaudeAlive)) {
            Write-Log ("POST-RESTART FAIL - PID " + $script:ClaudePID + " not running after 10s") "Red"
        } else {
            Write-Log ("POST-RESTART OK - PID " + $script:ClaudePID + " confirmed running") "Green"
        }

        Start-Sleep -Seconds 50  # remaining grace period
        continue
    }

    # ---------------------------------------------------------
    # CASE 2: Process alive but stuck (no progress file updates)
    # ---------------------------------------------------------
    if ($age -gt $TimeoutSeconds) {
        $stuckMin = [int]($age / 60)
        Write-Log ("STUCK - No progress in " + $stuckMin + " min - PID: " + $script:ClaudePID + " - Phase: " + $phase) "Red"

        $RestartCount++
        if ($RestartCount -gt $MaxRestarts) {
            Write-Log ("MAX RESTARTS (" + $MaxRestarts + ") exceeded. Stopping.") "Red"
            Stop-Claude
            Set-Content $StatusFile ("WATCHDOG - STOPPED max restarts - Phase:$phase - Tasks:" + $tasksDone)
            break
        }

        Stop-Claude

        Write-Log ("Restart #" + $RestartCount + " of " + $MaxRestarts + " - respawning in 15s...") "Cyan"
        Start-Sleep -Seconds 15

        $claudeProc = Launch-Claude -Prompt $ResumePrompt
        $script:ClaudePID = $claudeProc.Id
        $launchTime = Get-Date
        $script:WatchdogStartTime = Get-Date
        if (Test-Path $ProgressFile) { (Get-Item $ProgressFile).LastWriteTime = Get-Date }

        # Post-restart verification
        Start-Sleep -Seconds 10
        if (-not (Test-ClaudeAlive)) {
            Write-Log ("POST-RESTART FAIL - PID " + $script:ClaudePID + " not running after 10s") "Red"
        } else {
            Write-Log ("POST-RESTART OK - PID " + $script:ClaudePID + " confirmed running") "Green"
        }

        Start-Sleep -Seconds 50  # remaining grace period
        continue
    }

    # ---------------------------------------------------------
    # CASE 3: All good - heartbeat
    # ---------------------------------------------------------
    $now = Get-Date -Format 'HH:mm:ss'
    $heartbeat = "`r[$now] OK - PID:$($script:ClaudePID) - Phase:$phase - age:${age}s - tasks:$tasksDone - up:${elapsed}m - R:$RestartCount     "
    Write-Host -NoNewline $heartbeat
}

Write-Host ""
Write-Log "=== Watchdog stopped ===" "Cyan"
if (Test-Path $StatusFile) {
    $finalStatus = Get-Content $StatusFile
    Write-Log ("Final: " + $finalStatus) "DarkGray"
}

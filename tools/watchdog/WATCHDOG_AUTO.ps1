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
$TimeoutSeconds = 2700  # 45 minutes no progress = stuck (SVG composition is slow)
$CheckInterval = 60     # poll every 60 seconds
$MaxRestarts = 40
$RestartCount = 0
$script:ClaudePID = $null

Set-Location $WorkDir

$InitialPrompt = @'
Read tools/watchdog/AGENT_INSTRUCTIONS.md and execute as the ORCHESTRATOR. This is v4 — FULL CONTENT REGENERATION. CRITICAL: YOU write every piece of content yourself. Do NOT write Python scripts, template arrays, randomizers, or any automation. v1/v2/v3 ALL FAILED because they wrote scripts instead of composing content. For each entity: READ story_beats.raw_text (actual book prose), then COMPOSE a unique description/SVG yourself, then UPDATE. Read tools/watchdog/AGENT_GOALS.md (88 acceptance criteria). Read docs/explanation/lore/BOOKS_SUMMARY.md for high-level lore. Execute phases 0-12 in order. Phase 2: design family body plans. Phase 3: compose each sprite SVG by hand. Phase 4: write each lore description yourself after reading raw_text. Phases 5-7: compose each icon/sprite/background. Spawn REVIEW AGENTS that detect template structures — if 10+ descriptions share the same sentence pattern, FAIL. If .py files exist in tools/watchdog/, FAIL. Heartbeat every task. Write STATUS: COMPLETE only when quality gates pass.
'@

$ResumePrompt = @'
Read tools/watchdog/AGENT_INSTRUCTIONS.md and execute as ORCHESTRATOR (v4 — YOU write all content, no scripts). Read tools/watchdog/AGENT_GOALS.md (check [x] vs [ ]). Resume from RESUME_STATE in tools/watchdog/AUTONOMOUS_PROGRESS.md. CRITICAL: Do NOT write Python scripts or template arrays. YOU compose each description and SVG by hand after reading story_beats.raw_text. Review agents must detect template sentence structures — metric checks alone are insufficient. If .py files exist in tools/watchdog/, the entire run FAILS. Heartbeat every task. Write STATUS: COMPLETE only when all 88 quality gates pass.
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

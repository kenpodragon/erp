# Syntax checker + dry-run for all watchdog scripts
$ErrorActionPreference = "Continue"
$WatchdogDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scripts = @("START_AUTONOMOUS.ps1", "WATCHDOG_AUTO.ps1", "STOP_AUTONOMOUS.ps1")

Write-Host "=== WATCHDOG SCRIPT VALIDATION ===" -ForegroundColor Cyan
Write-Host ""

foreach ($script in $scripts) {
    $path = Join-Path $WatchdogDir $script
    Write-Host "--- $script ---" -ForegroundColor Yellow

    # Step 1: Check file exists
    if (-not (Test-Path $path)) {
        Write-Host "  FAIL: File not found at $path" -ForegroundColor Red
        continue
    }
    Write-Host "  [OK] File exists" -ForegroundColor Green

    # Step 2: Syntax check via tokenizer
    $content = Get-Content $path -Raw
    $errors = $null
    $tokens = [System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)
    if ($errors.Count -gt 0) {
        Write-Host "  FAIL: $($errors.Count) syntax errors:" -ForegroundColor Red
        foreach ($err in $errors) {
            Write-Host "    Line $($err.Token.StartLine): $($err.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [OK] Syntax valid ($($tokens.Count) tokens)" -ForegroundColor Green
    }

    # Step 3: Check for common issues
    $lines = Get-Content $path
    $lineNum = 0
    $issues = @()
    foreach ($line in $lines) {
        $lineNum++
        # Check for unmatched braces (rough check)
        if ($line -match '^\s*\$\w+\s*=\s*$') {
            $issues += "Line $lineNum`: Empty assignment: $line"
        }
        # Check for paths with forward slashes in Join-Path (OK in PS)
        # Check for missing variable expansion in single quotes
        if ($line -match "'\`$\w+'" -and $line -notmatch "@'" -and $line -notmatch "^#") {
            # Single-quoted variable won't expand — may be intentional
        }
    }
    if ($issues.Count -gt 0) {
        Write-Host "  WARNINGS:" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "    $issue" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== DRY RUN: START_AUTONOMOUS.ps1 (path checks only) ===" -ForegroundColor Cyan
Write-Host ""

$WorkDir = "C:\Users\ssala\OneDrive\Desktop\MMORPG\erp"

# Check all paths referenced in START_AUTONOMOUS
$pathChecks = @{
    "WorkDir" = $WorkDir
    "WatchdogDir" = Join-Path $WorkDir "tools\watchdog"
    "ClaudeSettings" = Join-Path $env:USERPROFILE ".claude\settings.local.json"
    "backend\.env" = Join-Path $WorkDir "backend\.env"
    "tools\.env.example" = Join-Path $WorkDir "tools\.env.example"
    "tools\.env" = Join-Path $WorkDir "tools\.env"
    "AGENT_INSTRUCTIONS.md" = Join-Path $WorkDir "tools\watchdog\AGENT_INSTRUCTIONS.md"
    "AGENT_GOALS.md" = Join-Path $WorkDir "tools\watchdog\AGENT_GOALS.md"
    "AUTONOMOUS_PROGRESS.md" = Join-Path $WorkDir "tools\watchdog\AUTONOMOUS_PROGRESS.md"
    "WATCHDOG_AUTO.ps1" = Join-Path $WorkDir "tools\watchdog\WATCHDOG_AUTO.ps1"
    "tools\lib\db_client.py" = Join-Path $WorkDir "tools\lib\db_client.py"
    "tools\scan_content_gaps.py" = Join-Path $WorkDir "tools\scan_content_gaps.py"
    "tools\db_dump_restore.py" = Join-Path $WorkDir "tools\db_dump_restore.py"
    "AGENTS.md" = Join-Path $WorkDir "..\AGENTS.md"
    "docs\inst\GENERATOR_INSTRUCTIONS.md" = Join-Path $WorkDir "docs\inst\GENERATOR_INSTRUCTIONS.md"
    "docs\inst\GENERATOR_AI_RULES.md" = Join-Path $WorkDir "docs\inst\GENERATOR_AI_RULES.md"
}

foreach ($name in $pathChecks.Keys | Sort-Object) {
    $p = $pathChecks[$name]
    if (Test-Path $p) {
        Write-Host "  [OK] $name" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $name -> $p" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== DRY RUN: Tool checks ===" -ForegroundColor Cyan
Write-Host ""

# Check claude CLI
try {
    $claudeVersion = claude --version 2>&1
    Write-Host "  [OK] claude CLI: $claudeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [MISSING] claude CLI not found in PATH" -ForegroundColor Red
}

# Check python
try {
    $pyVersion = python --version 2>&1
    Write-Host "  [OK] python: $pyVersion" -ForegroundColor Green
} catch {
    try {
        $pyVersion = python3 --version 2>&1
        Write-Host "  [OK] python3: $pyVersion" -ForegroundColor Green
    } catch {
        Write-Host "  [MISSING] python/python3 not found" -ForegroundColor Red
    }
}

# Check docker
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "  [OK] docker: $dockerVersion" -ForegroundColor Green
    $containers = docker ps --format "{{.Names}}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pgContainer = $containers | Select-String "postgres|db"
        if ($pgContainer) {
            Write-Host "  [OK] PostgreSQL container: $pgContainer" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Docker running but no postgres container found" -ForegroundColor Yellow
            Write-Host "    Running: $containers" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "  [WARNING] docker not found or not running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== VALIDATION COMPLETE ===" -ForegroundColor Cyan

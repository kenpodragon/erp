@echo off
setlocal
:: Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose-testing.yaml"
set "FAILED=0"

echo Starting services for testing using %COMPOSE_FILE%...
docker-compose -f "%COMPOSE_FILE%" up -d --remove-orphans backend frontend admin
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services.
    exit /b 1
)

echo.
echo [1/4] Running Backend Tests...
docker-compose -f "%COMPOSE_FILE%" run --rm backend-test
if %errorlevel% neq 0 (
    echo [FAIL] Backend tests failed.
    set "FAILED=1"
)

echo.
echo [2/4] Running Frontend Tests (Lint + Vitest + Build)...
docker-compose -f "%COMPOSE_FILE%" run --rm frontend-test
if %errorlevel% neq 0 (
    echo [FAIL] Frontend tests failed.
    set "FAILED=1"
)

echo.
echo [3/4] Running Admin Tests (Lint + Vitest + Build)...
docker-compose -f "%COMPOSE_FILE%" run --rm admin-test
if %errorlevel% neq 0 (
    echo [FAIL] Admin tests failed.
    set "FAILED=1"
)

echo.
echo [4/4] Running UI/UX E2E Tests (Playwright)...
docker-compose -f "%COMPOSE_FILE%" run --rm e2e-test
if %errorlevel% neq 0 (
    echo [FAIL] E2E tests failed.
    set "FAILED=1"
)

echo.
echo --------------------------------------------------
if "%FAILED%"=="1" (
    echo [RESULT] SOME TESTS FAILED. Please review the output above.
) else (
    echo [RESULT] ALL TESTS PASSED!
)
echo --------------------------------------------------

echo Stopping services...
docker-compose -f "%COMPOSE_FILE%" stop

if "%FAILED%"=="1" exit /b 1
endlocal

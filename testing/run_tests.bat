@echo off
cd ..
echo Starting services for testing...
docker-compose up -d backend frontend admin
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Backend Tests...
docker-compose run --rm backend-test
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Frontend Tests (Lint + Vitest + Build)...
docker-compose run --rm frontend-test
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running Admin Tests (Lint + Vitest + Build)...
docker-compose run --rm admin-test
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running UI/UX E2E Tests (Playwright)...
docker-compose run --rm e2e-test
if %errorlevel% neq 0 exit /b %errorlevel%

echo ALL TESTS PASSED!
docker-compose stop
cd testing

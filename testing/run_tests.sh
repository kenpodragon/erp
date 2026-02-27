#!/bin/bash
set -e

cd ..
echo "Starting services for testing..."
docker-compose up -d backend frontend admin

echo "Running Backend Tests..."
docker-compose run --rm backend-test

echo "Running Frontend Tests (Lint + Vitest + Build)..."
docker-compose run --rm frontend-test

echo "Running Admin Tests (Lint + Vitest + Build)..."
docker-compose run --rm admin-test

echo "Running UI/UX E2E Tests (Playwright)..."
docker-compose run --rm e2e-test

echo "ALL TESTS PASSED!"
docker-compose stop
cd testing

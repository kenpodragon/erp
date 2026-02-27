#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose-testing.yaml"
FAILED=0

echo "Starting services for testing using $COMPOSE_FILE..."
docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans backend frontend admin
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start services."
    exit 1
fi

echo -e "\n[1/4] Running Backend Tests..."
docker-compose -f "$COMPOSE_FILE" run --rm backend-test
if [ $? -ne 0 ]; then
    echo "[FAIL] Backend tests failed."
    FAILED=1
fi

echo -e "\n[2/4] Running Frontend Tests (Lint + Vitest + Build)..."
docker-compose -f "$COMPOSE_FILE" run --rm frontend-test
if [ $? -ne 0 ]; then
    echo "[FAIL] Frontend tests failed."
    FAILED=1
fi

echo -e "\n[3/4] Running Admin Tests (Lint + Vitest + Build)..."
docker-compose -f "$COMPOSE_FILE" run --rm admin-test
if [ $? -ne 0 ]; then
    echo "[FAIL] Admin tests failed."
    FAILED=1
fi

echo -e "\n[4/4] Running UI/UX E2E Tests (Playwright)..."
docker-compose -f "$COMPOSE_FILE" run --rm e2e-test
if [ $? -ne 0 ]; then
    echo "[FAIL] E2E tests failed."
    FAILED=1
fi

echo -e "\n--------------------------------------------------"
if [ $FAILED -eq 1 ]; then
    echo "[RESULT] SOME TESTS FAILED. Please review the output above."
else
    echo "[RESULT] ALL TESTS PASSED!"
fi
echo -e "--------------------------------------------------\n"

echo "Stopping services..."
docker-compose -f "$COMPOSE_FILE" stop

if [ $FAILED -eq 1 ]; then
    exit 1
fi

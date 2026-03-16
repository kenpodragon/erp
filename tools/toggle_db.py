"""
toggle_db.py -- Switch backend between localhost and Docker PostgreSQL.

Usage:
    python tools/toggle_db.py localhost   # Use host machine's PostgreSQL (port 5432)
    python tools/toggle_db.py docker      # Use Docker compose PostgreSQL service
    python tools/toggle_db.py sync        # Dump localhost -> rebuild Docker -> switch to Docker
    python tools/toggle_db.py status      # Show which DB is currently active
"""

import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"


def read_env():
    """Read backend/.env as raw text."""
    if not BACKEND_ENV.exists():
        print(f"ERROR: {BACKEND_ENV} not found")
        sys.exit(1)
    return BACKEND_ENV.read_text(encoding="utf-8")


def write_env(content):
    """Write backend/.env."""
    BACKEND_ENV.write_text(content, encoding="utf-8")


def get_env_value(content, key):
    """Extract a value from .env content."""
    match = re.search(rf"^{re.escape(key)}=(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def set_database_url(content, new_url):
    """Replace DATABASE_URL= line (the active connection) with new_url."""
    return re.sub(
        r"^DATABASE_URL=.+$",
        f"DATABASE_URL={new_url}",
        content,
        count=1,
        flags=re.MULTILINE,
    )


def detect_active(content):
    """Determine which DB is currently active based on DATABASE_URL."""
    active = get_env_value(content, "DATABASE_URL")
    docker = get_env_value(content, "DATABASE_URL_DOCKER")
    localhost = get_env_value(content, "DATABASE_URL_LOCALHOST")

    if active == docker:
        return "docker"
    elif active == localhost:
        return "localhost"
    else:
        return "unknown"


def print_status(content):
    """Print the current active database."""
    active_url = get_env_value(content, "DATABASE_URL")
    mode = detect_active(content)

    label = {"docker": "DOCKER (compose service)", "localhost": "LOCALHOST (host machine)"}.get(
        mode, "UNKNOWN"
    )
    print(f"Active DB:  {label}")
    print(f"URL:        {active_url}")


def switch_to(mode):
    """Switch DATABASE_URL to the specified mode."""
    content = read_env()
    key = f"DATABASE_URL_{mode.upper()}"
    target_url = get_env_value(content, key)

    if not target_url:
        print(f"ERROR: {key} not found in backend/.env")
        sys.exit(1)

    current = detect_active(content)
    if current == mode:
        print(f"Already using {mode}. No changes made.")
        print_status(content)
        return

    updated = set_database_url(content, target_url)
    write_env(updated)

    print(f"Switched DATABASE_URL to {mode}.")
    print_status(updated)

    if mode == "docker":
        print("\nReminder: Run 'docker-compose up -d' to ensure the Docker DB is running.")
    else:
        print("\nReminder: Ensure your local PostgreSQL is running on port 5432.")


def sync():
    """Dump localhost, rebuild Docker image, switch to Docker."""
    print("=== Step 1/3: Dumping localhost database ===")
    refresh_script = PROJECT_ROOT / "tools" / "refresh_dump.py"
    result = subprocess.run(
        [sys.executable, str(refresh_script)],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Dump failed.")
        sys.exit(1)

    print("\n=== Step 2/3: Rebuilding Docker image ===")
    result = subprocess.run(
        ["docker-compose", "down", "postgres"],
        cwd=str(PROJECT_ROOT),
    )
    result = subprocess.run(
        ["docker-compose", "build", "--no-cache", "postgres"],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Docker build failed.")
        sys.exit(1)

    result = subprocess.run(
        ["docker-compose", "up", "-d", "postgres"],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Docker start failed.")
        sys.exit(1)

    print("\n=== Step 3/3: Switching to Docker DB ===")
    switch_to("docker")
    print("\nSync complete! Docker DB now mirrors localhost.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        content = read_env()
        print("Current status:")
        print_status(content)
        sys.exit(0)

    command = sys.argv[1].lower()

    if command == "localhost":
        switch_to("localhost")
    elif command == "docker":
        switch_to("docker")
    elif command == "sync":
        sync()
    elif command == "status":
        content = read_env()
        print_status(content)
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()

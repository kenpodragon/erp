"""
refresh_dump.py — Dump localhost PostgreSQL and rebuild the Docker image.

Usage:
    python refresh_dump.py              # Dump only
    python refresh_dump.py --rebuild    # Dump + rebuild Docker image

Reads connection details from backend/.env (DATABASE_URL_LOCALHOST or DATABASE_URL).
Outputs dump.sql in the same directory as this script.
"""

import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"
DUMP_FILE = PROJECT_ROOT / "db" / "deploy" / "dump.sql"


def get_localhost_connection():
    """Parse localhost DB connection from backend/.env."""
    if not BACKEND_ENV.exists():
        print(f"ERROR: {BACKEND_ENV} not found")
        sys.exit(1)

    env_vars = {}
    with open(BACKEND_ENV, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip()

    # Prefer DATABASE_URL_LOCALHOST, fall back to DATABASE_URL
    url_str = env_vars.get("DATABASE_URL_LOCALHOST") or env_vars.get("DATABASE_URL", "")

    if not url_str:
        print("ERROR: No DATABASE_URL_LOCALHOST or DATABASE_URL found in backend/.env")
        sys.exit(1)

    # Parse the URL — handle both postgresql:// and postgresql+psycopg2://
    url_str = re.sub(r"postgresql\+\w+://", "postgresql://", url_str)
    parsed = urlparse(url_str)

    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    user = parsed.username or "erp_app_user"
    password = parsed.password or ""
    dbname = parsed.path.lstrip("/") or "erp_production"

    # For pg_dump, resolve host.docker.internal to localhost
    if host == "host.docker.internal":
        host = "localhost"

    return host, port, user, password, dbname


def run_pg_dump(host, port, user, password, dbname):
    """Run pg_dump and save to dump.sql."""
    print(f"Dumping {dbname}@{host}:{port} as {user}...")

    env = os.environ.copy()
    env["PGPASSWORD"] = password

    # Find pg_dump — check common Windows locations
    pg_dump = "pg_dump"
    if sys.platform == "win32":
        for pg_version in range(17, 13, -1):
            candidate = rf"C:\Program Files\PostgreSQL\{pg_version}\bin\pg_dump.exe"
            if os.path.exists(candidate):
                pg_dump = candidate
                break

    cmd = [
        pg_dump,
        "-h", host,
        "-p", str(port),
        "-U", user,
        "-d", dbname,
        "--no-owner",        # Don't include ownership commands (we set owner in init)
        "--no-acl",          # Don't include access privileges
        "--clean",           # Include DROP statements before CREATE
        "--if-exists",       # Use IF EXISTS with DROP
        "-f", str(DUMP_FILE),
    ]

    print(f"  Running: {' '.join(cmd[:6])}... -f {DUMP_FILE.name}")

    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"ERROR: pg_dump failed:\n{result.stderr}")
        sys.exit(1)

    size_mb = DUMP_FILE.stat().st_size / (1024 * 1024)
    print(f"  OK: Dump saved to {DUMP_FILE} ({size_mb:.1f} MB)")


def rebuild_docker():
    """Rebuild the postgres Docker image and restart the container."""
    print("\nRebuilding Docker postgres image...")

    result = subprocess.run(
        ["docker-compose", "down", "postgres"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
    )

    result = subprocess.run(
        ["docker-compose", "build", "--no-cache", "postgres"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"ERROR: Docker build failed:\n{result.stderr}")
        sys.exit(1)

    print("  OK: Image rebuilt")

    result = subprocess.run(
        ["docker-compose", "up", "-d", "postgres"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"ERROR: Docker start failed:\n{result.stderr}")
        sys.exit(1)

    print("  OK: Postgres container started")
    print("\nDone! Docker DB now mirrors localhost.")


if __name__ == "__main__":
    host, port, user, password, dbname = get_localhost_connection()
    run_pg_dump(host, port, user, password, dbname)

    if "--rebuild" in sys.argv:
        rebuild_docker()
    else:
        print("\nTo rebuild the Docker image with this dump, run:")
        print("  python refresh_dump.py --rebuild")
        print("  -- or --")
        print("  docker-compose down postgres && docker-compose build --no-cache postgres && docker-compose up -d postgres")

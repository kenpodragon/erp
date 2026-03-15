"""
DB Dump & Restore utility for ERP.

Usage:
    python tools/db_dump_restore.py dump              # Create a backup
    python tools/db_dump_restore.py restore <file>    # Restore from a backup
    python tools/db_dump_restore.py list              # List available backups

Connection string is pulled from backend/.env (DATABASE_URL).
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

# Load .env from backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
BACKUP_DIR = Path(__file__).resolve().parent.parent / "db" / "backups"


def _load_env() -> dict:
    """Parse backend/.env into a dict (minimal dotenv, no external deps)."""
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        print(f"ERROR: {env_file} not found.", file=sys.stderr)
        sys.exit(1)

    env = {}
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def _parse_db_url(url: str) -> dict:
    """Extract host, port, user, password, dbname from a DATABASE_URL."""
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": parsed.username or "",
        "password": parsed.password or "",
        "dbname": parsed.path.lstrip("/"),
    }


def cmd_dump():
    """Create a pg_dump backup."""
    env = _load_env()
    db_url = env.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not found in backend/.env", file=sys.stderr)
        sys.exit(1)

    db = _parse_db_url(db_url)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = BACKUP_DIR / f"erp_backup_{timestamp}.dump"

    cmd = [
        "pg_dump",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["dbname"],
        "--format=custom",
        f"--file={dump_file}",
    ]

    run_env = os.environ.copy()
    run_env["PGPASSWORD"] = db["password"]

    print(f"Creating backup: {dump_file.name}")
    result = subprocess.run(cmd, env=run_env, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: pg_dump failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    size_mb = dump_file.stat().st_size / (1024 * 1024)
    print(f"Backup created: {dump_file} ({size_mb:.1f} MB)")


def cmd_restore(dump_file: str):
    """Restore from a pg_dump backup."""
    env = _load_env()
    db_url = env.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not found in backend/.env", file=sys.stderr)
        sys.exit(1)

    db = _parse_db_url(db_url)

    # Resolve file path
    path = Path(dump_file)
    if not path.exists():
        # Try relative to backups dir
        path = BACKUP_DIR / dump_file
    if not path.exists():
        print(f"ERROR: File not found: {dump_file}", file=sys.stderr)
        sys.exit(1)

    cmd = [
        "pg_restore",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["dbname"],
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        str(path),
    ]

    run_env = os.environ.copy()
    run_env["PGPASSWORD"] = db["password"]

    print(f"Restoring from: {path.name}")
    print("WARNING: This will DROP and recreate all tables. Proceed? [y/N] ", end="")
    confirm = input().strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    result = subprocess.run(cmd, env=run_env, capture_output=True, text=True)
    if result.returncode != 0 and result.stderr:
        # pg_restore often returns warnings even on success
        warnings = [l for l in result.stderr.splitlines() if "ERROR" in l]
        if warnings:
            print(f"Restore completed with errors:\n" + "\n".join(warnings))
        else:
            print("Restore completed (with warnings — likely harmless).")
    else:
        print("Restore completed successfully.")


def cmd_list():
    """List available backups."""
    if not BACKUP_DIR.exists():
        print("No backups directory found.")
        return

    dumps = sorted(BACKUP_DIR.glob("*.dump"), reverse=True)
    if not dumps:
        print("No backups found.")
        return

    print(f"Available backups ({len(dumps)}):")
    for f in dumps:
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"  {f.name}  ({size_mb:.1f} MB)")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()
    if command == "dump":
        cmd_dump()
    elif command == "restore":
        if len(sys.argv) < 3:
            print("Usage: python tools/db_dump_restore.py restore <file>")
            sys.exit(1)
        cmd_restore(sys.argv[2])
    elif command == "list":
        cmd_list()
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()

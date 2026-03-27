"""
toggle_db.py -- Switch backend between localhost and Docker PostgreSQL.

Usage:
    python tools/toggle_db.py localhost   # Use host machine's PostgreSQL (port 5432)
    python tools/toggle_db.py docker      # Use Docker compose PostgreSQL service
    python tools/toggle_db.py sync        # Dump localhost -> rebuild Docker -> switch to Docker
    python tools/toggle_db.py status      # Show which DB is currently active

Also comments/uncomments the postgres service and depends_on block in infra/deploy/docker-compose.yml
so there's no dangling container when using localhost.
"""

import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"
COMPOSE_FILE = PROJECT_ROOT / "infra" / "deploy" / "docker-compose.yml"


# ---------------------------------------------------------------------------
# backend/.env helpers
# ---------------------------------------------------------------------------

def read_env():
    if not BACKEND_ENV.exists():
        print(f"ERROR: {BACKEND_ENV} not found")
        sys.exit(1)
    return BACKEND_ENV.read_text(encoding="utf-8")


def write_env(content):
    BACKEND_ENV.write_text(content, encoding="utf-8")


def get_env_value(content, key):
    match = re.search(rf"^{re.escape(key)}=(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def set_database_url(content, new_url):
    return re.sub(
        r"^DATABASE_URL=.+$",
        f"DATABASE_URL={new_url}",
        content,
        count=1,
        flags=re.MULTILINE,
    )


def detect_active(content):
    active = get_env_value(content, "DATABASE_URL")
    docker = get_env_value(content, "DATABASE_URL_DOCKER")
    localhost = get_env_value(content, "DATABASE_URL_LOCALHOST")
    if active == docker:
        return "docker"
    elif active == localhost:
        return "localhost"
    return "unknown"


def print_status(content):
    active_url = get_env_value(content, "DATABASE_URL")
    mode = detect_active(content)
    label = {
        "docker": "DOCKER (compose service)",
        "localhost": "LOCALHOST (host machine)",
    }.get(mode, "UNKNOWN")
    print(f"Active DB:      {label}")
    print(f"URL:            {active_url}")

    compose_state = "enabled" if is_compose_postgres_enabled() else "disabled"
    print(f"Compose postgres: {compose_state}")


# ---------------------------------------------------------------------------
# docker-compose.yml helpers
# ---------------------------------------------------------------------------

def read_compose():
    if not COMPOSE_FILE.exists():
        print(f"ERROR: {COMPOSE_FILE} not found")
        sys.exit(1)
    return COMPOSE_FILE.read_text(encoding="utf-8")


def write_compose(content):
    COMPOSE_FILE.write_text(content, encoding="utf-8")


def is_compose_postgres_enabled():
    content = read_compose()
    # If the postgres block is commented out, the line after DOCKER_DB_START will start with #
    match = re.search(r"# DOCKER_DB_START\n(.*)", content)
    if match:
        return not match.group(1).strip().startswith("#")
    return True


def comment_block(content, start_marker, end_marker):
    """Comment out lines between start_marker and end_marker (exclusive of markers).

    Prepends '# ' right after existing leading whitespace, preserving indent level.
    e.g. '    ports:' -> '    # ports:'
    """
    lines = content.split("\n")
    result = []
    inside = False
    for line in lines:
        if start_marker in line:
            result.append(line)
            inside = True
            continue
        if end_marker in line:
            inside = False
            result.append(line)
            continue
        if inside and line.strip():
            # Already commented? skip
            stripped = line.lstrip()
            if stripped.startswith("#"):
                result.append(line)
            else:
                indent = line[: len(line) - len(stripped)]
                result.append(f"{indent}# {stripped}")
        else:
            result.append(line)
    return "\n".join(result)


def uncomment_block(content, start_marker, end_marker):
    """Uncomment lines between start_marker and end_marker (exclusive of markers).

    Removes the first '# ' after leading whitespace, restoring original indent.
    e.g. '    # ports:' -> '    ports:'
    """
    lines = content.split("\n")
    result = []
    inside = False
    for line in lines:
        if start_marker in line:
            result.append(line)
            inside = True
            continue
        if end_marker in line:
            inside = False
            result.append(line)
            continue
        if inside and line.strip():
            # Remove '# ' comment prefix preserving indent
            uncommented = re.sub(r"^(\s*)# ", r"\1", line, count=1)
            result.append(uncommented)
        else:
            result.append(line)
    return "\n".join(result)


def enable_compose_postgres():
    """Uncomment postgres service and depends_on in infra/deploy/docker-compose.yml."""
    content = read_compose()
    content = uncomment_block(content, "# DOCKER_DB_START", "# DOCKER_DB_END")
    content = uncomment_block(content, "# DOCKER_DB_DEPENDS_START", "# DOCKER_DB_DEPENDS_END")
    write_compose(content)


def disable_compose_postgres():
    """Comment out postgres service and depends_on in infra/deploy/docker-compose.yml."""
    content = read_compose()
    content = comment_block(content, "# DOCKER_DB_START", "# DOCKER_DB_END")
    content = comment_block(content, "# DOCKER_DB_DEPENDS_START", "# DOCKER_DB_DEPENDS_END")
    write_compose(content)


# ---------------------------------------------------------------------------
# Toggle logic
# ---------------------------------------------------------------------------

def switch_to(mode):
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

    # Update .env
    updated = set_database_url(content, target_url)
    write_env(updated)

    # Update docker-compose.yml
    if mode == "docker":
        enable_compose_postgres()
        print("Switched DATABASE_URL to docker.")
        print("Enabled postgres service in infra/deploy/docker-compose.yml.")
        print_status(updated)
        print("\nRun 'docker-compose -f infra/deploy/docker-compose.yml up -d' to start all services including postgres.")
    else:
        disable_compose_postgres()
        print("Switched DATABASE_URL to localhost.")
        print("Disabled postgres service in infra/deploy/docker-compose.yml (commented out).")
        print_status(updated)
        print("\nEnsure your local PostgreSQL is running on port 5432.")


def sync():
    print("=== Step 1/3: Dumping localhost database ===")
    refresh_script = PROJECT_ROOT / "tools" / "refresh_dump.py"
    result = subprocess.run(
        [sys.executable, str(refresh_script)],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Dump failed.")
        sys.exit(1)

    # Enable postgres in compose before rebuilding
    enable_compose_postgres()

    print("\n=== Step 2/3: Rebuilding Docker image ===")
    subprocess.run(["docker-compose", "-f", "infra/deploy/docker-compose.yml", "down", "postgres"], cwd=str(PROJECT_ROOT))
    result = subprocess.run(
        ["docker-compose", "-f", "infra/deploy/docker-compose.yml", "build", "--no-cache", "postgres"],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Docker build failed.")
        sys.exit(1)

    result = subprocess.run(
        ["docker-compose", "-f", "infra/deploy/docker-compose.yml", "up", "-d", "postgres"],
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print("ERROR: Docker start failed.")
        sys.exit(1)

    print("\n=== Step 3/3: Switching to Docker DB ===")
    # Don't call switch_to to avoid double-enable; just update .env
    content = read_env()
    target_url = get_env_value(content, "DATABASE_URL_DOCKER")
    updated = set_database_url(content, target_url)
    write_env(updated)
    print("Switched DATABASE_URL to docker.")
    print_status(updated)
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

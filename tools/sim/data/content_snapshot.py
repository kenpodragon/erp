"""
content_snapshot.py — Query live PostgreSQL DB and save content data for the math model.
Usage: python data/content_snapshot.py [--output PATH]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: python-dotenv not installed. Run: pip install python-dotenv", file=sys.stderr)
    sys.exit(1)

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent.parent  # tools/sim/data -> erp
ENV_FILE = REPO_ROOT / "backend" / ".env"
DEFAULT_OUTPUT = Path(
    os.getenv("CONTENT_SNAPSHOT_PATH", str(SCRIPT_DIR / "content_snapshot.json"))
)


# ---------------------------------------------------------------------------
# DB connection
# ---------------------------------------------------------------------------

def build_dsn() -> str:
    """Load .env and return a psycopg2-compatible DSN."""
    load_dotenv(ENV_FILE)

    # Prefer DATABASE_URL_LOCALHOST (points to localhost), fall back to DATABASE_URL
    # then try individual vars.
    url = (
        os.getenv("DATABASE_URL_LOCALHOST")
        or os.getenv("DATABASE_URL")
    )

    if url:
        # Replace host.docker.internal with localhost for scripts running on the host
        url = url.replace("host.docker.internal", "localhost")
        # Strip SQLAlchemy driver prefix if present (postgresql+psycopg2://...)
        if url.startswith("postgresql+"):
            url = "postgresql" + url[url.index("://"):]
        return url

    # Individual vars fallback
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "erp_production")
    user = os.getenv("DB_USER", "erp_app_user")
    password = os.getenv("DB_PASSWORD", "")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


def connect(dsn: str):
    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True, autocommit=True)
    return conn


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

SQL_BOOKS = """
SELECT b.id AS book_id, b.title,
       COUNT(DISTINCT c.id) AS chapters,
       COUNT(DISTINCT s.id) AS scenes
FROM books b
JOIN chapters c ON c.book_id = b.id
JOIN scenes   s ON s.chapter_id = c.id
GROUP BY b.id, b.title
ORDER BY b.id;
"""

SQL_SCENES = """
SELECT s.id, s.title, c.chapter_number, b.id AS book_id,
       SUM(
         LENGTH(sb.raw_text)
         - LENGTH(REPLACE(sb.raw_text, ' ', ''))
         + 1
       ) AS word_count
FROM scenes s
JOIN story_beats sb ON sb.scene_id = s.id
JOIN chapters    c  ON c.id = s.chapter_id
JOIN books       b  ON b.id = c.book_id
GROUP BY s.id, s.title, c.chapter_number, b.id;
"""

SQL_BOSSES = """
SELECT s.id AS scene_id, s.title AS scene_title,
       c.chapter_number, b.id AS book_id,
       sgd.is_boss_scene, sgd.required_time_seconds,
       swc.boss_entity_id, swc.wave_count, swc.max_enemies_per_wave,
       swc.hp_multiplier, swc.gold_multiplier, swc.scaling_factor,
       swc.spawn_interval_ms, swc.entity_pool
FROM scene_gameplay_data sgd
JOIN scenes   s   ON s.id = sgd.scene_id
JOIN chapters c   ON c.id = s.chapter_id
JOIN books    b   ON b.id = c.book_id
LEFT JOIN scene_wave_configs swc ON swc.scene_id = s.id
WHERE sgd.is_boss_scene = TRUE
ORDER BY b.id, c.chapter_number;
"""

SQL_SKILLS = """
SELECT id, name, category, description, xp_curve_type,
       base_cooldown_seconds, base_cost_gold, cost_scaling_factor,
       idle_level_scaling, effect_type, benefits_json
FROM skills;
"""

SQL_GAME_CONFIGS = """
SELECT key, value_json, category
FROM game_configs
WHERE category IN ('combat', 'progression', 'waves', 'economy', 'training', 'drops', 'upgrades')
ORDER BY category, key;
"""


def run_query(cur, sql: str) -> list:
    """Execute SQL and return list of plain dicts. JSONB string columns are parsed."""
    cur.execute(sql)
    rows = []
    for row in cur.fetchall():
        # RealDictCursor returns RealDictRow (dict-like) — convert directly
        record = dict(row)
        # Parse any remaining string-encoded JSON columns
        for col in ('value_json', 'boss_config', 'entity_pool', 'stat_block', 'benefits_json'):
            if col in record and isinstance(record[col], str):
                try:
                    record[col] = json.loads(record[col])
                except (json.JSONDecodeError, TypeError):
                    pass
        rows.append(record)
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Snapshot content data from PostgreSQL for the math model.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON path")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading .env from: {ENV_FILE}")
    dsn = build_dsn()
    # Mask password in log
    safe_dsn = dsn
    try:
        import re
        safe_dsn = re.sub(r':[^@]+@', ':***@', dsn)
    except Exception:
        pass
    print(f"Connecting to: {safe_dsn}")

    conn = connect(dsn)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("Running queries...")
    books   = run_query(cur, SQL_BOOKS)
    scenes  = run_query(cur, SQL_SCENES)
    bosses  = run_query(cur, SQL_BOSSES)
    skills  = run_query(cur, SQL_SKILLS)
    configs = run_query(cur, SQL_GAME_CONFIGS)

    cur.close()
    conn.close()

    snapshot = {
        "snapshot_date": datetime.now(timezone.utc).isoformat(),
        "books":        [dict(r) for r in books],
        "scenes":       [dict(r) for r in scenes],
        "bosses":       [dict(r) for r in bosses],
        "skills":       [dict(r) for r in skills],
        "game_configs": [dict(r) for r in configs],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, default=str)

    print(f"\nSnapshot saved to: {output_path}")
    print(f"  books:        {len(books)}")
    print(f"  scenes:       {len(scenes)}")
    print(f"  bosses:       {len(bosses)}")
    print(f"  skills:       {len(skills)}")
    print(f"  game_configs: {len(configs)}")


if __name__ == "__main__":
    main()

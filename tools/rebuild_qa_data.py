"""
Rebuild QA data for the visual review page.
Run from code level: python tools/rebuild_qa_data.py
  or from wrapper: python code/tools/rebuild_qa_data.py

Queries all asset categories from the local DB and writes qa-data.json
into the frontend src/pages/ directory. Restart the frontend container
after running to pick up changes.
"""
import psycopg2
import json
import os
from pathlib import Path

# Load DB creds from backend .env
env_path = Path(__file__).parent.parent / "backend" / ".env"
db_url = None
for line in env_path.read_text().splitlines():
    if line.startswith("DATABASE_URL="):
        db_url = line.split("=", 1)[1]
        break

if not db_url:
    print("ERROR: DATABASE_URL not found in backend/.env")
    exit(1)

# Replace host.docker.internal with localhost for host access
db_url = db_url.replace("host.docker.internal", "localhost")

print(f"Connecting to DB...")
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# ALL entity sprites
print("Fetching entity sprites...")
cur.execute("""
    SELECT ar.asset_key, ar.render_definition->>'svg_template' as svg,
           ef.name as family_name, e.canonical_name,
           length(ar.render_definition->>'svg_template') as svg_len
    FROM asset_registry ar
    JOIN entities e ON ar.asset_key = 'entity_sprite_' || e.id
    JOIN entity_families ef ON e.entity_family_id = ef.id
    WHERE ar.category='entity_sprite'
    ORDER BY ef.name, e.canonical_name;
""")
sprites = [{"key": r[0], "svg": r[1], "family": r[2], "label": r[3], "len": r[4]} for r in cur.fetchall()]

# ALL achievement icons
print("Fetching achievement icons...")
cur.execute("""
    SELECT ar.asset_key, ar.render_definition->>'svg_template' as svg,
           a.name, a.category,
           length(ar.render_definition->>'svg_template') as svg_len
    FROM asset_registry ar
    JOIN achievements a ON ar.asset_key = 'achievement_icon_' || a.id
    WHERE ar.category='achievement_icon'
    ORDER BY a.category, a.threshold_value;
""")
achievements = [{"key": r[0], "svg": r[1], "label": f"{r[3]}: {r[2]}", "len": r[4]} for r in cur.fetchall()]

# ALL item sprites
print("Fetching item sprites...")
cur.execute("""
    SELECT ar.asset_key, ar.render_definition->>'svg_template' as svg,
           itb.display_name, gs.display_name as slot,
           length(ar.render_definition->>'svg_template') as svg_len
    FROM asset_registry ar
    JOIN item_type_bases itb ON ar.asset_key = 'item_sprite_' || itb.id
    JOIN gear_slots gs ON itb.gear_slot_id = gs.id
    WHERE ar.category='item_sprite'
    ORDER BY gs.paperdoll_layer, itb.id;
""")
items = [{"key": r[0], "svg": r[1], "label": f"{r[3]}: {r[2]}", "len": r[4]} for r in cur.fetchall()]

# ALL artifact icons
print("Fetching artifact icons...")
cur.execute("""
    SELECT ar.asset_key, ar.render_definition->>'svg_template' as svg,
           ca.name,
           length(ar.render_definition->>'svg_template') as svg_len
    FROM asset_registry ar
    JOIN curated_artifacts ca ON ar.asset_key = 'artifact_icon_' || ca.id
    WHERE ar.category='artifact_icon'
    ORDER BY ca.id;
""")
artifacts = [{"key": r[0], "svg": r[1], "label": r[2], "len": r[3]} for r in cur.fetchall()]

# ALL backgrounds — include render_definitions from asset_registry FK columns
print("Fetching backgrounds...")
cur.execute("""
    SELECT b.background_key, b.parallax_config::text, b.mood, b.time_of_day,
           length(b.parallax_config::text) as cfg_len,
           b.far_asset_key, b.mid_asset_key, b.near_asset_key, b.boss_asset_key,
           ar_far.render_definition::text as far_def,
           ar_mid.render_definition::text as mid_def,
           ar_near.render_definition::text as near_def,
           ar_boss.render_definition::text as boss_def
    FROM backgrounds b
    LEFT JOIN asset_registry ar_far ON ar_far.asset_key = b.far_asset_key
    LEFT JOIN asset_registry ar_mid ON ar_mid.asset_key = b.mid_asset_key
    LEFT JOIN asset_registry ar_near ON ar_near.asset_key = b.near_asset_key
    LEFT JOIN asset_registry ar_boss ON ar_boss.asset_key = b.boss_asset_key
    ORDER BY b.background_key;
""")
backgrounds = []
for r in cur.fetchall():
    entry = {
        "key": r[0], "label": f"{r[2]}/{r[3]}", "config": r[1], "len": r[4],
        "far_asset_key": r[5], "mid_asset_key": r[6],
        "near_asset_key": r[7], "boss_asset_key": r[8],
        "far_def": r[9], "mid_def": r[10],
        "near_def": r[11], "boss_def": r[12],
        "populated": r[5] is not None or r[6] is not None,
    }
    backgrounds.append(entry)

# ALL background element definitions and components
print("Fetching background elements...")
cur.execute("""
    SELECT ar.asset_key, ar.category, ar.display_name, ar.description,
           ar.render_definition::text, ar.tags::text,
           length(ar.render_definition::text) as def_len
    FROM asset_registry ar
    WHERE ar.category IN ('bg_element_def', 'bg_component')
    ORDER BY ar.category, ar.asset_key;
""")
bg_elements = [{"key": r[0], "category": r[1], "label": r[2], "desc": r[3], "def": r[4], "tags": r[5], "len": r[6]} for r in cur.fetchall()]

conn.close()

data = {
    "sprites": sprites,
    "achievements": achievements,
    "items": items,
    "artifacts": artifacts,
    "bg_elements": bg_elements,
    "backgrounds": backgrounds
}

out_path = Path(__file__).parent.parent / "frontend" / "src" / "pages" / "qa-data.json"
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f)

size_mb = os.path.getsize(out_path) / (1024 * 1024)

print(f"\nWrote {out_path}")
print(f"  Sprites:      {len(sprites)}")
print(f"  Achievements: {len(achievements)}")
print(f"  Items:        {len(items)}")
print(f"  Artifacts:    {len(artifacts)}")
print(f"  Backgrounds:  {len(backgrounds)}")
print(f"  BG Elements:  {len(bg_elements)}")
print(f"  File size:    {size_mb:.1f} MB")
print(f"\nRestart frontend container to pick up changes:")
print(f"  cd code/infra/deploy && docker compose restart frontend")

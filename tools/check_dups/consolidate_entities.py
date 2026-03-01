import os
import argparse
import logging
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler("consolidation.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from backend/.env
load_dotenv("backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL not found in backend/.env")
    exit(1)

# Override host for local execution
if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def merge_records(session, table, master_id, duplicate_id, fk_maps, alias_table, alias_fk, dry_run=True):
    """
    Merges duplicate_id into master_id.
    1. Re-maps all FKs in fk_maps.
    2. Adds duplicate canonical_name as an alias to master.
    3. Deletes duplicate_id.
    """
    try:
        # Get names for logging
        name_col = "canonical_name"
        master_name = session.execute(text(f"SELECT {name_col} FROM {table} WHERE id = :id"), {"id": master_id}).scalar()
        dup_name = session.execute(text(f"SELECT {name_col} FROM {table} WHERE id = :id"), {"id": duplicate_id}).scalar()

        if not master_name or not dup_name:
            logger.warning(f"  Skipping merge: Record not found (Master ID: {master_id}, Dup ID: {duplicate_id})")
            return

        logger.info(f"Merging {table}: '{dup_name}' (id:{duplicate_id}) -> '{master_name}' (id:{master_id})")

        # 1. Update FKs
        for fk_table, fk_col in fk_maps:
            if dry_run:
                count = session.execute(text(f"SELECT COUNT(*) FROM {fk_table} WHERE {fk_col} = :id"), {"id": duplicate_id}).scalar()
                if count > 0:
                    logger.info(f"  [Dry Run] Would update {count} records in {fk_table}.{fk_col}")
            else:
                # Handle unique constraint violations during update
                if fk_table in ["entity_scene_appearances", "location_scene_appearances", "entity_beat_appearances"]:
                    # Delete conflicting records first (keep master's version)
                    conflict_col = "scene_id" if "scene" in fk_table else "story_beat_id"
                    session.execute(text(f"""
                        DELETE FROM {fk_table} 
                        WHERE {fk_col} = :dup_id 
                        AND {conflict_col} IN (SELECT {conflict_col} FROM {fk_table} WHERE {fk_col} = :master_id)
                    """), {"dup_id": duplicate_id, "master_id": master_id})
                
                elif fk_table in ["entity_aliases", "location_aliases"]:
                    # Delete aliases from duplicate that already exist for master
                    session.execute(text(f"""
                        DELETE FROM {fk_table}
                        WHERE {fk_col} = :dup_id
                        AND LOWER(alias) IN (SELECT LOWER(alias) FROM {fk_table} WHERE {fk_col} = :master_id)
                    """), {"dup_id": duplicate_id, "master_id": master_id})
                
                res = session.execute(text(f"UPDATE {fk_table} SET {fk_col} = :master_id WHERE {fk_col} = :dup_id"), 
                                      {"master_id": master_id, "dup_id": duplicate_id})
                if res.rowcount > 0:
                    logger.info(f"  Updated {res.rowcount} records in {fk_table}.{fk_col}")

        # 2. Add duplicate name as alias to master
        if dry_run:
            logger.info(f"  [Dry Run] Would add '{dup_name}' as alias for master id:{master_id}")
        else:
            # Check if alias already exists
            exists = session.execute(text(f"SELECT 1 FROM {alias_table} WHERE {alias_fk} = :master_id AND alias = :alias"),
                                     {"master_id": master_id, "alias": dup_name}).scalar()
            if not exists:
                session.execute(text(f"INSERT INTO {alias_table} ({alias_fk}, alias) VALUES (:master_id, :alias)"),
                                {"master_id": master_id, "alias": dup_name})
                logger.info(f"  Added '{dup_name}' as alias to master")

        # 3. Delete duplicate
        if dry_run:
            logger.info(f"  [Dry Run] Would delete record id:{duplicate_id} from {table}")
        else:
            session.execute(text(f"DELETE FROM {table} WHERE id = :id"), {"id": duplicate_id})
            logger.info(f"  Deleted record id:{duplicate_id}")

    except Exception as e:
        logger.error(f"  Error merging {duplicate_id} into {master_id}: {e}")
        raise

def run_case_insensitive_cleanup(session, dry_run=True):
    # 1. Handle Entities
    logger.info("\n=== Starting Case-Insensitive Entity Consolidation ===")
    entity_groups = session.execute(text("""
        SELECT LOWER(canonical_name) as low_name, ARRAY_AGG(id ORDER BY id ASC) as ids
        FROM entities
        GROUP BY LOWER(canonical_name)
        HAVING COUNT(*) > 1
    """)).fetchall()

    entity_fks = [
        ("entity_aliases", "entity_id"),
        ("entity_scene_appearances", "entity_id"),
        ("entity_beat_appearances", "entity_id")
    ]

    for group in entity_groups:
        master_id = group.ids[0]
        for dup_id in group.ids[1:]:
            merge_records(session, "entities", master_id, dup_id, entity_fks, "entity_aliases", "entity_id", dry_run)

    # 2. Handle Locations
    logger.info("\n=== Starting Case-Insensitive Location Consolidation ===")
    location_groups = session.execute(text("""
        SELECT LOWER(canonical_name) as low_name, ARRAY_AGG(id ORDER BY id ASC) as ids
        FROM locations
        GROUP BY LOWER(canonical_name)
        HAVING COUNT(*) > 1
    """)).fetchall()

    location_fks = [
        ("location_aliases", "location_id"),
        ("location_scene_appearances", "location_id"),
        ("scenes", "primary_location_id"),
        ("story_beats", "location_id")
    ]

    for group in location_groups:
        master_id = group.ids[0]
        for dup_id in group.ids[1:]:
            merge_records(session, "locations", master_id, dup_id, location_fks, "location_aliases", "location_id", dry_run)

def run_manual_mapping(session, mapping_file, dry_run=True):
    if not os.path.exists(mapping_file):
        logger.error(f"Mapping file not found: {mapping_file}")
        return

    logger.info(f"\n=== Starting Manual Consolidation from {mapping_file} ===")
    try:
        with open(mapping_file, 'r') as f:
            mapping = json.load(f)
        
        entity_fks = [
            ("entity_aliases", "entity_id"),
            ("entity_scene_appearances", "entity_id"),
            ("entity_beat_appearances", "entity_id")
        ]
        
        location_fks = [
            ("location_aliases", "location_id"),
            ("location_scene_appearances", "location_id"),
            ("scenes", "primary_location_id"),
            ("story_beats", "location_id")
        ]

        if "entities" in mapping:
            for item in mapping["entities"]:
                master_id = item["master_id"]
                for dup_id in item["duplicate_ids"]:
                    merge_records(session, "entities", master_id, dup_id, entity_fks, "entity_aliases", "entity_id", dry_run)

        if "locations" in mapping:
            for item in mapping["locations"]:
                master_id = item["master_id"]
                for dup_id in item["duplicate_ids"]:
                    merge_records(session, "locations", master_id, dup_id, location_fks, "location_aliases", "location_id", dry_run)

    except Exception as e:
        logger.error(f"Error during manual mapping: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Consolidate duplicate entities and locations.")
    parser.add_argument("--execute", action="store_true", help="Actually execute the changes (default is dry-run)")
    parser.add_argument("--mapping", type=str, help="Path to manual mapping JSON file")
    args = parser.parse_args()

    session = Session()
    try:
        if args.mapping:
            run_manual_mapping(session, args.mapping, dry_run=not args.execute)
        else:
            run_case_insensitive_cleanup(session, dry_run=not args.execute)

        if not args.execute:
            logger.info("\nDry run completed. No changes made.")
        else:
            session.commit()
            logger.info("\nConsolidation committed successfully.")

    except Exception as e:
        session.rollback()
        logger.error(f"Consolidation failed: {e}")
    finally:
        session.close()

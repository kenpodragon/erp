import os
import difflib
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler("duplicate_analysis.log"),
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

# Override host for local execution if it's set to host.docker.internal
if "host.docker.internal" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def get_similarity(a, b):
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()

def check_table_duplicates(table_name, name_column="canonical_name", threshold=0.80):
    logger.info(f"\n--- Checking potential duplicates in {table_name} ---")
    try:
        # Check connection and count
        count = session.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
        logger.info(f"Total records in {table_name}: {count}")
        
        if count == 0:
            return

        result = session.execute(text(f"SELECT id, {name_column} FROM {table_name}"))
        items = result.fetchall()
        
        duplicates = []
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                id1, name1 = items[i]
                id2, name2 = items[j]
                
                # Check for exact case-insensitive match (if not already filtered by UNIQUE)
                if name1.lower() == name2.lower():
                    duplicates.append((name1, name2, 1.0, id1, id2))
                    continue
                
                similarity = get_similarity(name1, name2)
                if similarity >= threshold:
                    duplicates.append((name1, name2, similarity, id1, id2))
        
        if not duplicates:
            logger.info("No significant duplicates found.")
        else:
            for n1, n2, sim, id1, id2 in sorted(duplicates, key=lambda x: x[2], reverse=True):
                logger.info(f"Potential Duplicate: '{n1}' (id:{id1}) and '{n2}' (id:{id2}) - Similarity: {sim:.2f}")
                
    except Exception as e:
        logger.error(f"Error checking {table_name}: {e}")

def check_aliases_overlap(base_table, alias_table, base_id_col, name_column="canonical_name"):
    logger.info(f"\n--- Checking overlap between {base_table} and its aliases ---")
    try:
        # Check if an alias matches a canonical name of another entity
        query = text(f"""
            SELECT e.id, e.{name_column}, a.id as alias_id, a.alias, e2.id as other_id, e2.{name_column} as other_name
            FROM {alias_table} a
            JOIN {base_table} e ON a.{base_id_col} = e.id
            JOIN {base_table} e2 ON LOWER(a.alias) = LOWER(e2.{name_column})
            WHERE e.id != e2.id
        """)
        result = session.execute(query)
        overlaps = result.fetchall()
        
        if not overlaps:
            logger.info("No overlaps found where an alias matches another canonical name.")
        else:
            for eid, ename, aid, alias, oid, oname in overlaps:
                logger.info(f"Overlap: Alias '{alias}' of '{ename}' (id:{eid}) matches canonical name of '{oname}' (id:{oid})")

        # Check for similar aliases across different entities
        logger.info(f"\n--- Checking similar aliases across different {base_table} ---")
        result = session.execute(text(f"SELECT id, {base_id_col}, alias FROM {alias_table}"))
        aliases = result.fetchall()
        
        sim_aliases = []
        for i in range(len(aliases)):
            for j in range(i + 1, len(aliases)):
                id1, eid1, a1 = aliases[i]
                id2, eid2, a2 = aliases[j]
                if eid1 == eid2: continue
                
                similarity = get_similarity(a1, a2)
                if similarity >= 0.9:
                    sim_aliases.append((a1, eid1, a2, eid2, similarity))
        
        if not sim_aliases:
            logger.info("No highly similar aliases found across different entities.")
        else:
            for a1, eid1, a2, eid2, sim in sorted(sim_aliases, key=lambda x: x[4], reverse=True):
                logger.info(f"Similar Aliases: '{a1}' (entity:{eid1}) and '{a2}' (entity:{eid2}) - Similarity: {sim:.2f}")

    except Exception as e:
        logger.error(f"Error checking aliases for {base_table}: {e}")


if __name__ == "__main__":
    check_table_duplicates("entities")
    check_aliases_overlap("entities", "entity_aliases", "entity_id")
    
    check_table_duplicates("locations")
    check_aliases_overlap("locations", "location_aliases", "location_id")
    
    session.close()

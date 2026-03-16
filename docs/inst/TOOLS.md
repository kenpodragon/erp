# Tools Reference

Scripts in the `/tools` directory. Run from the project root.

---

## Database & Infrastructure

### `toggle_db.py` — Switch Database Connection

Toggles `DATABASE_URL` in `backend/.env` between localhost PostgreSQL and the Docker compose service.

```bash
python tools/toggle_db.py status      # Show which DB is active
python tools/toggle_db.py localhost    # Use host machine's PostgreSQL (port 5432)
python tools/toggle_db.py docker      # Use Docker compose PostgreSQL service
python tools/toggle_db.py sync        # Dump localhost → rebuild Docker image → switch to Docker
```

**How it works:** Reads `DATABASE_URL_LOCALHOST` and `DATABASE_URL_DOCKER` from `backend/.env` and sets `DATABASE_URL` to the selected one. The `sync` command chains `refresh_dump.py` → Docker rebuild → toggle.

### `refresh_dump.py` — Dump Localhost DB for Docker

Runs `pg_dump` against the localhost PostgreSQL and saves the output to `db/deploy/dump.sql`. When the Docker postgres image is rebuilt, it restores from this dump instead of running the individual SQL scripts.

```bash
python tools/refresh_dump.py             # Dump only (saves db/deploy/dump.sql)
python tools/refresh_dump.py --rebuild   # Dump + rebuild Docker image + restart container
```

**Connection:** Reads `DATABASE_URL_LOCALHOST` (or `DATABASE_URL`) from `backend/.env`. Resolves `host.docker.internal` to `localhost` for `pg_dump`.

### `db_dump_restore.py` — DB Dump & Restore Utility

General-purpose dump and restore utility for the ERP database.

---

## Content Generation

### `book_parser/` — Book Processor Pipeline

Multi-phase pipeline that processes the Towers of Elysium source material (DOCX) into structured game content (books, chapters, scenes, story beats, entities, locations).

### `classify_atmospheres.py` — Atmosphere Classifier

Classifies scenes/chapters/books to atmosphere archetypes based on lore keywords. Used to auto-assign atmosphere IDs during content ingestion.

### `classify_entity_families.py` — Entity Family Classifier

Classifies entities into family groups based on their attributes and lore context (REC 2.6.2).

---

## Audio Generation

### `generate_8bit_music.py` — Music Definition Generator

Generates 8-bit music JSON definitions for Web Audio API synthesis. Creates atmosphere-specific tracks with chord progressions, bass lines, and arpeggios.

### `generate_8bit_sfx.py` — SFX Preset Generator

Generates 8-bit SFX preset JSON definitions for the Web Audio API SFXEngine. Creates combat, UI, and ambient sound effects.

### `generate_placeholder_music.py` — Placeholder WAV Generator

Generates 4 placeholder 8-bit chiptune WAV files for early development. Superseded by Web Audio synthesis in 2.5.

### `generate_migration_040.py` — Migration 040 Generator

Generates SQL migration 040: seeds music definitions, boss themes, and extended SFX presets into the database.

---

## Utilities

### `check_dups/` — Duplicate Analysis

Tools for finding duplicate or near-duplicate content across the processed book data.

### `test_helpers.py` — Test Utilities

Shared helper functions used by other tool scripts.

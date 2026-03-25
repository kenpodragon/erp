# Game Asset Generator Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 20-generator pipeline with shared framework to populate all hollow DB tables, with AI-assisted generation (Claude/Gemini CLI) and Python fallback, culminating in AI agent-driven UAT.

**Architecture:** Centralized framework (`tools/lib/`) with 3 modules (ai_provider, db_client, base_generator) + cache system. Each generator subclasses `BaseGenerator`, implementing domain-specific logic. AI generation via CLI subprocess with hybrid batching. File-based recovery cache with manifest tracking.

**Tech Stack:** Python 3.11+, asyncio, psycopg2, argparse, python-dotenv, tqdm

**Spec:** `docs/superpowers/specs/2026-03-23-generator-pipeline-design.md`
**RECS:** `docs/recs/C_STORY_ASSET_GENERATORS.md`

---

## File Structure

### Framework (`tools/lib/`)
| File | Responsibility |
|------|---------------|
| `tools/lib/__init__.py` | Package init, re-exports |
| `tools/lib/ai_provider.py` | AI CLI routing (claude/gemini), subprocess, batching, retry, fallback |
| `tools/lib/db_client.py` | DB connection from `backend/.env`, CRUD helpers, transaction scope |
| `tools/lib/base_generator.py` | BaseGenerator ABC, CLI argparse, orchestration flow, progress |
| `tools/lib/cache.py` | File-based cache, manifest tracking, recovery/resume |

### Generators (`tools/`)
| File | Target Table | §Ref |
|------|-------------|------|
| `tools/assign_atmospheres.py` | chapters, books, locations | §8 |
| `tools/seed_entity_families.py` | entity_families, entities | §2 |
| `tools/generate_entity_gameplay.py` | entity_gameplay_data | §1 |
| `tools/capture_difficulty_preset.py` | difficulty_presets | §12 |
| `tools/generate_entity_sprites.py` | asset_registry | §3 |
| `tools/generate_item_sprites.py` | asset_registry | §4 |
| `tools/generate_projectile_sprites.py` | asset_registry | §5 |
| `tools/populate_attack_visuals.py` | attack_types | §9 |
| `tools/generate_backgrounds.py` | backgrounds | §6 |
| `tools/generate_scene_data.py` | scene_gameplay_data, scene_wave_configs | §7 |
| `tools/generate_lore_content.py` | entities (descriptions) | §14 |
| `tools/generate_boss_lore.py` | chapters, books (transition_lore_text) | §15 |
| `tools/generate_achievement_icons.py` | achievements | §10 |
| `tools/generate_artifact_icons.py` | curated_artifacts | §11 |
| `tools/generate_extended_music.py` | atmospheres | §13 |
| `tools/scan_content_gaps.py` | dev_content_audit | §17 |

### Tests (`tools/tests/`)
| File | Tests |
|------|-------|
| `tools/tests/__init__.py` | Package init |
| `tools/tests/test_ai_provider.py` | AI provider config, subprocess mock, retry, fallback |
| `tools/tests/test_db_client.py` | DB helpers, transaction, get_missing, get_lookup |
| `tools/tests/test_base_generator.py` | CLI parsing, orchestration, resume, idempotency |
| `tools/tests/test_cache.py` | Cache write/read, manifest state transitions, recovery |
| `tools/tests/test_generators.py` | Python fallback for each generator (no AI, no DB) |

### Documentation
| File | Content |
|------|---------|
| `tools/.env.example` | AI provider config template |
| `docs/inst/GENERATOR_INSTRUCTIONS.md` | Human + AI setup/usage guide |
| `docs/inst/GENERATOR_AI_RULES.md` | AI agent prompt for full population |

---

## Phase 1: Framework

### Task 1: AI Provider Module

**Files:**
- Create: `tools/lib/__init__.py`
- Create: `tools/lib/ai_provider.py`
- Create: `tools/.env.example`
- Create: `tools/tests/__init__.py`
- Create: `tools/tests/test_ai_provider.py`

- [ ] **Step 1: Create `tools/lib/` package**

```bash
mkdir -p tools/lib tools/tests
```

- [ ] **Step 2: Write failing tests for AIProvider**

Create `tools/tests/test_ai_provider.py`:
```python
"""Tests for AI provider routing module."""
import pytest
import json
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

# Will import from tools.generators.lib.ai_provider once implemented
# For now, these define the expected interface


class TestAIProviderConfig:
    """Test AI provider configuration loading."""

    def test_load_config_from_env(self, tmp_path):
        """Config loads provider/model/timeout from env file."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "AI_CLI_PROVIDER=claude\n"
            "AI_CLI_PROVIDER_FALLBACK=gemini\n"
            "AI_CLI_MODEL=claude-sonnet-4-6\n"
            "AI_CLI_TIMEOUT=120\n"
            "AI_CLI_MAX_RETRIES=3\n"
        )
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file=str(env_file))
        assert provider.primary == "claude"
        assert provider.fallback == "gemini"
        assert provider.model == "claude-sonnet-4-6"
        assert provider.timeout == 120
        assert provider.max_retries == 3

    def test_default_config_without_env(self):
        """Defaults to claude if no env file."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")
        assert provider.primary == "claude"
        assert provider.timeout == 120

    def test_build_cli_command_claude(self):
        """Claude CLI command is built correctly."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")
        cmd = provider._build_command("claude", "Generate data for entity X")
        assert cmd[0] == "claude"
        assert "-p" in cmd
        assert "--output-format" in cmd

    def test_build_cli_command_gemini(self):
        """Gemini CLI command is built correctly."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")
        provider.primary = "gemini"
        cmd = provider._build_command("gemini", "Generate data for entity X")
        assert cmd[0] == "gemini"


class TestAIProviderGenerate:
    """Test single generation calls."""

    def test_generate_parses_json_response(self):
        """generate() returns parsed JSON from CLI stdout."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")

        mock_result = json.dumps({"movement_type": "ground", "size_class": "medium"})

        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_proc = AsyncMock()
            mock_proc.communicate.return_value = (mock_result.encode(), b"")
            mock_proc.returncode = 0
            mock_exec.return_value = mock_proc

            result = asyncio.run(provider.generate("test prompt", {}))
            assert result["movement_type"] == "ground"

    def test_generate_retries_on_failure(self):
        """generate() retries up to max_retries on subprocess failure."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")
        provider.max_retries = 2
        provider.timeout = 5

        call_count = 0

        async def mock_exec(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            mock_proc = AsyncMock()
            if call_count < 2:
                mock_proc.communicate.return_value = (b"", b"error")
                mock_proc.returncode = 1
            else:
                mock_proc.communicate.return_value = (b'{"ok": true}', b"")
                mock_proc.returncode = 0
            return mock_proc

        with patch("asyncio.create_subprocess_exec", side_effect=mock_exec):
            result = asyncio.run(provider.generate("test", {}))
            assert result["ok"] is True
            assert call_count == 2


class TestAIProviderBatch:
    """Test batch generation with grouping."""

    def test_generate_batch_groups_items(self):
        """generate_batch groups items by group_key and sends batches."""
        from tools.generators.lib.ai_provider import AIProvider
        provider = AIProvider(env_file="/nonexistent/.env")

        items = [
            {"id": 1, "type": "creature", "name": "Wolf"},
            {"id": 2, "type": "creature", "name": "Bear"},
            {"id": 3, "type": "spirit", "name": "Wisp"},
        ]

        calls = []

        async def mock_generate(prompt, schema, provider_name=None):
            calls.append(prompt)
            return [{"id": i["id"], "movement": "ground"} for i in items[:2]]

        provider.generate = mock_generate

        def prompt_builder(batch, context):
            return f"Generate for {len(batch)} items"

        results = asyncio.run(
            provider.generate_batch(
                items, prompt_builder,
                group_by="type", batch_size=10
            )
        )
        # Should have 2 calls: one for creatures, one for spirits
        assert len(calls) == 2
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd tools && python -m pytest tests/test_ai_provider.py -v`
Expected: ImportError — `tools.generators.lib.ai_provider` does not exist yet

- [ ] **Step 4: Implement `tools/lib/__init__.py`**

```python
"""Generator framework library."""
from tools.generators.lib.ai_provider import AIProvider
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.cache import GeneratorCache
```

- [ ] **Step 5: Implement `tools/lib/ai_provider.py`**

```python
"""AI CLI provider routing — Claude and Gemini subprocess integration.

Handles provider selection, CLI subprocess management, retry with exponential
backoff, auto-fallback to secondary provider, and hybrid batch generation.

Configuration via tools/.env or backend/.env:
    AI_CLI_PROVIDER=claude
    AI_CLI_PROVIDER_FALLBACK=gemini
    AI_CLI_MODEL=claude-sonnet-4-6
    AI_CLI_TIMEOUT=120
    AI_CLI_MAX_RETRIES=3
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Callable, Optional

try:
    from dotenv import dotenv_values
except ImportError:
    dotenv_values = None


class AIProvider:
    """Routes generation requests to AI CLI tools (claude/gemini)."""

    DEFAULTS = {
        "AI_CLI_PROVIDER": "claude",
        "AI_CLI_PROVIDER_FALLBACK": "gemini",
        "AI_CLI_MODEL": "claude-sonnet-4-6",
        "AI_CLI_TIMEOUT": "120",
        "AI_CLI_MAX_RETRIES": "3",
    }

    def __init__(self, env_file: str = None):
        config = dict(self.DEFAULTS)

        # Try loading from env files
        for path in [env_file, "tools/.env", "backend/.env"]:
            if path and os.path.exists(path) and dotenv_values:
                loaded = dotenv_values(path)
                for k in self.DEFAULTS:
                    if k in loaded:
                        config[k] = loaded[k]
                break

        # Also check os.environ
        for k in self.DEFAULTS:
            if k in os.environ:
                config[k] = os.environ[k]

        self.primary = config["AI_CLI_PROVIDER"]
        self.fallback = config["AI_CLI_PROVIDER_FALLBACK"]
        self.model = config["AI_CLI_MODEL"]
        self.timeout = int(config["AI_CLI_TIMEOUT"])
        self.max_retries = int(config["AI_CLI_MAX_RETRIES"])
        self._consecutive_failures = 0

    def _build_command(self, provider: str, prompt: str) -> list[str]:
        """Build CLI command for the given provider."""
        if provider == "claude":
            return ["claude", "-p", prompt, "--output-format", "json"]
        elif provider == "gemini":
            return ["gemini", "-p", prompt, "--output-format", "json"]
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def generate(
        self, prompt: str, schema: dict, provider_name: str = None
    ) -> Any:
        """Single generation call. Returns parsed JSON from CLI stdout."""
        provider = provider_name or self.primary
        last_error = None

        for attempt in range(self.max_retries):
            try:
                cmd = self._build_command(provider, prompt)
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=self.timeout
                )

                if proc.returncode != 0:
                    raise RuntimeError(
                        f"CLI returned {proc.returncode}: {stderr.decode()[:500]}"
                    )

                result = json.loads(stdout.decode())
                self._consecutive_failures = 0
                return result

            except (RuntimeError, json.JSONDecodeError, asyncio.TimeoutError) as e:
                last_error = e
                self._consecutive_failures += 1
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** (attempt + 1))  # 2s, 4s, 8s

        # Auto-fallback to secondary provider
        if provider == self.primary and self.fallback and self._consecutive_failures >= 3:
            print(
                f"[ai_provider] Primary '{self.primary}' failed {self._consecutive_failures}x, "
                f"falling back to '{self.fallback}'",
                file=sys.stderr,
            )
            self._consecutive_failures = 0
            return await self.generate(prompt, schema, provider_name=self.fallback)

        raise RuntimeError(
            f"AI generation failed after {self.max_retries} attempts: {last_error}"
        )

    async def generate_batch(
        self,
        items: list[dict],
        prompt_builder: Callable[[list[dict], dict], str],
        group_by: str = None,
        batch_size: int = 50,
        parallel: int = 1,
        context: dict = None,
    ) -> list[Any]:
        """Hybrid batched generation.

        Groups items by group_by key, splits into batches, runs parallel workers.
        """
        context = context or {}

        # Group items
        if group_by:
            groups: dict[str, list] = {}
            for item in items:
                key = str(item.get(group_by, "default"))
                groups.setdefault(key, []).append(item)
        else:
            groups = {"all": items}

        # Build all batches
        batches = []
        for group_key, group_items in groups.items():
            for i in range(0, len(group_items), batch_size):
                batches.append({
                    "group": group_key,
                    "items": group_items[i : i + batch_size],
                })

        # Process batches with concurrency limit
        semaphore = asyncio.Semaphore(parallel)
        results = []
        errors = []

        async def process_batch(batch):
            async with semaphore:
                prompt = prompt_builder(batch["items"], context)
                try:
                    result = await self.generate(prompt, {})
                    if isinstance(result, list):
                        return result
                    return [result]
                except RuntimeError as e:
                    errors.append({"batch": batch["group"], "error": str(e)})
                    return []

        tasks = [process_batch(b) for b in batches]
        batch_results = await asyncio.gather(*tasks)
        for br in batch_results:
            results.extend(br)

        if errors:
            print(
                f"[ai_provider] {len(errors)} batch(es) failed: "
                + "; ".join(e["error"][:100] for e in errors[:3]),
                file=sys.stderr,
            )

        return results
```

- [ ] **Step 6: Create `tools/.env.example`**

```env
# AI Provider Configuration for Generator Pipeline
# Copy to tools/.env and configure for your setup.

# Primary AI CLI provider: claude | gemini
AI_CLI_PROVIDER=claude

# Fallback provider (auto-switches after 3 consecutive failures)
AI_CLI_PROVIDER_FALLBACK=gemini

# Model to use for generation
AI_CLI_MODEL=claude-sonnet-4-6

# Timeout per AI call in seconds
AI_CLI_TIMEOUT=120

# Max retries per batch before marking as failed
AI_CLI_MAX_RETRIES=3
```

- [ ] **Step 7: Run tests — verify passing**

Run: `cd tools && python -m pytest tests/test_ai_provider.py -v`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add tools/lib/ tools/tests/ tools/.env.example
git commit -m "feat: add AI provider module with Claude/Gemini CLI routing"
```

---

### Task 2: Database Client Module

**Files:**
- Create: `tools/lib/db_client.py`
- Create: `tools/tests/test_db_client.py`

- [ ] **Step 1: Write failing tests for DBClient**

Create `tools/tests/test_db_client.py`:
```python
"""Tests for database client module.

Uses sqlite3 in-memory for unit tests (no PostgreSQL needed).
"""
import pytest
import sqlite3
import json

# Monkey-patch for testing without psycopg2
import tools.generators.lib.db_client as db_module


@pytest.fixture
def mock_db(tmp_path):
    """Create an in-memory SQLite DB with test tables."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE movement_types (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE entities (
            id INTEGER PRIMARY KEY,
            canonical_name TEXT NOT NULL,
            entity_family_id INTEGER
        )
    """)
    conn.execute("""
        CREATE TABLE entity_gameplay_data (
            id INTEGER PRIMARY KEY,
            entity_id INTEGER UNIQUE NOT NULL,
            movement_type_id INTEGER,
            color_primary TEXT
        )
    """)
    # Seed lookup
    conn.execute("INSERT INTO movement_types (id, name) VALUES (1, 'ground')")
    conn.execute("INSERT INTO movement_types (id, name) VALUES (2, 'hover')")
    # Seed entities
    conn.execute("INSERT INTO entities (id, canonical_name) VALUES (1, 'Wolf')")
    conn.execute("INSERT INTO entities (id, canonical_name) VALUES (2, 'Wraith')")
    conn.execute("INSERT INTO entities (id, canonical_name) VALUES (3, 'Golem')")
    # Seed partial gameplay data
    conn.execute(
        "INSERT INTO entity_gameplay_data (id, entity_id, movement_type_id) "
        "VALUES (1, 1, 1)"
    )
    conn.commit()
    return conn


class TestDBClientQuery:
    def test_query_returns_dicts(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        result = client.query("SELECT * FROM movement_types ORDER BY id")
        assert len(result) == 2
        assert result[0]["name"] == "ground"

    def test_query_with_params(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        result = client.query(
            "SELECT * FROM entities WHERE canonical_name = ?", {"name": "Wolf"}
        )
        # Note: SQLite uses ? not %(name)s, but we test the interface


class TestDBClientInsert:
    def test_insert_one(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        client.insert_one("movement_types", {"id": 3, "name": "flying"})
        result = client.query("SELECT * FROM movement_types WHERE name = 'flying'")
        assert len(result) == 1

    def test_insert_batch(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        rows = [
            {"id": 4, "name": "burrowing"},
            {"id": 5, "name": "teleport"},
        ]
        client.insert_batch("movement_types", rows)
        result = client.query("SELECT * FROM movement_types")
        assert len(result) == 4  # 2 original + 2 new


class TestDBClientGetMissing:
    def test_get_missing_finds_null_columns(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        # Entity 2 and 3 have no entity_gameplay_data rows
        # Entity 1 has gameplay data but color_primary is NULL
        result = client.query(
            "SELECT e.id, e.canonical_name FROM entities e "
            "LEFT JOIN entity_gameplay_data eg ON eg.entity_id = e.id "
            "WHERE eg.id IS NULL"
        )
        assert len(result) == 2  # entities 2 and 3


class TestDBClientGetLookup:
    def test_get_lookup_returns_name_id_map(self, mock_db):
        from tools.generators.lib.db_client import DBClient
        client = DBClient.__new__(DBClient)
        client._conn = mock_db
        client.get_lookup = lambda table: {
            row["name"]: row["id"]
            for row in client.query(f"SELECT id, name FROM {table}")
        }
        lookup = client.get_lookup("movement_types")
        assert lookup["ground"] == 1
        assert lookup["hover"] == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools && python -m pytest tests/test_db_client.py -v`
Expected: ImportError

- [ ] **Step 3: Implement `tools/lib/db_client.py`**

```python
"""Database client for generator pipeline.

Reads DATABASE_URL from backend/.env. Provides CRUD helpers with
per-batch transaction scope. Uses psycopg2 for PostgreSQL, with
sqlite3 fallback for testing.
"""

import os
import sqlite3
from typing import Any, Optional

try:
    import psycopg2
    import psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

try:
    from dotenv import dotenv_values
except ImportError:
    dotenv_values = None


class DBClient:
    """Database client with CRUD helpers and transaction management."""

    def __init__(self, env_file: str = "backend/.env", use_sqlite: str = None):
        """Connect to database.

        Args:
            env_file: Path to .env file with DATABASE_URL.
            use_sqlite: If set, use SQLite at this path (for testing).
        """
        if use_sqlite:
            self._conn = sqlite3.connect(use_sqlite)
            self._conn.row_factory = sqlite3.Row
            self._is_pg = False
        else:
            url = self._load_url(env_file)
            if not HAS_PSYCOPG2:
                raise ImportError("psycopg2 required for PostgreSQL. Install: pip install psycopg2-binary")
            self._conn = psycopg2.connect(url)
            self._is_pg = True

    def _load_url(self, env_file: str) -> str:
        """Load DATABASE_URL from env file or environment."""
        if os.environ.get("DATABASE_URL"):
            return os.environ["DATABASE_URL"]
        if dotenv_values and os.path.exists(env_file):
            vals = dotenv_values(env_file)
            if "DATABASE_URL" in vals:
                return vals["DATABASE_URL"]
        raise ValueError(f"DATABASE_URL not found in {env_file} or environment")

    def query(self, sql: str, params: dict = None) -> list[dict]:
        """Execute SELECT, return rows as dicts."""
        if self._is_pg:
            with self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params or {})
                return [dict(row) for row in cur.fetchall()]
        else:
            cur = self._conn.execute(sql)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def insert_one(self, table: str, data: dict) -> Optional[int]:
        """Insert single row. Returns id if available."""
        cols = ", ".join(data.keys())
        if self._is_pg:
            placeholders = ", ".join(f"%({k})s" for k in data.keys())
            sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING id"
            with self._conn.cursor() as cur:
                cur.execute(sql, data)
                self._conn.commit()
                row = cur.fetchone()
                return row[0] if row else None
        else:
            placeholders = ", ".join("?" for _ in data)
            sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
            cur = self._conn.execute(sql, list(data.values()))
            self._conn.commit()
            return cur.lastrowid

    def insert_batch(self, table: str, rows: list[dict]) -> list[int]:
        """Insert batch in single transaction. Returns IDs."""
        if not rows:
            return []
        ids = []
        try:
            for row in rows:
                rid = self.insert_one(table, row)
                ids.append(rid)
            return ids
        except Exception:
            if self._is_pg:
                self._conn.rollback()
            raise

    def update(self, table: str, data: dict, where: dict) -> int:
        """Update rows matching where clause. Returns affected count."""
        if self._is_pg:
            set_clause = ", ".join(f"{k} = %({k})s" for k in data.keys())
            where_clause = " AND ".join(f"{k} = %(w_{k})s" for k in where.keys())
            params = {**data, **{f"w_{k}": v for k, v in where.items()}}
            sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
            with self._conn.cursor() as cur:
                cur.execute(sql, params)
                self._conn.commit()
                return cur.rowcount
        else:
            set_clause = ", ".join(f"{k} = ?" for k in data.keys())
            where_clause = " AND ".join(f"{k} = ?" for k in where.keys())
            sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
            cur = self._conn.execute(sql, list(data.values()) + list(where.values()))
            self._conn.commit()
            return cur.rowcount

    def count(self, table: str, where: dict = None) -> int:
        """Count rows, optionally filtered."""
        if where:
            if self._is_pg:
                clause = " AND ".join(f"{k} = %({k})s" for k in where)
                sql = f"SELECT COUNT(*) as cnt FROM {table} WHERE {clause}"
            else:
                clause = " AND ".join(f"{k} = ?" for k in where)
                sql = f"SELECT COUNT(*) as cnt FROM {table} WHERE {clause}"
            result = self.query(sql, where if self._is_pg else None)
        else:
            result = self.query(f"SELECT COUNT(*) as cnt FROM {table}")
        return result[0]["cnt"] if result else 0

    def get_lookup(self, table: str) -> dict[str, int]:
        """Return {name: id} mapping for a lookup table."""
        rows = self.query(f"SELECT id, name FROM {table} ORDER BY id")
        return {row["name"]: row["id"] for row in rows}

    def close(self):
        """Close the connection."""
        self._conn.close()
```

- [ ] **Step 4: Run tests — verify passing**

Run: `cd tools && python -m pytest tests/test_db_client.py -v`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add tools/lib/db_client.py tools/tests/test_db_client.py
git commit -m "feat: add database client module with CRUD helpers"
```

---

### Task 3: Cache Module

**Files:**
- Create: `tools/lib/cache.py`
- Create: `tools/tests/test_cache.py`

- [ ] **Step 1: Write failing tests for GeneratorCache**

Create `tools/tests/test_cache.py`:
```python
"""Tests for file-based generation cache with manifest tracking."""
import pytest
import json
from pathlib import Path
from tools.generators.lib.cache import GeneratorCache


@pytest.fixture
def cache(tmp_path):
    return GeneratorCache("test_generator", cache_dir=str(tmp_path))


class TestCacheWrite:
    def test_write_batch_creates_file(self, cache, tmp_path):
        data = [{"id": 1, "name": "Wolf"}, {"id": 2, "name": "Bear"}]
        cache.write_batch("batch_001", data)
        batch_file = tmp_path / "test_generator" / "batch_001.json"
        assert batch_file.exists()
        assert json.loads(batch_file.read_text()) == data

    def test_write_batch_updates_manifest(self, cache, tmp_path):
        cache.write_batch("batch_001", [{"id": 1}])
        manifest = cache.read_manifest()
        assert manifest["batches"]["batch_001"]["status"] == "generated"
        assert manifest["batches"]["batch_001"]["item_count"] == 1


class TestCacheRead:
    def test_read_batch(self, cache):
        data = [{"id": 1}]
        cache.write_batch("batch_001", data)
        result = cache.read_batch("batch_001")
        assert result == data

    def test_read_missing_batch_returns_none(self, cache):
        result = cache.read_batch("nonexistent")
        assert result is None


class TestManifest:
    def test_mark_inserted(self, cache):
        cache.write_batch("batch_001", [{"id": 1}])
        cache.mark_batch("batch_001", "inserted")
        manifest = cache.read_manifest()
        assert manifest["batches"]["batch_001"]["status"] == "inserted"

    def test_mark_failed(self, cache):
        cache.write_batch("batch_001", [{"id": 1}])
        cache.mark_batch("batch_001", "failed", error="timeout")
        manifest = cache.read_manifest()
        assert manifest["batches"]["batch_001"]["status"] == "failed"
        assert manifest["batches"]["batch_001"]["error"] == "timeout"

    def test_get_resumable_batches(self, cache):
        cache.write_batch("batch_001", [{"id": 1}])
        cache.mark_batch("batch_001", "inserted")
        cache.write_batch("batch_002", [{"id": 2}])
        # batch_002 is "generated" not "inserted"
        resumable = cache.get_resumable()
        assert "batch_002" in resumable
        assert "batch_001" not in resumable

    def test_get_failed_batches(self, cache):
        cache.write_batch("batch_001", [{"id": 1}])
        cache.mark_batch("batch_001", "failed", error="err")
        failed = cache.get_failed()
        assert "batch_001" in failed


class TestCacheCleanup:
    def test_clean_removes_all(self, cache, tmp_path):
        cache.write_batch("batch_001", [{"id": 1}])
        cache.clean()
        cache_dir = tmp_path / "test_generator"
        assert not cache_dir.exists() or not any(cache_dir.iterdir())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools && python -m pytest tests/test_cache.py -v`
Expected: ImportError

- [ ] **Step 3: Implement `tools/lib/cache.py`**

```python
"""File-based generation cache with manifest tracking.

Cache dir: tools/.cache/<generator_name>/
- batch_NNN.json — generated data per batch
- manifest.json — tracks batch state (generated/inserted/failed)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class GeneratorCache:
    """File-based cache for generator output with recovery support."""

    def __init__(self, generator_name: str, cache_dir: str = "tools/.cache"):
        self.name = generator_name
        self.base_dir = Path(cache_dir) / generator_name
        self.manifest_path = self.base_dir / "manifest.json"
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def read_manifest(self) -> dict:
        """Read or create manifest."""
        if self.manifest_path.exists():
            return json.loads(self.manifest_path.read_text())
        return {
            "generator": self.name,
            "started_at": self._now(),
            "batches": {},
        }

    def _save_manifest(self, manifest: dict):
        self.manifest_path.write_text(json.dumps(manifest, indent=2))

    def write_batch(self, batch_id: str, data: list[dict]):
        """Write batch data to cache file and update manifest."""
        batch_file = self.base_dir / f"{batch_id}.json"
        batch_file.write_text(json.dumps(data, indent=2))

        manifest = self.read_manifest()
        manifest["batches"][batch_id] = {
            "status": "generated",
            "item_count": len(data),
            "generated_at": self._now(),
        }
        self._save_manifest(manifest)

    def read_batch(self, batch_id: str) -> Optional[list[dict]]:
        """Read batch data from cache. Returns None if not found."""
        batch_file = self.base_dir / f"{batch_id}.json"
        if batch_file.exists():
            return json.loads(batch_file.read_text())
        return None

    def mark_batch(self, batch_id: str, status: str, error: str = None):
        """Update batch status in manifest."""
        manifest = self.read_manifest()
        if batch_id in manifest["batches"]:
            manifest["batches"][batch_id]["status"] = status
            if status == "inserted":
                manifest["batches"][batch_id]["inserted_at"] = self._now()
            if error:
                manifest["batches"][batch_id]["error"] = error
            self._save_manifest(manifest)

    def get_resumable(self) -> list[str]:
        """Return batch IDs that are generated but not inserted."""
        manifest = self.read_manifest()
        return [
            bid for bid, info in manifest["batches"].items()
            if info["status"] == "generated"
        ]

    def get_failed(self) -> list[str]:
        """Return batch IDs that failed."""
        manifest = self.read_manifest()
        return [
            bid for bid, info in manifest["batches"].items()
            if info["status"] == "failed"
        ]

    def get_inserted(self) -> list[str]:
        """Return batch IDs already inserted."""
        manifest = self.read_manifest()
        return [
            bid for bid, info in manifest["batches"].items()
            if info["status"] == "inserted"
        ]

    def clean(self):
        """Remove all cache files for this generator."""
        import shutil
        if self.base_dir.exists():
            shutil.rmtree(self.base_dir)
```

- [ ] **Step 4: Run tests — verify passing**

Run: `cd tools && python -m pytest tests/test_cache.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add tools/lib/cache.py tools/tests/test_cache.py
git commit -m "feat: add file-based generation cache with manifest tracking"
```

---

### Task 4: Base Generator Module

**Files:**
- Create: `tools/lib/base_generator.py`
- Create: `tools/tests/test_base_generator.py`

- [ ] **Step 1: Write failing tests for BaseGenerator**

Create `tools/tests/test_base_generator.py`:
```python
"""Tests for BaseGenerator abstract class and CLI orchestration."""
import pytest
import asyncio
from unittest.mock import MagicMock, patch
from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.cache import GeneratorCache


class MockGenerator(BaseGenerator):
    """Concrete test implementation."""
    name = "mock_gen"
    table = "test_table"
    default_batch_size = 10

    def get_missing_items(self, db):
        return [
            {"id": 1, "type": "creature", "name": "Wolf"},
            {"id": 2, "type": "creature", "name": "Bear"},
            {"id": 3, "type": "spirit", "name": "Wisp"},
        ]

    def build_prompt(self, batch, context):
        return f"Generate for {len(batch)} items"

    def python_fallback(self, batch, context):
        return [{"id": item["id"], "movement": "ground"} for item in batch]

    def validate(self, record, db):
        errors = []
        if "movement" not in record:
            errors.append("missing movement")
        return errors

    def get_group_key(self, item):
        return item.get("type", "default")


class TestCLIParsing:
    def test_parse_status_command(self):
        gen = MockGenerator()
        args = gen.parse_args(["status"])
        assert args.command == "status"

    def test_parse_generate_with_ai(self):
        gen = MockGenerator()
        args = gen.parse_args(["generate", "--ai", "--parallel", "4"])
        assert args.command == "generate"
        assert args.ai is True
        assert args.parallel == 4

    def test_parse_generate_no_insert(self):
        gen = MockGenerator()
        args = gen.parse_args(["generate", "--no-insert"])
        assert args.no_insert is True

    def test_parse_estimate(self):
        gen = MockGenerator()
        args = gen.parse_args(["generate", "--estimate"])
        assert args.estimate is True


class TestOrchestration:
    def test_python_fallback_generates_for_all_items(self, tmp_path):
        gen = MockGenerator()
        gen._cache = GeneratorCache("mock_gen", cache_dir=str(tmp_path))
        db = MagicMock()

        items = gen.get_missing_items(db)
        groups = gen._group_items(items)
        assert "creature" in groups
        assert "spirit" in groups
        assert len(groups["creature"]) == 2
        assert len(groups["spirit"]) == 1

    def test_python_fallback_validates(self, tmp_path):
        gen = MockGenerator()
        db = MagicMock()
        batch = [{"id": 1, "type": "creature", "name": "Wolf"}]
        results = gen.python_fallback(batch, {})
        for r in results:
            errors = gen.validate(r, db)
            assert len(errors) == 0

    def test_validation_catches_bad_records(self):
        gen = MockGenerator()
        db = MagicMock()
        errors = gen.validate({"id": 1}, db)  # missing "movement"
        assert len(errors) == 1
        assert "movement" in errors[0]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools && python -m pytest tests/test_base_generator.py -v`
Expected: ImportError

- [ ] **Step 3: Implement `tools/lib/base_generator.py`**

```python
"""Base generator class with CLI interface and orchestration.

All generators subclass BaseGenerator and implement:
- get_missing_items(db) → items to generate
- build_prompt(batch, context) → AI prompt string
- python_fallback(batch, context) → deterministic generation
- validate(record, db) → list of error strings
- get_group_key(item) → grouping key for hybrid batching
"""

import argparse
import asyncio
import sys
import time
from abc import ABC, abstractmethod
from typing import Any, Optional

from tools.generators.lib.ai_provider import AIProvider
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.cache import GeneratorCache


class BaseGenerator(ABC):
    """Abstract base for all generators."""

    name: str = ""
    table: str = ""
    default_batch_size: int = 50

    @abstractmethod
    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return items that need generation."""

    @abstractmethod
    def build_prompt(self, batch: list[dict], context: dict) -> str:
        """Build AI prompt for a batch."""

    @abstractmethod
    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        """Deterministic Python generation."""

    @abstractmethod
    def validate(self, record: dict, db: DBClient) -> list[str]:
        """Validate record. Return error strings (empty = valid)."""

    @abstractmethod
    def get_group_key(self, item: dict) -> str:
        """Grouping key for hybrid batching."""

    def get_context(self, db: DBClient) -> dict:
        """Load shared context (lookup tables, etc). Override if needed."""
        return {}

    def parse_args(self, argv: list[str] = None) -> argparse.Namespace:
        """Parse CLI arguments."""
        parser = argparse.ArgumentParser(
            description=f"{self.name} generator",
            prog=f"python tools/{self.name}.py",
        )
        sub = parser.add_subparsers(dest="command")

        sub.add_parser("status", help="Show populated vs missing counts")

        gen_parser = sub.add_parser("generate", help="Generate + validate + insert")
        gen_parser.add_argument("--ai", action="store_true", help="Use AI generation")
        gen_parser.add_argument("--ai-provider", choices=["claude", "gemini"])
        gen_parser.add_argument("--parallel", type=int, default=1)
        gen_parser.add_argument("--batch-size", type=int, default=self.default_batch_size)
        gen_parser.add_argument("--no-insert", action="store_true")
        gen_parser.add_argument("--resume", action="store_true")
        gen_parser.add_argument("--retry-errors", action="store_true")
        gen_parser.add_argument("--estimate", action="store_true")
        gen_parser.add_argument("--id", type=int, help="Generate for single ID")

        sub.add_parser("insert", help="Insert cached data into DB")
        sub.add_parser("validate", help="Validate cached data")

        exp_parser = sub.add_parser("export", help="Export as SQL")
        exp_parser.add_argument("--format", choices=["json", "sql"], default="sql")

        parser.add_argument("--clean-cache", action="store_true")

        return parser.parse_args(argv)

    def _group_items(self, items: list[dict]) -> dict[str, list]:
        """Group items by get_group_key."""
        groups: dict[str, list] = {}
        for item in items:
            key = self.get_group_key(item)
            groups.setdefault(key, []).append(item)
        return groups

    def run(self, argv: list[str] = None):
        """Main entry point."""
        args = self.parse_args(argv)

        if args.clean_cache:
            cache = GeneratorCache(self.name)
            cache.clean()
            print(f"[{self.name}] Cache cleaned.")
            return

        if not args.command:
            self.parse_args(["--help"])
            return

        if args.command == "status":
            self._cmd_status()
        elif args.command == "generate":
            asyncio.run(self._cmd_generate(args))
        elif args.command == "insert":
            self._cmd_insert()
        elif args.command == "validate":
            self._cmd_validate()
        elif args.command == "export":
            self._cmd_export(args.format)

    def _cmd_status(self):
        """Show populated vs missing counts."""
        db = DBClient()
        try:
            items = self.get_missing_items(db)
            total = db.count(self.table) + len(items) if self.table else len(items)
            populated = total - len(items)
            print(f"[{self.name}] {populated}/{total} populated, {len(items)} missing")
        finally:
            db.close()

    async def _cmd_generate(self, args):
        """Generate + validate + cache + insert."""
        db = DBClient()
        cache = GeneratorCache(self.name)
        ai = AIProvider() if args.ai else None

        try:
            context = self.get_context(db)

            # Get items to process
            if args.resume:
                # Re-insert generated, re-generate failed, continue rest
                resumable = cache.get_resumable()
                failed = cache.get_failed() if args.retry_errors else []
                items = self.get_missing_items(db)
                print(f"[{self.name}] Resuming: {len(resumable)} cached, "
                      f"{len(failed)} to retry, {len(items)} remaining")
            elif args.id:
                items = [i for i in self.get_missing_items(db) if i.get("id") == args.id]
                if not items:
                    print(f"[{self.name}] ID {args.id} not found or already populated")
                    return
            else:
                items = self.get_missing_items(db)

            if not items and not (args.resume and cache.get_resumable()):
                print(f"[{self.name}] Nothing to generate — all populated!")
                return

            # Estimate mode
            if args.estimate:
                groups = self._group_items(items)
                total_batches = sum(
                    -(-len(g) // args.batch_size) for g in groups.values()
                )
                print(f"[{self.name}] Estimate: {len(items)} items, "
                      f"{len(groups)} groups, {total_batches} batches "
                      f"(batch_size={args.batch_size}, parallel={args.parallel})")
                return

            # Generate
            groups = self._group_items(items)
            generated = 0
            inserted = 0
            failed = 0
            batch_num = 0

            for group_key, group_items in groups.items():
                for i in range(0, len(group_items), args.batch_size):
                    batch = group_items[i:i + args.batch_size]
                    batch_id = f"batch_{batch_num:04d}"
                    batch_num += 1

                    # Skip if already inserted (resume mode)
                    if batch_id in cache.get_inserted():
                        continue

                    # Generate
                    try:
                        if ai:
                            prompt = self.build_prompt(batch, context)
                            results = await ai.generate(prompt, {})
                            if not isinstance(results, list):
                                results = [results]
                        else:
                            results = self.python_fallback(batch, context)

                        # Validate
                        valid_results = []
                        for record in results:
                            errors = self.validate(record, db)
                            if errors:
                                print(f"  [WARN] Validation: {errors}", file=sys.stderr)
                                failed += 1
                            else:
                                valid_results.append(record)

                        # Cache
                        cache.write_batch(batch_id, valid_results)
                        generated += len(valid_results)

                        # Insert
                        if not args.no_insert and valid_results:
                            self._insert_results(db, valid_results)
                            cache.mark_batch(batch_id, "inserted")
                            inserted += len(valid_results)

                    except Exception as e:
                        cache.mark_batch(batch_id, "failed", error=str(e))
                        failed += len(batch)
                        print(f"  [ERROR] {batch_id}: {e}", file=sys.stderr)

            # Re-insert resumable batches
            if args.resume:
                for batch_id in cache.get_resumable():
                    data = cache.read_batch(batch_id)
                    if data and not args.no_insert:
                        self._insert_results(db, data)
                        cache.mark_batch(batch_id, "inserted")
                        inserted += len(data)

            print(f"\n[{self.name}] Done: {generated} generated, "
                  f"{inserted} inserted, {failed} failed")

        finally:
            db.close()

    def _insert_results(self, db: DBClient, results: list[dict]):
        """Insert generated results into DB. Override for custom insert logic."""
        if self.table:
            db.insert_batch(self.table, results)

    def _cmd_insert(self):
        """Insert all cached generated data."""
        db = DBClient()
        cache = GeneratorCache(self.name)
        try:
            resumable = cache.get_resumable()
            count = 0
            for batch_id in resumable:
                data = cache.read_batch(batch_id)
                if data:
                    self._insert_results(db, data)
                    cache.mark_batch(batch_id, "inserted")
                    count += len(data)
            print(f"[{self.name}] Inserted {count} records from {len(resumable)} batches")
        finally:
            db.close()

    def _cmd_validate(self):
        """Validate all cached data."""
        db = DBClient()
        cache = GeneratorCache(self.name)
        try:
            manifest = cache.read_manifest()
            total = 0
            errors = 0
            for batch_id in manifest.get("batches", {}):
                data = cache.read_batch(batch_id)
                if data:
                    for record in data:
                        total += 1
                        errs = self.validate(record, db)
                        if errs:
                            errors += 1
                            print(f"  {batch_id}: {errs}")
            print(f"[{self.name}] Validated {total} records, {errors} with errors")
        finally:
            db.close()

    def _cmd_export(self, fmt: str):
        """Export cached data as SQL or JSON."""
        cache = GeneratorCache(self.name)
        manifest = cache.read_manifest()
        all_data = []
        for batch_id in manifest.get("batches", {}):
            data = cache.read_batch(batch_id)
            if data:
                all_data.extend(data)

        if fmt == "json":
            import json
            print(json.dumps(all_data, indent=2))
        else:
            # SQL INSERT statements
            if not all_data:
                print(f"-- No data to export for {self.name}")
                return
            for row in all_data:
                cols = ", ".join(row.keys())
                vals = ", ".join(
                    f"'{v}'" if isinstance(v, str) else str(v)
                    for v in row.values()
                )
                print(f"INSERT INTO {self.table} ({cols}) VALUES ({vals});")
```

- [ ] **Step 4: Run tests — verify passing**

Run: `cd tools && python -m pytest tests/test_base_generator.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add tools/lib/base_generator.py tools/tests/test_base_generator.py
git commit -m "feat: add BaseGenerator with CLI, orchestration, and progress"
```

---

### Task 5: Add `.gitignore` entry + update `tools/lib/__init__.py`

**Files:**
- Modify: `.gitignore`
- Modify: `tools/lib/__init__.py`

- [ ] **Step 1: Add cache dir to .gitignore**

Append to `.gitignore`:
```
# Generator cache
tools/.cache/
tools/.env
```

- [ ] **Step 2: Fix `tools/lib/__init__.py` imports** (lazy imports to avoid circular)

```python
"""Generator framework library.

Modules:
    ai_provider — AI CLI routing (Claude/Gemini)
    db_client — Database connection and CRUD
    base_generator — BaseGenerator ABC with CLI
    cache — File-based recovery cache
"""
```

- [ ] **Step 3: Run full framework test suite**

Run: `cd tools && python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add .gitignore tools/lib/__init__.py
git commit -m "chore: add generator cache to gitignore, clean up lib init"
```

---

## Phase 2: Core Data Generators

### Task 6: Atmosphere Assignment Script (§8)

**Files:**
- Create: `tools/assign_atmospheres.py`

This is a standalone one-shot script, NOT a BaseGenerator subclass (it's a simple assignment, not a generation pipeline).

- [ ] **Step 1: Implement `tools/assign_atmospheres.py`**

The script should:
1. Query all 21 atmospheres with descriptions from DB
2. Query all 138 chapters with titles + book_id
3. Query all 3 books
4. Query all 449 locations
5. AI mode: Send chapter list + atmosphere list → AI returns best-match assignments
6. Python fallback: Round-robin from 13 non-boss archetypes by book + chapter position
7. UPDATE chapters SET atmosphere_id, UPDATE books SET atmosphere_id, UPDATE locations SET archetype_id
8. Print summary of assignments

CLI: `python tools/assign_atmospheres.py [--ai] [--dry-run]`

- [ ] **Step 2: Test with `--dry-run` to verify logic**

Run: `python tools/assign_atmospheres.py --dry-run`
Expected: Prints proposed assignments without modifying DB

- [ ] **Step 3: Commit**

```bash
git add tools/assign_atmospheres.py
git commit -m "feat: add atmosphere assignment script for chapters/books/locations"
```

---

### Task 7: Entity Family Seeder (§2)

**Files:**
- Create: `tools/seed_entity_families.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

Key implementation details:
- `get_missing_items()`: Query entities WHERE entity_family_id IS NULL
- `get_context()`: Load entity_types lookup, load entity_families lookup (after seeding)
- Two-phase: First seed `entity_families` table (10 canonical rows), then classify entities
- `python_fallback()`: entity_type → default family mapping + name keyword overrides
- `build_prompt()`: "Classify these {N} entities into families: [list]"
- `validate()`: family must be one of the 10 canonical names
- `_insert_results()`: UPDATE entities SET entity_family_id = ? WHERE id = ?
- `get_group_key()`: entity_type_id

- [ ] **Step 2: Test with status command**

Run: `python tools/seed_entity_families.py status`
Expected: Shows 0/3936 populated

- [ ] **Step 3: Test Python fallback with 5 entities**

Run: `python tools/seed_entity_families.py generate --batch-size 5`
Expected: Seeds families table, classifies 5 entities

- [ ] **Step 4: Commit**

```bash
git add tools/seed_entity_families.py
git commit -m "feat: add entity family seeder with type-based classification"
```

---

### Task 8: Entity Gameplay Data Generator (§1)

**Files:**
- Create: `tools/generate_entity_gameplay.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

Key implementation details:
- `get_missing_items()`: Query entities LEFT JOIN entity_gameplay_data WHERE eg.id IS NULL. Include entity name, description, entity_type, chapter context.
- `get_context()`: Load all lookup tables (movement_types, size_classes, animation_styles, silhouette_types, attack_types)
- `python_fallback()`: Type-based defaults per spec §1 table. Random colors within dark-fantasy chapter palettes.
- `build_prompt()`: Include entity names, descriptions, entity_type, chapter mood. Request JSON array with all visual fields.
- `validate()`: All FK IDs exist in lookup tables. Colors valid hex. Primary attack required.
- `get_group_key()`: entity_type name
- `default_batch_size`: 30

- [ ] **Step 2: Test status**

Run: `python tools/generate_entity_gameplay.py status`

- [ ] **Step 3: Test Python fallback with 5 entities**

Run: `python tools/generate_entity_gameplay.py generate --batch-size 5`

- [ ] **Step 4: Commit**

```bash
git add tools/generate_entity_gameplay.py
git commit -m "feat: add entity gameplay data generator with visual FK population"
```

---

### Task 9: Difficulty Preset Capture (§12)

**Files:**
- Create: `tools/capture_difficulty_preset.py`

- [ ] **Step 1: Implement as standalone script** (not BaseGenerator — no generation needed)

Steps:
1. Connect to DB, read all game_configs rows → build config_snapshot JSONB
2. Import DEFAULT_CONFIGS from tools/sim/config.py → "Original" preset
3. Current live values → "Balanced" preset, is_active=true
4. Link difficulty_curve_id=1, wave_preset_id=NULL
5. INSERT INTO difficulty_presets
6. Export as seed SQL

CLI: `python tools/capture_difficulty_preset.py [--export-sql] [--dry-run]`

- [ ] **Step 2: Test with dry-run**

Run: `python tools/capture_difficulty_preset.py --dry-run`

- [ ] **Step 3: Commit**

```bash
git add tools/capture_difficulty_preset.py
git commit -m "feat: add difficulty preset capture from live game_configs"
```

---

## Phase 3: Visual Asset Generators

### Task 10: Entity Sprite Generator (§3)

**Files:**
- Create: `tools/generate_entity_sprites.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: entity_gameplay_data WHERE sprite_key IS NULL, JOIN entities for name/description
- `get_context()`: Load silhouette_types, size_classes, animation_styles
- `python_fallback()`: 6 template SVG paths per silhouette_type, color application, size scaling, animation keyframes
- `build_prompt()`: "Generate unique SVG silhouette paths for these entities..."
- `validate()`: SVG path non-empty, scale 0.2-3.0, colors present
- `_insert_results()`: UPDATE entity_gameplay_data SET sprite_key, INSERT into asset_registry
- `get_group_key()`: silhouette_type name
- `default_batch_size`: 20

- [ ] **Step 2: Test Python fallback with 5 entities**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_entity_sprites.py
git commit -m "feat: add entity sprite generator with SVG silhouettes"
```

---

### Task 11: Item Sprite Generator (§4)

**Files:**
- Create: `tools/generate_item_sprites.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- Target: asset_registry entries for paper doll + inventory
- `get_missing_items()`: item_type_bases combinations lacking asset_registry entries
- `python_fallback()`: Template shapes per gear_slot, armor_class palette, rarity overlay
- `get_group_key()`: armor_class name
- `default_batch_size`: 10

- [ ] **Step 2: Test Python fallback**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_item_sprites.py
git commit -m "feat: add item sprite generator for paper doll and inventory"
```

---

### Task 12: Projectile Sprite Generator (§5)

**Files:**
- Create: `tools/generate_projectile_sprites.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: attack_types WHERE projectile_sprite_key IS NULL AND attack_animation_type != 'melee_swing'
- `python_fallback()`: Template projectiles per type (arrow, bolt, orb, beam, wave)
- `get_group_key()`: attack_animation_type

- [ ] **Step 2: Test Python fallback**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_projectile_sprites.py
git commit -m "feat: add projectile sprite generator per attack type"
```

---

### Task 13: Attack Type Visual Population (§9)

**Files:**
- Create: `tools/populate_attack_visuals.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- Target: attack_types (13 rows) — fill projectile_color, trail_type, impact_effect
- Tiny scope — single AI call or simple Python mapping
- `_insert_results()`: UPDATE attack_types SET ... WHERE id = ?

- [ ] **Step 2: Test Python fallback on all 13 rows**
- [ ] **Step 3: Commit**

```bash
git add tools/populate_attack_visuals.py
git commit -m "feat: add attack type visual population for 13 attack types"
```

---

### Task 14: Background Parallax Generator (§6)

**Files:**
- Create: `tools/generate_backgrounds.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: chapters that don't have a backgrounds row
- `python_fallback()`: Gradient layers per book mood palette
- `get_group_key()`: book_id

- [ ] **Step 2: Test Python fallback**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_backgrounds.py
git commit -m "feat: add background parallax generator per chapter"
```

---

## Phase 4: Scene Composition

### Task 15: Scene Generator (§7)

**Files:**
- Create: `tools/generate_scene_data.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

Two targets:
1. `scene_gameplay_data` — create missing rows + assign atmosphere_id, background_id
2. `scene_wave_configs` — default wave population

- `get_missing_items()`: scenes LEFT JOIN scene_gameplay_data WHERE sgd.id IS NULL, plus scenes with NULL atmosphere_id
- `python_fallback()`: atmosphere = chapter atmosphere, background = chapter background. Waves scale with position.
- `_insert_results()`: INSERT scene_gameplay_data + INSERT scene_wave_configs

- [ ] **Step 2: Test Python fallback**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_scene_data.py
git commit -m "feat: add scene generator for atmosphere/background/wave assignment"
```

---

## Phase 5: Content & Polish Generators

### Task 16: Lore-to-Content Generator (§14)

**Files:**
- Create: `tools/generate_lore_content.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: entities WHERE base_description IS NULL
- `python_fallback()`: Template descriptions by entity_type
- `build_prompt()`: Include entity name + chapter context + lore reference → generate description, emotional state, sounds, smells
- `_insert_results()`: UPDATE entities SET base_description, base_emotional_state, etc.

- [ ] **Step 2: Test Python fallback with 5 entities**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_lore_content.py
git commit -m "feat: add lore-to-content generator for entity descriptions"
```

---

### Task 17: Boss Transition Lore Text Generator (§15)

**Files:**
- Create: `tools/generate_boss_lore.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: chapters + books WHERE transition_lore_text IS NULL
- `python_fallback()`: Template congratulatory text
- `_insert_results()`: UPDATE chapters/books SET transition_lore_text

- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_boss_lore.py
git commit -m "feat: add boss transition lore text generator"
```

---

### Task 18: Achievement Icon Generator (§10)

**Files:**
- Create: `tools/generate_achievement_icons.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: achievements WHERE icon_sprite_key = 'achievement_default'
- `python_fallback()`: Template SVG icons per category
- `_insert_results()`: UPDATE achievements SET icon_sprite_key, INSERT asset_registry
- `get_group_key()`: category

- [ ] **Step 2: Test Python fallback**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_achievement_icons.py
git commit -m "feat: add achievement icon generator per category"
```

---

### Task 19: Curated Artifact Icon Generator (§11)

**Files:**
- Create: `tools/generate_artifact_icons.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

Same pattern as §10 but for curated_artifacts.

- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_artifact_icons.py
git commit -m "feat: add curated artifact icon generator"
```

---

### Task 20: Extended Music Loop Generator (§13)

**Files:**
- Create: `tools/generate_extended_music.py`

- [ ] **Step 1: Implement as BaseGenerator subclass**

- `get_missing_items()`: atmospheres where music_definitions sequences are < 2 minutes
- `python_fallback()`: Procedural loop extension (transposition, counter-melodies, variation)
- `_insert_results()`: UPDATE atmospheres SET music_definitions

- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**

```bash
git add tools/generate_extended_music.py
git commit -m "feat: add extended music loop generator for 2-3 minute compositions"
```

---

## Phase 6: Verification

### Task 21: Content Scanner (§17)

**Files:**
- Create: `tools/scan_content_gaps.py`

- [ ] **Step 1: Implement as standalone script** (not BaseGenerator — it reads, not generates)

Scans:
- entities without entity_gameplay_data → missing_stat
- scenes without entity assignments → missing_entity
- chapters without atmosphere → missing_atmosphere
- chapters/books without transition_lore_text → missing_lore_text
- entities without sprite_key → missing_sprite
- entities without death_sfx_key → missing_sfx
- skills without activate_sfx_key → missing_sfx

Uses `dev_content_audit` table + `log_content_audit()` service.

CLI: `python tools/scan_content_gaps.py [--verbose]`

- [ ] **Step 2: Test**
- [ ] **Step 3: Commit**

```bash
git add tools/scan_content_gaps.py
git commit -m "feat: add proactive content scanner for DB gap detection"
```

---

## Phase 7: User Acceptance Testing & Documentation

### Task 22: DB Backup

- [ ] **Step 1: Take pre-UAT DB snapshot**

```bash
python tools/db_dump_restore.py dump --tag pre-uat-2026-03-23
```

- [ ] **Step 2: Verify backup exists and is restorable**

---

### Task 23: AI Agent Smoke Test (5 Items Per Generator)

- [ ] **Step 1: Run each generator in phase order with `--batch-size 5`**

```bash
# Phase 2
python tools/assign_atmospheres.py --ai
python tools/seed_entity_families.py generate --ai --batch-size 5
python tools/generate_entity_gameplay.py generate --ai --batch-size 5
python tools/capture_difficulty_preset.py

# Phase 3
python tools/generate_entity_sprites.py generate --ai --batch-size 5
python tools/generate_item_sprites.py generate --ai --batch-size 5
python tools/generate_projectile_sprites.py generate --ai --batch-size 5
python tools/populate_attack_visuals.py generate --ai
python tools/generate_backgrounds.py generate --ai --batch-size 5

# Phase 4
python tools/generate_scene_data.py generate --ai --batch-size 5

# Phase 5
python tools/generate_lore_content.py generate --ai --batch-size 5
python tools/generate_boss_lore.py generate --ai --batch-size 5
python tools/generate_achievement_icons.py generate --ai --batch-size 5
python tools/generate_artifact_icons.py generate --ai --batch-size 5
python tools/generate_extended_music.py generate --ai --batch-size 5
```

- [ ] **Step 2: Validate each generator's output**

```bash
python tools/generate_entity_gameplay.py validate
# ... repeat for each generator
```

- [ ] **Step 3: Run content scanner to check remaining gaps**

```bash
python tools/scan_content_gaps.py --verbose
```

---

### Task 24: Entity Family Full Classification

- [ ] **Step 1: Run full entity family classification with parallel subagents**

```bash
python tools/seed_entity_families.py generate --ai --parallel 4
```

This classifies all ~3,936 entities. Verify with:
```bash
python tools/seed_entity_families.py status
```
Expected: 3936/3936 populated

---

### Task 25: Uniqueness & Lore Validation

- [ ] **Step 1: Query generated data and verify uniqueness**

Check no duplicate visual configs, colors, sprite_keys across generated entities.

- [ ] **Step 2: Verify lore appropriateness**

Cross-reference generated colors/silhouettes against entity descriptions and chapter mood. Dark entities should have dark colors, celestial entities should have bright/gold colors, etc.

---

### Task 26: Visual Review

- [ ] **Step 1: Render generated assets in browser**

Use Chrome DevTools MCP or Playwright to navigate to combat surfaces and verify:
- Entity sprites render correctly with generated silhouettes/colors
- Paper doll equipment renders per armor class
- Attack animations play with generated projectiles
- Background parallax layers display per chapter

- [ ] **Step 2: Screenshot results for review**

---

### Task 27: Generate Documentation

**Files:**
- Create: `docs/inst/GENERATOR_INSTRUCTIONS.md`
- Create: `docs/inst/GENERATOR_AI_RULES.md`

- [ ] **Step 1: Write GENERATOR_INSTRUCTIONS.md**

Contents:
- Setup instructions (AI CLI config, DB connection, dependencies, `pip install` requirements)
- Generator-by-generator usage guide with examples
- Execution order (phase dependencies diagram)
- Troubleshooting (common errors, recovery, cache management)
- Configuration reference

- [ ] **Step 2: Write GENERATOR_AI_RULES.md**

Contents:
- Complete AI agent prompt for full asset population
- Phase sequence with dependency graph
- Subagent dispatch strategy (parallel by entity_type for families, parallel by phase for independent generators)
- DB queries for completeness verification
- Success criteria: `scan_content_gaps.py` returns 0 gaps
- Test result validation checklist
- Error recovery procedures

- [ ] **Step 3: Commit docs**

```bash
git add docs/inst/GENERATOR_INSTRUCTIONS.md docs/inst/GENERATOR_AI_RULES.md
git commit -m "docs: add GENERATOR_INSTRUCTIONS.md and GENERATOR_AI_RULES.md"
```

---

### Task 28: Final Commit & Update TODO

- [ ] **Step 1: Update docs/TODO.md** — check off completed generator items
- [ ] **Step 2: Update docs/SESSION_STATE.md** — reflect new state
- [ ] **Step 3: Final commit**

```bash
git add docs/TODO.md docs/SESSION_STATE.md
git commit -m "docs: update TODO and SESSION_STATE for generator pipeline completion"
```

---

## Summary

| Phase | Tasks | Generators |
|-------|-------|-----------|
| 1: Framework | 1-5 | ai_provider, db_client, base_generator, cache |
| 2: Core Data | 6-9 | atmospheres, families, gameplay data, difficulty |
| 3: Visual Assets | 10-14 | entity/item/projectile sprites, attack visuals, backgrounds |
| 4: Scene Composition | 15 | scene data + wave configs |
| 5: Content & Polish | 16-20 | lore content, boss lore, achievement/artifact icons, music |
| 6: Verification | 21 | content scanner |
| 7: UAT & Docs | 22-28 | DB backup, smoke test, classification, validation, visual review, docs |

**Total: 28 tasks across 7 phases**

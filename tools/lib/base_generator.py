"""
tools/lib/base_generator.py

BaseGenerator — ABC that all 16+ content generators subclass.

Provides:
  - CLI interface (argparse): status | generate | insert | validate | export | --clean-cache
  - Orchestration flow: get_missing → group → generate (AI or fallback) → validate → cache → insert
  - Progress reporting to stdout/stderr
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from lib.cache import GeneratorCache
from lib.db_client import DBClient


class BaseGenerator(ABC):
    # ------------------------------------------------------------------
    # Class-level configuration — override in each subclass
    # ------------------------------------------------------------------
    name: str = ""
    table: str = ""
    default_batch_size: int = 50

    # Internal: allow tests to override cache root without monkey-patching.
    _cache_dir: str = "tools/.cache"

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @abstractmethod
    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return items that still need content generated."""
        ...

    @abstractmethod
    def build_prompt(self, batch: list[dict], context: dict) -> str:
        """Build the AI prompt for a single batch."""
        ...

    @abstractmethod
    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        """Deterministic fallback when AI is unavailable."""
        ...

    @abstractmethod
    def validate(self, record: dict, db: DBClient) -> list[str]:
        """Return a list of validation error strings (empty = valid)."""
        ...

    @abstractmethod
    def get_group_key(self, item: dict) -> str:
        """Return the grouping key for an item (e.g. entity type)."""
        ...

    # ------------------------------------------------------------------
    # Optional hook — subclasses may override
    # ------------------------------------------------------------------

    def get_context(self, db: DBClient) -> dict:
        """Return shared context dict passed to build_prompt / python_fallback."""
        return {}

    # ------------------------------------------------------------------
    # CLI
    # ------------------------------------------------------------------

    def parse_args(self, argv=None) -> argparse.Namespace:
        parser = argparse.ArgumentParser(
            prog=self.name or self.__class__.__name__,
            description=f"Generator: {self.name}",
        )
        parser.add_argument(
            "--clean-cache",
            action="store_true",
            default=False,
            help="Delete the local cache for this generator and exit.",
        )

        sub = parser.add_subparsers(dest="command")

        # --- status ---
        sub.add_parser("status", help="Print populated/missing counts.")

        # --- generate ---
        gen_p = sub.add_parser("generate", help="Run generation pipeline.")
        gen_p.add_argument("--ai", action="store_true", default=False,
                           help="Use AI provider instead of python fallback.")
        gen_p.add_argument("--parallel", type=int, default=1,
                           help="Number of concurrent AI requests.")
        gen_p.add_argument("--batch-size", type=int, default=self.default_batch_size,
                           dest="batch_size", help="Items per AI call.")
        gen_p.add_argument("--no-insert", action="store_true", default=False,
                           dest="no_insert", help="Generate and cache but skip DB insert.")
        gen_p.add_argument("--resume", action="store_true", default=False,
                           help="Re-insert cached 'generated' batches; skip generation.")
        gen_p.add_argument("--retry-errors", action="store_true", default=False,
                           dest="retry_errors", help="Retry previously-failed batches.")
        gen_p.add_argument("--estimate", action="store_true", default=False,
                           help="Print batch/group breakdown and exit without generating.")
        gen_p.add_argument("--id", type=int, default=None,
                           help="Generate for a single item ID only.")

        # --- insert ---
        sub.add_parser("insert", help="Insert cached batches into the DB.")

        # --- validate ---
        sub.add_parser("validate", help="Validate all cached data.")

        # --- export ---
        exp_p = sub.add_parser("export", help="Export cached data.")
        exp_p.add_argument("--format", choices=["sql", "json"], default="json",
                           dest="format", help="Output format.")

        return parser.parse_args(argv)

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def run(self, argv=None):
        args = self.parse_args(argv)

        if args.clean_cache:
            self._get_cache().clean()
            print(f"[{self.name}] Cache cleared.")
            return

        cmd = args.command
        if cmd == "status":
            self._cmd_status()
        elif cmd == "generate":
            asyncio.run(self._cmd_generate(args))
        elif cmd == "insert":
            self._cmd_insert()
        elif cmd == "validate":
            self._cmd_validate()
        elif cmd == "export":
            self._cmd_export(args.format)
        else:
            print("No command given. Use --help.", file=sys.stderr)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_cache(self) -> GeneratorCache:
        return GeneratorCache(self.name, self._cache_dir)

    def _group_items(self, items: list[dict]) -> dict[str, list]:
        groups: dict[str, list] = {}
        for item in items:
            key = self.get_group_key(item)
            groups.setdefault(key, []).append(item)
        return groups

    def _split_batches(self, items: list[dict], batch_size: int) -> list[list[dict]]:
        return [items[i: i + batch_size] for i in range(0, len(items), batch_size)]

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    def _cmd_status(self):
        db = DBClient()
        try:
            missing = self.get_missing_items(db)
            print(f"[{self.name}] Missing items: {len(missing)}")
        finally:
            db.close()

    async def _cmd_generate(self, args):
        """
        Main orchestration:
          get_missing → (--estimate: print and exit)
                      → (--resume: re-insert cached batches, skip generation)
                      → group → split batches → for each batch:
                            generate (AI or fallback) → validate → cache → insert
        """
        cache = self._get_cache()
        db = DBClient()

        try:
            context = self.get_context(db)
            missing = self.get_missing_items(db)

            # Filter to single ID if requested
            if args.id is not None:
                missing = [item for item in missing if item.get("id") == args.id]

            groups = self._group_items(missing)

            # --- --estimate: print breakdown and exit ---
            if args.estimate:
                total_batches = 0
                print(f"[{self.name}] Estimate:")
                for group_key, group_items in groups.items():
                    n_batches = (len(group_items) + args.batch_size - 1) // args.batch_size
                    total_batches += n_batches
                    print(f"  Group '{group_key}': {len(group_items)} items → {n_batches} batch(es)")
                print(f"  Total: {len(missing)} items, {total_batches} batch(es)")
                return

            # --- --resume: re-insert already-cached batches ---
            if args.resume:
                self._cmd_insert()
                return

            # --- Main generation loop ---
            batch_num = 0
            sem = asyncio.Semaphore(max(1, args.parallel))

            async def process_batch(batch_id: str, batch: list[dict]):
                async with sem:
                    # Generate
                    if args.ai:
                        from lib.ai_provider import AIProvider
                        ai = AIProvider()
                        prompt = self.build_prompt(batch, context)
                        try:
                            results = await ai.generate(prompt, schema={})
                            if not isinstance(results, list):
                                results = [results]
                        except Exception as exc:
                            print(f"[{self.name}] AI failed for {batch_id}: {exc}. Using fallback.",
                                  file=sys.stderr)
                            results = self.python_fallback(batch, context)
                    else:
                        results = self.python_fallback(batch, context)

                    # Resolve AI name fields to IDs (if subclass implements it)
                    if args.ai and hasattr(self, 'resolve_ai_record'):
                        results = [self.resolve_ai_record(r, context) for r in results]

                    # Validate
                    valid_results = []
                    for record in results:
                        errors = self.validate(record, db)
                        if errors:
                            print(f"[{self.name}] Validation errors in {batch_id}: {errors}",
                                  file=sys.stderr)
                        else:
                            valid_results.append(record)

                    # Cache
                    cache.write_batch(batch_id, valid_results)
                    print(f"[{self.name}] Cached {batch_id} ({len(valid_results)} records)")

                    # Insert
                    if not args.no_insert:
                        try:
                            self._insert_results(db, valid_results)
                            cache.mark_batch(batch_id, "inserted")
                            print(f"[{self.name}] Inserted {batch_id}")
                        except Exception as exc:
                            cache.mark_batch(batch_id, "failed", error=str(exc))
                            print(f"[{self.name}] Insert failed for {batch_id}: {exc}",
                                  file=sys.stderr)

            tasks = []
            for group_key, group_items in groups.items():
                batches = self._split_batches(group_items, args.batch_size)
                for batch in batches:
                    batch_num += 1
                    batch_id = f"{group_key}_batch_{batch_num:04d}"
                    tasks.append(process_batch(batch_id, batch))

            await asyncio.gather(*tasks)
            print(f"[{self.name}] Generation complete. {batch_num} batch(es) processed.")

        finally:
            db.close()

    def _insert_results(self, db: DBClient, results: list[dict]):
        """Default insert: bulk-insert all records into self.table."""
        db.insert_batch(self.table, results)

    def _cmd_insert(self):
        """Insert all cached 'generated' batches into the DB."""
        cache = self._get_cache()
        db = DBClient()
        try:
            resumable = cache.get_resumable()
            if not resumable:
                print(f"[{self.name}] No resumable batches found.")
                return
            for batch_id in resumable:
                data = cache.read_batch(batch_id)
                if data is None:
                    print(f"[{self.name}] Batch file missing for {batch_id}", file=sys.stderr)
                    continue
                try:
                    self._insert_results(db, data)
                    cache.mark_batch(batch_id, "inserted")
                    print(f"[{self.name}] Inserted {batch_id} ({len(data)} records)")
                except Exception as exc:
                    cache.mark_batch(batch_id, "failed", error=str(exc))
                    print(f"[{self.name}] Failed to insert {batch_id}: {exc}", file=sys.stderr)
        finally:
            db.close()

    def _cmd_validate(self):
        """Validate all cached batches and report errors."""
        cache = self._get_cache()
        db = DBClient()
        try:
            manifest = cache.read_manifest()
            total = 0
            errors_found = 0
            for batch_id in manifest.get("batches", {}):
                data = cache.read_batch(batch_id)
                if data is None:
                    continue
                for record in data:
                    total += 1
                    errors = self.validate(record, db)
                    if errors:
                        errors_found += 1
                        print(f"[{self.name}] {batch_id} record {record.get('id', '?')}: {errors}",
                              file=sys.stderr)
            print(f"[{self.name}] Validated {total} records. {errors_found} error(s).")
        finally:
            db.close()

    def _cmd_export(self, fmt: str):
        """Export all cached batches as SQL INSERT statements or JSON."""
        cache = self._get_cache()
        manifest = cache.read_manifest()
        all_records: list[dict] = []

        for batch_id in manifest.get("batches", {}):
            data = cache.read_batch(batch_id)
            if data:
                all_records.extend(data)

        if fmt == "json":
            print(json.dumps(all_records, indent=2))
        elif fmt == "sql":
            for record in all_records:
                columns = ", ".join(record.keys())
                values_parts = []
                for v in record.values():
                    if v is None:
                        values_parts.append("NULL")
                    elif isinstance(v, bool):
                        values_parts.append("TRUE" if v else "FALSE")
                    elif isinstance(v, (int, float)):
                        values_parts.append(str(v))
                    else:
                        # Escape single quotes by doubling them
                        escaped = str(v).replace("'", "''")
                        values_parts.append(f"'{escaped}'")
                values = ", ".join(values_parts)
                print(f"INSERT INTO {self.table} ({columns}) VALUES ({values});")

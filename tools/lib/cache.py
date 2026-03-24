"""GeneratorCache — file-based generation cache with manifest tracking."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class GeneratorCache:
    def __init__(self, generator_name: str, cache_dir: str = "tools/.cache"):
        self.generator_name = generator_name
        self.cache_path = Path(cache_dir) / generator_name
        self.cache_path.mkdir(parents=True, exist_ok=True)
        self._manifest_path = self.cache_path / "manifest.json"

    # ------------------------------------------------------------------
    # Manifest helpers
    # ------------------------------------------------------------------

    def read_manifest(self) -> dict:
        """Read existing manifest or create a fresh one."""
        if self._manifest_path.exists():
            return json.loads(self._manifest_path.read_text(encoding="utf-8"))
        manifest = {
            "generator": self.generator_name,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "batches": {},
        }
        self._write_manifest(manifest)
        return manifest

    def _write_manifest(self, manifest: dict) -> None:
        self._manifest_path.write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )

    # ------------------------------------------------------------------
    # Batch I/O
    # ------------------------------------------------------------------

    def write_batch(self, batch_id: str, data: list[dict]) -> None:
        """Write batch data to JSON and mark status='generated' in manifest."""
        batch_file = self.cache_path / f"{batch_id}.json"
        batch_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

        manifest = self.read_manifest()
        manifest["batches"][batch_id] = {
            "status": "generated",
            "item_count": len(data),
        }
        self._write_manifest(manifest)

    def read_batch(self, batch_id: str) -> Optional[list[dict]]:
        """Return batch data, or None if the file doesn't exist."""
        batch_file = self.cache_path / f"{batch_id}.json"
        if not batch_file.exists():
            return None
        return json.loads(batch_file.read_text(encoding="utf-8"))

    # ------------------------------------------------------------------
    # Status tracking
    # ------------------------------------------------------------------

    def mark_batch(self, batch_id: str, status: str, error: str = None) -> None:
        """Update a batch's status in the manifest.

        'inserted' → adds inserted_at timestamp.
        'failed'   → adds error message.
        """
        manifest = self.read_manifest()
        entry = manifest["batches"].setdefault(batch_id, {})
        entry["status"] = status

        if status == "inserted":
            entry["inserted_at"] = datetime.now(timezone.utc).isoformat()
        elif status == "failed" and error is not None:
            entry["error"] = error

        self._write_manifest(manifest)

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def _batches_with_status(self, status: str) -> list[str]:
        manifest = self.read_manifest()
        return [
            bid
            for bid, meta in manifest["batches"].items()
            if meta.get("status") == status
        ]

    def get_resumable(self) -> list[str]:
        """Batch IDs with status='generated' (generated but not yet inserted)."""
        return self._batches_with_status("generated")

    def get_failed(self) -> list[str]:
        """Batch IDs with status='failed'."""
        return self._batches_with_status("failed")

    def get_inserted(self) -> list[str]:
        """Batch IDs with status='inserted'."""
        return self._batches_with_status("inserted")

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def clean(self) -> None:
        """Remove the entire cache directory for this generator."""
        shutil.rmtree(self.cache_path, ignore_errors=True)

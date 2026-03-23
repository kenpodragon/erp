"""
tools/lib/ai_provider.py

Routes AI generation requests to CLI tools (claude / gemini) via subprocess.
Config is loaded from env file, falling back to os.environ, then defaults.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Callable, Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_env_file(path: str) -> dict:
    """Parse a .env file into a dict. Returns {} if file missing or unreadable."""
    try:
        from dotenv import dotenv_values  # type: ignore
        return dict(dotenv_values(path))
    except ImportError:
        pass
    # Fallback: manual parse
    result = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                result[key.strip()] = val.strip().strip('"').strip("'")
    except (OSError, FileNotFoundError):
        pass
    return result


def _locate_env_file(provided: Optional[str]) -> Optional[str]:
    """Return an env file path to load, searching tools/.env then backend/.env."""
    if provided:
        return provided
    here = Path(__file__).parent.parent  # tools/
    for candidate in [here / ".env", here.parent / "backend" / ".env"]:
        if candidate.exists():
            return str(candidate)
    return None


# ---------------------------------------------------------------------------
# AIProvider
# ---------------------------------------------------------------------------

class AIProvider:
    """Routes generation requests to AI CLI tools (claude/gemini)."""

    DEFAULT_PROVIDER = "claude"
    DEFAULT_FALLBACK = "gemini"
    DEFAULT_MODEL = "claude-sonnet-4-6"
    DEFAULT_TIMEOUT = 120
    DEFAULT_MAX_RETRIES = 3

    def __init__(self, env_file: str = None):
        """Load config from tools/.env, backend/.env, or os.environ."""
        env_path = _locate_env_file(env_file)
        file_vals = _load_env_file(env_path) if env_path else {}

        def _get(key: str, default):
            return file_vals.get(key) or os.environ.get(key) or default

        self.provider: str = _get("AI_CLI_PROVIDER", self.DEFAULT_PROVIDER)
        self.fallback_provider: str = _get("AI_CLI_PROVIDER_FALLBACK", self.DEFAULT_FALLBACK)
        self.model: str = _get("AI_CLI_MODEL", self.DEFAULT_MODEL)
        self.timeout: int = int(_get("AI_CLI_TIMEOUT", self.DEFAULT_TIMEOUT))
        self.max_retries: int = int(_get("AI_CLI_MAX_RETRIES", self.DEFAULT_MAX_RETRIES))

        # Internal failure tracking for auto-fallback
        self._consecutive_failures: int = 0
        self._using_fallback: bool = False

    # ------------------------------------------------------------------
    # Command building
    # ------------------------------------------------------------------

    def _build_command(self, provider: str, prompt: str) -> list:
        """Build CLI command list for the given provider."""
        return [provider, "-p", prompt, "--output-format", "json"]

    # ------------------------------------------------------------------
    # Core generation
    # ------------------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        schema: dict,
        provider_name: str = None,
    ) -> Any:
        """
        Single generation. Spawns CLI subprocess, parses JSON stdout.
        Retries with exponential backoff (2s, 4s, 8s).
        Auto-fallbacks to secondary after max_retries consecutive failures.
        """
        # Determine which provider to use
        if provider_name:
            active = provider_name
        elif self._consecutive_failures >= self.max_retries:
            active = self.fallback_provider
            self._using_fallback = True
        else:
            active = self.provider

        last_error: Exception = None

        for attempt in range(self.max_retries):
            try:
                result = await self._run_once(active, prompt)
                # Success — reset failure counter
                self._consecutive_failures = 0
                self._using_fallback = False
                return result

            except Exception as exc:
                last_error = exc
                self._consecutive_failures += 1

                # Auto-fallback after exhausting primary retries
                if self._consecutive_failures >= self.max_retries and not self._using_fallback:
                    active = self.fallback_provider
                    self._using_fallback = True
                    self._consecutive_failures = 0  # Reset for fallback attempts

                if attempt < self.max_retries - 1:
                    backoff = 2 ** (attempt + 1)  # 2, 4, 8 ...
                    await asyncio.sleep(backoff)

        raise RuntimeError(
            f"AIProvider.generate failed after {self.max_retries} attempts: {last_error}"
        ) from last_error

    async def _run_once(self, provider: str, prompt: str) -> Any:
        """Execute CLI once and return parsed JSON."""
        cmd = self._build_command(provider, prompt)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(
                f"CLI {provider!r} exited {proc.returncode}: {stderr.decode()[:200]}"
            )

        raw = stdout.decode().strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Non-JSON stdout from {provider!r}: {raw[:200]}") from exc

    # ------------------------------------------------------------------
    # Batch generation
    # ------------------------------------------------------------------

    async def generate_batch(
        self,
        items: list,
        prompt_builder: Callable,
        group_by: str = None,
        batch_size: int = 50,
        parallel: int = 1,
        context: dict = None,
    ) -> list:
        """
        Hybrid batched generation.

        Groups items by group_by key (or treats all as one group), splits
        into batches of batch_size, then runs parallel workers via
        asyncio.Semaphore.
        """
        # Step 1 — build groups
        if group_by:
            groups: dict[str, list] = {}
            for item in items:
                key = item.get(group_by, "__none__")
                groups.setdefault(key, []).append(item)
        else:
            groups = {"__all__": items}

        # Step 2 — split each group into batches
        batches: list[list] = []
        for group_items in groups.values():
            for i in range(0, len(group_items), batch_size):
                batches.append(group_items[i : i + batch_size])

        # Step 3 — run with semaphore for parallelism
        sem = asyncio.Semaphore(max(1, parallel))
        results: list = []

        async def process_batch(batch: list) -> list:
            async with sem:
                prompt = prompt_builder(batch, context)
                return await self.generate(prompt, schema={})

        tasks = [process_batch(b) for b in batches]
        batch_results = await asyncio.gather(*tasks)

        # Step 4 — flatten results
        for br in batch_results:
            if isinstance(br, list):
                results.extend(br)
            else:
                results.append(br)

        return results

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


def _load_merged_env(provided: Optional[str]) -> dict:
    """
    Merge env values in priority order (later overrides earlier):
      1. backend/.env  (lowest priority)
      2. tools/.env
      3. provided env_file  (highest priority from files)
    os.environ is checked separately at call sites (not merged here).
    """
    here = Path(__file__).parent.parent  # tools/
    backend_env = here.parent / "backend" / ".env"
    tools_env = here / ".env"

    merged: dict = {}
    # Load in ascending priority: backend → tools → provided
    for candidate in [str(backend_env), str(tools_env)]:
        merged.update(_load_env_file(candidate))
    if provided:
        merged.update(_load_env_file(provided))
    return merged


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
        """Load config by merging backend/.env, tools/.env, env_file, then os.environ."""
        file_vals = _load_merged_env(env_file)

        def _get(key: str, default):
            # os.environ takes highest priority, then file_vals, then default
            return os.environ.get(key) or file_vals.get(key) or default

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
        cmd = [provider, "-p", prompt, "--output-format", "json"]
        if self.model:
            cmd += ["--model", self.model]
        return cmd

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
        # Determine which provider to use for this call.
        # If the caller explicitly names a provider, honour it exactly.
        # If _consecutive_failures already hit the threshold before this call
        # and we haven't yet switched, delegate a fresh retry loop to fallback.
        if provider_name:
            active = provider_name
        elif self._consecutive_failures >= self.max_retries and not self._using_fallback:
            # Primary has accumulated enough failures — give fallback its own
            # full retry loop via a recursive call.
            self._using_fallback = True
            self._consecutive_failures = 0
            return await self.generate(prompt, schema, provider_name=self.fallback_provider)
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

                # After each failure, check if we've hit the threshold mid-loop
                # and should hand off to the fallback for its own fresh retries.
                if (
                    self._consecutive_failures >= self.max_retries
                    and not self._using_fallback
                    and not provider_name  # don't recurse when already on fallback
                ):
                    self._using_fallback = True
                    self._consecutive_failures = 0
                    return await self.generate(
                        prompt, schema, provider_name=self.fallback_provider
                    )

                if attempt < self.max_retries - 1:
                    backoff = 2 ** (attempt + 1)  # 2, 4, 8 ...
                    await asyncio.sleep(backoff)

        raise RuntimeError(
            f"AIProvider.generate failed after {self.max_retries} attempts "
            f"using provider {active!r}: {last_error}"
        ) from last_error

    async def _run_once(self, provider: str, prompt: str) -> Any:
        """Execute CLI once and return parsed JSON."""
        cmd = self._build_command(provider, prompt)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=self.timeout
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()  # reap the process
            raise RuntimeError(
                f"CLI {provider!r} timed out after {self.timeout}s"
            )

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

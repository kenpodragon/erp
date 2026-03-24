"""Tests for tools/lib/ai_provider.py"""

import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call

# Ensure tools/ is on path so `tools.lib` is importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.lib.ai_provider import AIProvider


class TestConfigLoading(unittest.TestCase):
    """Config loading from env file and defaults."""

    def test_defaults_when_no_env_file(self):
        """Defaults applied when no env file and no env vars set."""
        with patch.dict(os.environ, {}, clear=False):
            # Remove any relevant vars if present
            for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                        "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
                os.environ.pop(key, None)
            provider = AIProvider(env_file="/nonexistent/.env")
        self.assertEqual(provider.provider, "claude")
        self.assertEqual(provider.fallback_provider, "gemini")
        self.assertEqual(provider.model, "claude-sonnet-4-6")
        self.assertEqual(provider.timeout, 120)
        self.assertEqual(provider.max_retries, 3)

    def test_loads_from_env_file(self):
        """Values loaded from a .env file."""
        env_content = (
            "AI_CLI_PROVIDER=gemini\n"
            "AI_CLI_PROVIDER_FALLBACK=claude\n"
            "AI_CLI_MODEL=gemini-pro\n"
            "AI_CLI_TIMEOUT=60\n"
            "AI_CLI_MAX_RETRIES=5\n"
        )
        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write(env_content)
            env_path = f.name
        try:
            provider = AIProvider(env_file=env_path)
            self.assertEqual(provider.provider, "gemini")
            self.assertEqual(provider.fallback_provider, "claude")
            self.assertEqual(provider.model, "gemini-pro")
            self.assertEqual(provider.timeout, 60)
            self.assertEqual(provider.max_retries, 5)
        finally:
            os.unlink(env_path)

    def test_env_vars_override_defaults(self):
        """OS environment variables override defaults when no file is given."""
        env_overrides = {
            "AI_CLI_PROVIDER": "gemini",
            "AI_CLI_PROVIDER_FALLBACK": "claude",
            "AI_CLI_MODEL": "gemini-flash",
            "AI_CLI_TIMEOUT": "90",
            "AI_CLI_MAX_RETRIES": "2",
        }
        with patch.dict(os.environ, env_overrides):
            provider = AIProvider(env_file="/nonexistent/.env")
        self.assertEqual(provider.provider, "gemini")
        self.assertEqual(provider.fallback_provider, "claude")
        self.assertEqual(provider.model, "gemini-flash")
        self.assertEqual(provider.timeout, 90)
        self.assertEqual(provider.max_retries, 2)


class TestBuildCommand(unittest.TestCase):
    """CLI command construction."""

    def setUp(self):
        with patch.dict(os.environ, {}, clear=False):
            for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                        "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
                os.environ.pop(key, None)
        self.provider = AIProvider(env_file="/nonexistent/.env")

    def test_build_command_claude(self):
        cmd = self.provider._build_command("claude", "hello world")
        # Core flags must be present; --model is appended when model is set
        self.assertIn("claude", cmd)
        self.assertIn("-p", cmd)
        self.assertIn("hello world", cmd)
        self.assertIn("--output-format", cmd)
        self.assertIn("json", cmd)

    def test_build_command_gemini(self):
        cmd = self.provider._build_command("gemini", "hello world")
        self.assertIn("gemini", cmd)
        self.assertIn("-p", cmd)
        self.assertIn("hello world", cmd)
        self.assertIn("--output-format", cmd)
        self.assertIn("json", cmd)

    def test_build_command_preserves_prompt(self):
        long_prompt = "Generate 50 items with complex JSON schema\nLine 2"
        cmd = self.provider._build_command("claude", long_prompt)
        self.assertIn(long_prompt, cmd)

    def test_build_command_includes_model_flag(self):
        """--model flag is included when model is set."""
        cmd = self.provider._build_command("claude", "hello")
        self.assertIn("--model", cmd)
        model_idx = cmd.index("--model")
        self.assertEqual(cmd[model_idx + 1], self.provider.model)

    def test_build_command_no_model_flag_when_model_empty(self):
        """--model flag is omitted when model is empty string."""
        self.provider.model = ""
        cmd = self.provider._build_command("claude", "hello")
        self.assertNotIn("--model", cmd)


class TestGenerate(unittest.IsolatedAsyncioTestCase):
    """generate() — subprocess spawning, JSON parsing, retries, fallback."""

    def _make_provider(self, max_retries=3):
        for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                    "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
            os.environ.pop(key, None)
        p = AIProvider(env_file="/nonexistent/.env")
        p.max_retries = max_retries
        return p

    def _mock_proc(self, stdout_bytes: bytes, returncode: int = 0):
        proc = MagicMock()
        proc.communicate = AsyncMock(return_value=(stdout_bytes, b""))
        proc.returncode = returncode
        return proc

    async def test_generate_parses_json_stdout(self):
        """Successful call unwraps Claude Code wrapper and returns inner result."""
        # Claude Code wraps responses: {"result": "...content..."}
        payload = {"result": [{"name": "Goblin", "hp": 10}]}
        proc = self._mock_proc(json.dumps(payload).encode())
        provider = self._make_provider()

        with patch("asyncio.create_subprocess_exec", return_value=proc) as mock_exec:
            result = await provider.generate("make an enemy", schema={})

        # _parse_response unwraps the "result" field
        self.assertEqual(result, [{"name": "Goblin", "hp": 10}])
        mock_exec.assert_called_once()

    async def test_generate_parses_direct_json(self):
        """Direct JSON (no wrapper) is returned as-is."""
        payload = [{"name": "Goblin", "hp": 10}]
        proc = self._mock_proc(json.dumps(payload).encode())
        provider = self._make_provider()

        with patch("asyncio.create_subprocess_exec", return_value=proc) as mock_exec:
            result = await provider.generate("make an enemy", schema={})

        self.assertEqual(result, payload)

    async def test_generate_retries_on_failure(self):
        """Retries up to max_retries on non-zero returncode."""
        bad_proc = self._mock_proc(b"error output", returncode=1)
        good_payload = {"items": []}
        good_proc = self._mock_proc(json.dumps(good_payload).encode(), returncode=0)

        provider = self._make_provider(max_retries=3)
        # Fail twice, succeed on third
        side_effects = [bad_proc, bad_proc, good_proc]

        with patch("asyncio.create_subprocess_exec", side_effect=side_effects):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await provider.generate("prompt", schema={})

        self.assertEqual(result, good_payload)

    async def test_generate_raises_after_max_retries_exhausted_on_primary(self):
        """Falls back to secondary provider after primary exhausts retries.

        With max_retries=2 and _consecutive_failures pre-set to max_retries,
        generate() immediately routes to the fallback provider. We mock the
        fallback's subprocess to succeed on first call.
        """
        good_payload = {"ok": True}
        good_proc = self._mock_proc(json.dumps(good_payload).encode(), returncode=0)

        provider = self._make_provider(max_retries=2)
        # Pre-set failures so generate() starts with fallback
        provider._consecutive_failures = provider.max_retries

        with patch("asyncio.create_subprocess_exec", return_value=good_proc) as mock_exec:
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await provider.generate("prompt", schema={})

        self.assertEqual(result, good_payload)
        # Verify the command used the fallback provider name
        call_args = mock_exec.call_args[0]
        self.assertEqual(call_args[0], provider.fallback_provider)

    async def test_generate_invalid_json_triggers_retry(self):
        """Non-JSON stdout triggers retry."""
        bad_proc = self._mock_proc(b"not json at all", returncode=0)
        good_payload = {"valid": True}
        good_proc = self._mock_proc(json.dumps(good_payload).encode(), returncode=0)

        provider = self._make_provider(max_retries=3)

        with patch("asyncio.create_subprocess_exec", side_effect=[bad_proc, good_proc]):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await provider.generate("prompt", schema={})

        self.assertEqual(result, good_payload)


class TestGenerateBatch(unittest.IsolatedAsyncioTestCase):
    """generate_batch() — grouping, batching, parallel workers."""

    def _make_provider(self):
        for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                    "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
            os.environ.pop(key, None)
        return AIProvider(env_file="/nonexistent/.env")

    def _mock_proc(self, payload):
        proc = MagicMock()
        proc.communicate = AsyncMock(return_value=(json.dumps(payload).encode(), b""))
        proc.returncode = 0
        return proc

    async def test_batch_groups_by_key(self):
        """Items grouped by group_by key produce separate generate calls."""
        items = [
            {"zone": "forest", "name": "Wolf"},
            {"zone": "forest", "name": "Bear"},
            {"zone": "dungeon", "name": "Goblin"},
        ]

        provider = self._make_provider()
        call_prompts = []

        async def fake_generate(prompt, schema, provider_name=None):
            call_prompts.append(prompt)
            return [{"generated": True}]

        provider.generate = fake_generate

        def prompt_builder(batch, context=None):
            return f"Generate for zone: {batch[0]['zone']}, items: {[i['name'] for i in batch]}"

        results = await provider.generate_batch(
            items, prompt_builder, group_by="zone", batch_size=50, parallel=1
        )

        # Should have 2 calls — one per zone
        self.assertEqual(len(call_prompts), 2)
        zones_in_prompts = [("forest" in p or "dungeon" in p) for p in call_prompts]
        self.assertTrue(all(zones_in_prompts))

    async def test_batch_splits_into_batch_size(self):
        """Large groups are split into batches of batch_size."""
        items = [{"zone": "forest", "id": i} for i in range(120)]
        provider = self._make_provider()
        call_prompts = []

        async def fake_generate(prompt, schema, provider_name=None):
            call_prompts.append(prompt)
            return [{"generated": True}]

        provider.generate = fake_generate

        def prompt_builder(batch, context=None):
            return f"batch of {len(batch)}"

        await provider.generate_batch(
            items, prompt_builder, group_by="zone", batch_size=50, parallel=1
        )

        # 120 items / 50 = 3 batches
        self.assertEqual(len(call_prompts), 3)

    async def test_batch_no_group_by(self):
        """Without group_by, all items treated as single group, split by batch_size."""
        items = [{"id": i} for i in range(60)]
        provider = self._make_provider()
        call_count = [0]

        async def fake_generate(prompt, schema, provider_name=None):
            call_count[0] += 1
            return [{"generated": True}]

        provider.generate = fake_generate

        def prompt_builder(batch, context=None):
            return f"batch of {len(batch)}"

        await provider.generate_batch(
            items, prompt_builder, group_by=None, batch_size=50, parallel=1
        )

        # 60 items / 50 = 2 batches
        self.assertEqual(call_count[0], 2)

    async def test_batch_returns_flat_results(self):
        """Results from all batches are returned as a flat list."""
        items = [{"zone": "A", "id": i} for i in range(3)]
        provider = self._make_provider()

        async def fake_generate(prompt, schema, provider_name=None):
            return [{"result": "x"}, {"result": "y"}]

        provider.generate = fake_generate

        def prompt_builder(batch, context=None):
            return "prompt"

        results = await provider.generate_batch(
            items, prompt_builder, group_by=None, batch_size=10, parallel=1
        )

        # Single batch returns [{"result":"x"},{"result":"y"}]
        self.assertEqual(results, [{"result": "x"}, {"result": "y"}])


class TestTimeoutHandling(unittest.IsolatedAsyncioTestCase):
    """Timeout wraps proc.communicate() and raises RuntimeError."""

    def _make_provider(self, timeout=5):
        for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                    "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
            os.environ.pop(key, None)
        p = AIProvider(env_file="/nonexistent/.env")
        p.timeout = timeout
        p.max_retries = 1  # single attempt so timeout propagates as RuntimeError
        return p

    async def test_timeout_raises_runtime_error(self):
        """A hung subprocess raises RuntimeError mentioning timeout."""
        provider = self._make_provider(timeout=1)

        proc = MagicMock()
        proc.kill = MagicMock()
        proc.communicate = AsyncMock(return_value=(b"", b""))

        # Patch wait_for in the ai_provider module namespace only,
        # not globally, to avoid interfering with IsolatedAsyncioTestCase.
        async def _fake_wait_for(coro, timeout):
            raise asyncio.TimeoutError()

        with patch("asyncio.create_subprocess_exec", return_value=proc):
            with patch("tools.lib.ai_provider.asyncio.wait_for", side_effect=_fake_wait_for):
                with self.assertRaises(RuntimeError) as ctx:
                    await provider.generate("prompt", schema={})

        self.assertIn("timed out", str(ctx.exception).lower())

    async def test_timeout_kills_process(self):
        """On timeout, _run_once kills the subprocess before re-raising."""
        provider = self._make_provider(timeout=1)

        proc = MagicMock()
        proc.kill = MagicMock()
        # After kill(), _run_once calls proc.communicate() to reap — must be awaitable.
        proc.communicate = AsyncMock(return_value=(b"", b""))

        async def _fake_wait_for(coro, timeout):
            # Drain the coroutine to avoid "never awaited" warning
            coro.close()
            raise asyncio.TimeoutError()

        with patch("asyncio.create_subprocess_exec", return_value=proc):
            with patch("tools.lib.ai_provider.asyncio.wait_for", side_effect=_fake_wait_for):
                with self.assertRaises(RuntimeError):
                    await provider._run_once("claude", "prompt")

        proc.kill.assert_called_once()


class TestOrganicAutoFallback(unittest.IsolatedAsyncioTestCase):
    """Organic fallback: consecutive failures across generate() calls."""

    def _make_provider(self, max_retries=2):
        for key in ["AI_CLI_PROVIDER", "AI_CLI_PROVIDER_FALLBACK", "AI_CLI_MODEL",
                    "AI_CLI_TIMEOUT", "AI_CLI_MAX_RETRIES"]:
            os.environ.pop(key, None)
        p = AIProvider(env_file="/nonexistent/.env")
        p.max_retries = max_retries
        return p

    def _mock_proc(self, stdout_bytes: bytes, returncode: int = 0):
        proc = MagicMock()
        proc.communicate = AsyncMock(return_value=(stdout_bytes, b""))
        proc.returncode = returncode
        return proc

    async def test_fallback_gets_fresh_retries(self):
        """After primary exhausts retries, fallback provider gets its own fresh loop."""
        good_payload = {"fallback": True}
        bad_proc = self._mock_proc(b"err", returncode=1)
        good_proc = self._mock_proc(json.dumps(good_payload).encode(), returncode=0)

        provider = self._make_provider(max_retries=2)

        # Primary will fail twice (max_retries=2), then fallback should succeed
        call_log = []

        async def fake_exec(*args, **kwargs):
            call_log.append(args[0])  # provider binary name
            if args[0] == provider.provider:
                return bad_proc
            return good_proc

        with patch("asyncio.create_subprocess_exec", side_effect=fake_exec):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await provider.generate("prompt", schema={})

        self.assertEqual(result, good_payload)
        # Primary was called, then fallback was called
        self.assertIn(provider.provider, call_log)
        self.assertIn(provider.fallback_provider, call_log)

    async def test_fallback_provider_is_independent_of_primary_attempt_count(self):
        """Fallback receives a full max_retries loop, not leftover primary iterations."""
        good_payload = {"ok": True}
        bad_proc = self._mock_proc(b"err", returncode=1)
        good_proc = self._mock_proc(json.dumps(good_payload).encode(), returncode=0)

        provider = self._make_provider(max_retries=2)
        fallback_calls = []

        async def fake_exec(*args, **kwargs):
            name = args[0]
            if name == provider.fallback_provider:
                fallback_calls.append(name)
                # Fail first fallback attempt, succeed second
                if len(fallback_calls) == 1:
                    return bad_proc
                return good_proc
            return bad_proc

        with patch("asyncio.create_subprocess_exec", side_effect=fake_exec):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await provider.generate("prompt", schema={})

        self.assertEqual(result, good_payload)
        # Fallback should have been called twice (it got its own max_retries loop)
        self.assertEqual(len(fallback_calls), 2)


class TestEnvMerge(unittest.TestCase):
    """Env file merge: backend/.env < tools/.env < provided file < os.environ."""

    def test_provided_env_overrides_other_files(self):
        """A directly-provided env file takes precedence over auto-located files."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write("AI_CLI_PROVIDER=provided_provider\n")
            provided_path = f.name
        try:
            for key in ["AI_CLI_PROVIDER"]:
                os.environ.pop(key, None)
            from tools.lib.ai_provider import _load_merged_env
            merged = _load_merged_env(provided_path)
            # The provided file's value must be present
            self.assertEqual(merged.get("AI_CLI_PROVIDER"), "provided_provider")
        finally:
            os.unlink(provided_path)

    def test_os_environ_overrides_file(self):
        """os.environ values override file values in AIProvider._get."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write("AI_CLI_PROVIDER=from_file\n")
            env_path = f.name
        try:
            with patch.dict(os.environ, {"AI_CLI_PROVIDER": "from_env"}):
                provider = AIProvider(env_file=env_path)
            self.assertEqual(provider.provider, "from_env")
        finally:
            os.unlink(env_path)


if __name__ == "__main__":
    unittest.main()

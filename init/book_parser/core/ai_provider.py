"""
AI Provider abstraction: Claude (primary) with Gemini (fallback).
Handles automatic provider switching when token/rate limits are hit.
"""
from __future__ import annotations
import json
import logging
import os
import time
import random
from dataclasses import dataclass, field
from typing import Optional, Type

import anthropic
from google import genai
from pydantic import BaseModel

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("book_parser.ai")


@dataclass
class TokenUsage:
    claude_tokens: int = 0
    gemini_tokens: int = 0

    def add(self, provider: str, tokens: int) -> None:
        if provider == "claude":
            self.claude_tokens += tokens
        else:
            self.gemini_tokens += tokens


class TokenLimitError(Exception):
    """Raised when both providers have exhausted their quotas."""


class TruncatedResponseError(Exception):
    """Raised when an AI response is cut off by the max_tokens limit."""


class ProviderRateLimitError(Exception):
    """Raised by a single provider when its quota is hit."""


@dataclass
class AIProvider:
    """
    Wraps Claude and Gemini. Tries Claude first; on rate-limit or quota error
    switches to Gemini. If both fail, raises TokenLimitError.
    """
    claude_model: str = field(default_factory=lambda: os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
    usage: TokenUsage = field(default_factory=TokenUsage)

    _current_provider: str = field(default="claude", init=False)
    _claude_client: Optional[anthropic.Anthropic] = field(default=None, init=False)
    _gemini_client: Optional[genai.Client] = field(default=None, init=False)
    _last_call_time: float = field(default=0.0, init=False)

    def __post_init__(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self._claude_client = anthropic.Anthropic(
                api_key=api_key,
                timeout=600.0 # 10 minute timeout
            )
        else:
            logger.warning("ANTHROPIC_API_KEY not set — Claude disabled")
            self._current_provider = "gemini"

        gemini_key = os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            self._gemini_client = genai.Client(api_key=gemini_key)
        else:
            logger.warning("GOOGLE_API_KEY not set — Gemini disabled")

    @property
    def current_provider(self) -> str:
        return self._current_provider

    @property
    def current_model(self) -> str:
        return self.claude_model if self._current_provider == "claude" else self.gemini_model

    def set_primary_provider(self, provider: str) -> None:
        """Manually set the primary provider."""
        if provider in ("claude", "gemini"):
            self._current_provider = provider
            logger.info("Primary provider set to: %s", provider)

    def update_model(self, provider: str, model_id: str) -> None:
        """Manually update the model for a specific provider."""
        if provider == "claude":
            self.claude_model = model_id
        elif provider == "gemini":
            self.gemini_model = model_id

    def _switch_to_gemini(self) -> None:
        logger.warning("Permanent switch: Gemini is now the primary provider for this session")
        self._current_provider = "gemini"

    def _wait_for_rate_limit(self) -> None:
        """Ensure a minimum gap between calls to any AI provider."""
        # Minimum 1.0 second gap for Claude, 2.0 for Gemini (tighter limits)
        min_gap = 2.0 if self._current_provider == "gemini" else 1.0
        now = time.time()
        elapsed = now - self._last_call_time
        if elapsed < min_gap:
            wait = min_gap - elapsed
            logger.debug("Rate limit protection: waiting %.2fs", wait)
            time.sleep(wait)
        self._last_call_time = time.time()

    def call(self, system_prompt: str, user_prompt: str,
             response_model: Optional[Type[BaseModel]] = None,
             max_retries_per_provider: int = 3) -> tuple[str, str, str]:
        """
        Make an AI call. Returns (json_text, provider_name, model_id).
        If response_model is provided, validates and returns parsed JSON text.
        Raises TokenLimitError if both providers are exhausted.
        """
        last_error: Optional[Exception] = None

        for attempt in range(2):  # try current provider, then fallback
            for retry in range(max_retries_per_provider):
                self._wait_for_rate_limit()
                
                try:
                    if self._current_provider == "claude" and self._claude_client:
                        return self._call_claude(system_prompt, user_prompt, response_model)
                    elif self._gemini_client:
                        return self._call_gemini(system_prompt, user_prompt, response_model)
                    else:
                        raise TokenLimitError("No AI providers are configured or available")
                
                except ProviderRateLimitError as e:
                    last_error = e
                    if retry < max_retries_per_provider - 1:
                        # Exponential backoff: 3s, 7s, 15s... with jitter
                        wait_time = (2 ** (retry + 1)) + random.uniform(1.0, 3.0)
                        logger.warning("Provider %s rate limit: %s. Retrying in %.2fs (attempt %d/%d)...",
                                       self._current_provider, e, wait_time, retry+1, max_retries_per_provider)
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.warning("Max retries for provider %s reached.", self._current_provider)
                        break # Switch to next provider if possible
                
                except TruncatedResponseError:
                    # Truncation might be fixed by prompt shortening in phase2, 
                    # but if it happens to Claude, we might want to try Gemini too.
                    if self._current_provider == "claude":
                        break 
                    else:
                        raise # handled by phase2 logic (ultra-concise retry)

            if self._current_provider == "claude":
                self._switch_to_gemini()
                continue
            else:
                # Gemini failed all retries
                raise TokenLimitError(f"Both Claude and Gemini have hit their rate/token limits. Last error: {last_error}") from last_error

        raise TokenLimitError(f"All providers exhausted: {last_error}") from last_error

    def _call_claude(self, system_prompt: str, user_prompt: str,
                     response_model: Optional[Type[BaseModel]]) -> tuple[str, str, str]:
        json_instruction = ""
        if response_model:
            schema = response_model.model_json_schema()
            json_instruction = f"\n\nYou MUST respond with valid JSON conforming exactly to this schema:\n{json.dumps(schema, indent=2)}\n\nRespond with ONLY the JSON object — no markdown, no explanation."

        try:
            response = self._claude_client.messages.create(
                model=self.claude_model,
                max_tokens=8192,
                system=system_prompt + json_instruction,
                messages=[{"role": "user", "content": user_prompt}],
            )
        except anthropic.RateLimitError as e:
            raise ProviderRateLimitError(f"Claude rate limit: {e}") from e
        except anthropic.APIStatusError as e:
            # Handle 400 (e.g. low credit), 401 (auth), 429 (rate), 529 (overloaded) etc.
            # We want to switch to fallback for any provider-side failure that isn't a 
            # malformed request *on our end* that would also fail on Gemini.
            # However, "low credit" is a 400 but it IS a provider-side failure.
            logger.warning("Claude API status error (%d): %s", e.status_code, e.message)
            raise ProviderRateLimitError(f"Claude API error {e.status_code}: {e.message}") from e

        text = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens
        self.usage.add("claude", tokens)
        logger.debug("Claude used %d tokens (cumulative: %d)", tokens, self.usage.claude_tokens)

        if response.stop_reason == "max_tokens":
            logger.warning("Claude response truncated by max_tokens limit")
            raise TruncatedResponseError("Claude response truncated by max_tokens limit")

        if response_model:
            text = self._extract_json(text)
            self._validate_json(text, response_model)

        return text, "claude", self.claude_model

    def _call_gemini(self, system_prompt: str, user_prompt: str,
                     response_model: Optional[Type[BaseModel]]) -> tuple[str, str, str]:
        config = {
            "system_instruction": system_prompt,
            "temperature": 0.3,
        }
        
        if response_model:
            config["response_mime_type"] = "application/json"
            config["response_schema"] = response_model

        try:
            response = self._gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=user_prompt,
                config=config,
            )
        except Exception as e:
            err_str = str(e).lower()
            # Catch common quota/rate/auth/overload errors for Gemini
            if any(term in err_str for term in ["quota", "rate", "429", "503", "500", "limit", "credit", "balance"]):
                raise ProviderRateLimitError(f"Gemini provider error: {e}") from e
            raise

        # The new SDK handles Pydantic validation if response_schema is passed
        if response_model:
            # response.parsed will be the Pydantic object
            if response.parsed:
                text = response.parsed.model_dump_json()
            else:
                text = response.text
                text = self._extract_json(text)
                self._validate_json(text, response_model)
        else:
            text = response.text
            
        # Token usage estimation
        if response.usage_metadata:
            tokens = response.usage_metadata.total_token_count
        else:
            estimated_tokens = len(user_prompt.split()) + len(text.split())
            tokens = estimated_tokens
            
        self.usage.add("gemini", tokens)

        # Check for truncation in Gemini (depends on SDK version, candidates[0].finish_reason)
        try:
            if hasattr(response, 'candidates') and response.candidates[0].finish_reason == 2: # 2 is MAX_TOKENS
                logger.warning("Gemini response truncated by max_tokens limit")
                raise TruncatedResponseError("Gemini response truncated by max_tokens limit")
        except (AttributeError, IndexError):
            pass

        return text, "gemini", self.gemini_model

    def _extract_json(self, text: str) -> str:
        """Strip markdown code fences if present."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            start = 1
            end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
            text = "\n".join(lines[start:end]).strip()
        return text

    def _validate_json(self, text: str, model: Type[BaseModel]) -> None:
        """Parse JSON and validate against Pydantic model. Raises ValueError on failure."""
        try:
            data = json.loads(text)
            model.model_validate(data)
        except (json.JSONDecodeError, Exception) as e:
            raise ValueError(f"AI response failed validation against {model.__name__}: {e}\nResponse: {text[:500]}")

    def parse_response(self, json_text: str, response_model: Type[BaseModel]) -> BaseModel:
        """Parse and return a validated Pydantic model from JSON text."""
        data = json.loads(json_text)
        return response_model.model_validate(data)

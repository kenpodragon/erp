"""Tests for the reusable rate limiter (REC 3.5 §12.4)."""

import time
from unittest.mock import patch

import pytest

from services.rate_limiter import EndpointRateLimiter


@pytest.fixture
def limiter():
    return EndpointRateLimiter()


class TestEndpointRateLimiter:
    def test_allows_requests_within_limit(self, limiter):
        for _ in range(10):
            allowed, _ = limiter.check(player_id=1, tag="buy", max_per_minute=10)
            assert allowed is True

    def test_blocks_request_over_limit(self, limiter):
        for _ in range(10):
            limiter.check(player_id=1, tag="buy", max_per_minute=10)

        allowed, retry_after = limiter.check(player_id=1, tag="buy", max_per_minute=10)
        assert allowed is False
        assert retry_after >= 1

    def test_different_tags_independent(self, limiter):
        # Fill up "buy" bucket
        for _ in range(10):
            limiter.check(player_id=1, tag="buy", max_per_minute=10)

        # "browse" bucket should still be open
        allowed, _ = limiter.check(player_id=1, tag="browse", max_per_minute=30)
        assert allowed is True

    def test_different_players_independent(self, limiter):
        # Fill up player 1's bucket
        for _ in range(10):
            limiter.check(player_id=1, tag="buy", max_per_minute=10)

        # Player 2 should still be allowed
        allowed, _ = limiter.check(player_id=2, tag="buy", max_per_minute=10)
        assert allowed is True

    def test_window_slides_after_60s(self, limiter):
        base_time = 1000000.0

        with patch("services.rate_limiter.time") as mock_time:
            mock_time.time.return_value = base_time

            # Fill the bucket
            for _ in range(10):
                limiter.check(player_id=1, tag="buy", max_per_minute=10)

            # At t=0, 11th call should be blocked
            allowed, _ = limiter.check(player_id=1, tag="buy", max_per_minute=10)
            assert allowed is False

            # Advance 61 seconds — window slides, all old timestamps expire
            mock_time.time.return_value = base_time + 61.0
            allowed, _ = limiter.check(player_id=1, tag="buy", max_per_minute=10)
            assert allowed is True

    def test_retry_after_is_positive(self, limiter):
        for _ in range(10):
            limiter.check(player_id=1, tag="buy", max_per_minute=10)

        allowed, retry_after = limiter.check(player_id=1, tag="buy", max_per_minute=10)
        assert allowed is False
        assert retry_after > 0
        assert retry_after <= 61

    def test_browse_limit_of_30(self, limiter):
        for i in range(30):
            allowed, _ = limiter.check(player_id=1, tag="browse", max_per_minute=30)
            assert allowed is True

        allowed, _ = limiter.check(player_id=1, tag="browse", max_per_minute=30)
        assert allowed is False

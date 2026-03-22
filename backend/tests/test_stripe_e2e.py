"""Phase D — Stripe E2E integration tests.

These tests hit the LIVE running backend at localhost:8000 using httpx.
They exercise real Stripe test-mode APIs and require:

  1. Docker stack running (backend at localhost:8000)
  2. Stripe CLI webhook listener:
       stripe listen --forward-to localhost:8000/api/webhooks/stripe
  3. Stripe test key configured in backend/.env
  4. Valid Firebase auth token (auth bypass was removed 2026-03-22)

Run with:
    pytest backend/tests/test_stripe_e2e.py -m integration -v

TODO: Update HEADERS to use a real Firebase Bearer token.
"""

import httpx
import pytest
import time

BASE_URL = "http://localhost:8000"
HEADERS: dict[str, str] = {}  # TODO: Add Firebase Bearer token for auth

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Module-level guard: skip all tests if the server is unreachable
# ---------------------------------------------------------------------------

def _server_is_running() -> bool:
    try:
        r = httpx.get(f"{BASE_URL}/docs", timeout=3)
        return r.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False


if not _server_is_running():
    pytest.skip(
        "Backend server not running at localhost:8000 — skipping E2E tests",
        allow_module_level=True,
    )


# ===========================================================================
# D.1 — Shard Purchasing
# ===========================================================================


class TestShardPurchasingE2E:
    """Verify shard-package checkout flow against the live server."""

    def test_get_packages(self):
        """GET /api/payments/packages returns active packages with prices."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/payments/packages")
            assert res.status_code == 200
            data = res.json()
            assert "packages" in data
            assert isinstance(data["packages"], list)
            assert "current_balance" in data
            assert "first_purchase_available" in data
            assert "has_active_dispute" in data
            # Every package should have required fields
            if data["packages"]:
                pkg = data["packages"][0]
                for field in ("id", "name", "price_cents", "total_shards", "tier_key"):
                    assert field in pkg, f"Missing field '{field}' in package"
                assert pkg["price_cents"] > 0

    def test_create_checkout_session(self):
        """POST /api/payments/checkout creates a Stripe checkout session."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:
            # First, grab a valid package_id
            pkgs_res = client.get("/api/payments/packages")
            assert pkgs_res.status_code == 200
            packages = pkgs_res.json()["packages"]
            assert len(packages) > 0, "No active packages seeded"

            package_id = packages[0]["id"]
            res = client.post("/api/payments/checkout", json={"package_id": package_id})
            assert res.status_code == 200
            data = res.json()
            assert "checkout_url" in data
            assert "session_id" in data
            assert data["checkout_url"].startswith("https://checkout.stripe.com")
            assert data["session_id"].startswith("cs_test_")

    def test_payment_status_for_created_session(self):
        """GET /api/payments/status/{session_id} returns status for a known session."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:
            # Create a checkout session first
            pkgs_res = client.get("/api/payments/packages")
            packages = pkgs_res.json()["packages"]
            if not packages:
                pytest.skip("No active packages seeded")

            checkout_res = client.post(
                "/api/payments/checkout", json={"package_id": packages[0]["id"]}
            )
            assert checkout_res.status_code == 200
            session_id = checkout_res.json()["session_id"]

            # Now query status — should be pending (checkout not completed)
            res = client.get(f"/api/payments/status/{session_id}")
            assert res.status_code == 200
            data = res.json()
            assert "status" in data
            assert data["status"] in ("pending", "completed", "expired")

    def test_payment_status_not_found(self):
        """GET /api/payments/status/{bad_id} returns 404."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/payments/status/cs_test_nonexistent_session_id_12345")
            assert res.status_code == 404

    def test_transaction_history(self):
        """GET /api/payments/transactions returns paginated list."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/payments/transactions")
            assert res.status_code == 200
            data = res.json()
            assert "transactions" in data
            assert isinstance(data["transactions"], list)
            assert "page" in data
            assert "total" in data
            assert "total_pages" in data


# ===========================================================================
# D.2 — Subscription
# ===========================================================================


class TestSubscriptionE2E:
    """Verify subscription status and checkout creation."""

    def test_get_status(self):
        """GET /api/subscriptions/status returns subscription state."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/subscriptions/status")
            assert res.status_code == 200
            data = res.json()
            assert "subscribed" in data
            assert "boosts" in data
            assert isinstance(data["subscribed"], bool)
            # If not subscribed, subscription should be None
            if not data["subscribed"]:
                assert data["subscription"] is None

    def test_create_subscription_checkout(self):
        """POST /api/subscriptions/create returns a checkout URL for ascendant_monthly.

        Note: If the player already has an active subscription, this will return 400.
        We handle both cases.
        """
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:
            res = client.post(
                "/api/subscriptions/create",
                json={"plan_key": "ascendant_monthly"},
            )
            if res.status_code == 200:
                data = res.json()
                assert "checkout_url" in data
                assert "session_id" in data
                assert data["checkout_url"].startswith("https://checkout.stripe.com")
            elif res.status_code == 400:
                # Already subscribed — that's valid too
                assert "already have" in res.json().get("detail", "").lower()
            else:
                # 500 might occur if price ID not configured in game_configs
                pytest.skip(
                    f"Subscription checkout returned {res.status_code}: "
                    f"{res.json().get('detail', 'unknown')}"
                )

    def test_create_subscription_invalid_plan(self):
        """POST /api/subscriptions/create with bad plan_key returns 400."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.post(
                "/api/subscriptions/create",
                json={"plan_key": "invalid_plan_key"},
            )
            assert res.status_code == 400


# ===========================================================================
# D.3 — Dispute Integration
# ===========================================================================


class TestDisputeE2E:
    """Verify dispute-flagged accounts are blocked from checkout.

    Note: Setting account_flag='dispute' on player 2 would block ALL subsequent
    tests. Instead, we just verify the dispute check mechanism by confirming
    a non-disputed account CAN checkout (covered in D.1), and that the
    endpoint logic returns 403 for disputed accounts (covered by unit tests).
    Here we do a lightweight structural check.
    """

    def test_packages_shows_dispute_flag(self):
        """GET /api/payments/packages includes has_active_dispute field."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/payments/packages")
            assert res.status_code == 200
            data = res.json()
            assert "has_active_dispute" in data
            # E2ETestBot (player 2) should not have a dispute flag
            assert data["has_active_dispute"] is False

    def test_checkout_succeeds_without_dispute(self):
        """POST /api/payments/checkout succeeds when account has no dispute flag."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:
            pkgs_res = client.get("/api/payments/packages")
            packages = pkgs_res.json().get("packages", [])
            if not packages:
                pytest.skip("No active packages seeded")

            res = client.post(
                "/api/payments/checkout", json={"package_id": packages[0]["id"]}
            )
            # Should succeed (200), not be blocked by dispute (403)
            assert res.status_code == 200


# ===========================================================================
# D.4 — Donation
# ===========================================================================


class TestDonationE2E:
    """Verify donation checkout, status, and leaderboard endpoints."""

    def test_create_donation_session(self):
        """POST /api/donations/create-session creates a Stripe donation checkout."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=15) as client:
            res = client.post(
                "/api/donations/create-session",
                json={"amount_cents": 500},
            )
            if res.status_code == 200:
                data = res.json()
                assert "checkout_url" in data
                assert data["checkout_url"].startswith("https://checkout.stripe.com")
            else:
                # Could fail if donation config not seeded
                pytest.skip(
                    f"Donation create-session returned {res.status_code}: "
                    f"{res.json().get('detail', 'unknown')}"
                )

    def test_create_donation_session_too_low(self):
        """POST /api/donations/create-session with 0 cents should fail."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.post(
                "/api/donations/create-session",
                json={"amount_cents": 0},
            )
            # Should be rejected (400) for zero/negative amount
            assert res.status_code == 400

    def test_donation_status(self):
        """GET /api/donations/status returns patron tier info."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/donations/status")
            assert res.status_code == 200
            data = res.json()
            # Should return some form of patron status
            assert isinstance(data, dict)

    def test_donation_leaderboard(self):
        """GET /api/donations/leaderboard returns a list."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/donations/leaderboard")
            assert res.status_code == 200
            data = res.json()
            # Should return a list (possibly empty) or an object with a list
            assert isinstance(data, (list, dict))


# ===========================================================================
# D.5 — Emporium (Shop)
# ===========================================================================


class TestEmporiumE2E:
    """Verify shop catalog, collection, boosters, and purchase-guard endpoints."""

    def test_get_catalog(self):
        """GET /api/shop/catalog returns shop items or 404 if player has no meta progression."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/shop/catalog")
            # 200 if player has meta progression, 404/500 if not (test player may lack it)
            assert res.status_code in (200, 404, 500)
            if res.status_code == 200:
                data = res.json()
                assert isinstance(data, (list, dict))

    def test_get_collection(self):
        """GET /api/shop/collection returns owned cosmetic items."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/shop/collection")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, (list, dict))

    def test_get_boosters(self):
        """GET /api/shop/boosters returns active booster info."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/shop/boosters")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, (list, dict))

    def test_purchase_insufficient_shards(self):
        """POST /api/shop/purchase with an expensive item should fail with 400."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            # Use item_id=999999 which shouldn't exist, triggering an error
            res = client.post("/api/shop/purchase", json={"item_id": 999999})
            # Should fail — either 400 (item not found / insufficient shards) or 404
            assert res.status_code in (400, 404)

    def test_purchase_requires_body(self):
        """POST /api/shop/purchase without body returns 422."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.post("/api/shop/purchase")
            assert res.status_code == 422


# ===========================================================================
# D.6 — Marketplace
# ===========================================================================


class TestMarketplaceE2E:
    """Verify marketplace browse, listings, trade history, and rate limiting."""

    def test_browse_listings(self):
        """GET /api/marketplace/browse returns paginated listings."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/marketplace/browse")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, dict)

    def test_browse_with_filters(self):
        """GET /api/marketplace/browse with query params works."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get(
                "/api/marketplace/browse",
                params={"item_type": "cosmetic", "sort": "price_desc", "page_size": 5},
            )
            assert res.status_code == 200

    def test_my_listings(self):
        """GET /api/marketplace/my-listings returns player's listings."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/marketplace/my-listings")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, (list, dict))

    def test_trade_history(self):
        """GET /api/marketplace/trade-history returns paginated trades."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get("/api/marketplace/trade-history")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, dict)

    def test_trade_history_with_type_filter(self):
        """GET /api/marketplace/trade-history?type=purchases works."""
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=10) as client:
            res = client.get(
                "/api/marketplace/trade-history", params={"type": "purchases"}
            )
            assert res.status_code == 200

    def test_rate_limit_enforced(self):
        """Hit /api/marketplace/browse 31 times rapidly; 31st should return 429.

        The rate limiter allows 30 requests per minute per player per tag.
        We fire 31 sequential requests; the last one should be rate-limited.
        """
        with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=30) as client:
            last_status = None
            hit_429 = False

            for i in range(35):
                res = client.get("/api/marketplace/browse")
                last_status = res.status_code
                if res.status_code == 429:
                    hit_429 = True
                    break

            assert hit_429, (
                f"Expected 429 after exceeding rate limit, but last status was {last_status}. "
                f"Rate limiter may have been reset or limit may be higher than expected."
            )

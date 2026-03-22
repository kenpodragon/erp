"""Validate API client interface and structure."""
import inspect
import pytest


def test_client_has_required_methods():
    from tools.sim.api_client import GameAPIClient

    required = [
        'login', 'get_map', 'get_game_configs',
        'get_scene_narrative', 'get_scene_enemies',
        'start_session', 'get_session', 'tick',
        'upgrade', 'activate_skill',
        'update_narrative_progress', 'complete_session',
        'start_training', 'stop_training',
        'get_training_status', 'get_offline_report',
        'get_character_stats', 'get_character_level',
        'get_skill_tree', 'get_classes',
        'get_metrics', 'close',
    ]
    for method in required:
        assert hasattr(GameAPIClient, method), f"Missing method: {method}"
        assert callable(getattr(GameAPIClient, method))


def test_client_accepts_base_url_and_player_id():
    from tools.sim.api_client import GameAPIClient

    client = GameAPIClient(base_url="http://localhost:8000", player_id=5)
    assert client.base_url == "http://localhost:8000"
    assert client.player_id == 5


def test_client_default_player_id():
    from tools.sim.api_client import GameAPIClient

    client = GameAPIClient(base_url="http://localhost:8000")
    assert client.player_id == 5


def test_client_sets_spoof_header():
    from tools.sim.api_client import GameAPIClient

    client = GameAPIClient(base_url="http://localhost:8000", player_id=7)
    assert client.player_id == 7


def test_client_has_metrics():
    from tools.sim.api_client import GameAPIClient

    client = GameAPIClient(base_url="http://localhost:8000")
    metrics = client.get_metrics()
    assert "request_count" in metrics
    assert "error_count" in metrics
    assert "response_times" in metrics


def test_client_is_async_context_manager():
    from tools.sim.api_client import GameAPIClient

    assert hasattr(GameAPIClient, '__aenter__')
    assert hasattr(GameAPIClient, '__aexit__')


def test_methods_are_coroutines():
    from tools.sim.api_client import GameAPIClient

    async_methods = [
        'login', 'get_map', 'get_game_configs',
        'start_session', 'tick', 'upgrade',
        'activate_skill', 'update_narrative_progress', 'complete_session',
        'start_training', 'stop_training',
        'get_training_status', 'get_character_stats',
        'get_character_level', 'close',
    ]
    for method_name in async_methods:
        method = getattr(GameAPIClient, method_name)
        assert inspect.iscoroutinefunction(method), f"{method_name} should be async"
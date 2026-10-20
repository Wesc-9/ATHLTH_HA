"""Static contract tests for the bundled ATHLTH card library."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "custom_components" / "athlth" / "frontend" / "athlth-cards.js"
EXAMPLE = ROOT / "examples" / "premium-dashboard.yaml"


def test_card_bundle_contains_all_individual_cards():
    source = CARDS.read_text(encoding="utf-8")
    for name in (
        "athlth-dashboard-card", "athlth-week-card", "athlth-today-card",
        "athlth-next-card", "athlth-last-card", "athlth-plan-card",
        "athlth-family-card", "athlth-recovery-card", "athlth-active-card",
        "athlth-calendar-card", "athlth-goals-card", "athlth-strength-card",
    ):
        assert name in source
    assert "Shared/ATHLTHBrandMark.swift" in source
    assert "window.customCards" in source


def test_documented_dashboard_and_frontend_are_registered():
    assert "custom:athlth-dashboard-card" in EXAMPLE.read_text(encoding="utf-8")
    setup = (ROOT / "custom_components" / "athlth" / "__init__.py").read_text()
    front = (ROOT / "custom_components" / "athlth" / "frontend.py").read_text()
    assert "await async_register_premium_cards(hass)" in setup
    assert "async_register_static_paths" in front
    assert "add_extra_js_url" in front



def test_manifest_keeps_compatibility_with_supported_hassfest():
    """The categories field is not accepted by our supported 2026.9 action."""
    import json
    manifest = json.loads(
        (ROOT / "custom_components" / "athlth" / "manifest.json").read_text()
    )
    assert "categories" not in manifest


async def test_frontend_static_resource_registration_is_idempotent(monkeypatch):
    """A real frontend setup exposes the bundled resource exactly once."""
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, Mock
    from custom_components.athlth import frontend

    register = AsyncMock()
    add_js = Mock()
    monkeypatch.setattr(frontend, "add_extra_js_url", add_js)
    hass = SimpleNamespace(
        data={},
        config=SimpleNamespace(components={"frontend"}),
        http=SimpleNamespace(async_register_static_paths=register),
    )

    await frontend.async_register_premium_cards(hass)
    await frontend.async_register_premium_cards(hass)

    register.assert_awaited_once()
    paths = register.call_args.args[0]
    assert len(paths) == 1
    assert paths[0].url_path == frontend.FRONTEND_URL
    assert paths[0].path == str(frontend.FRONTEND_PATH)
    assert frontend.FRONTEND_PATH.is_file()
    add_js.assert_called_once_with(hass, frontend.FRONTEND_URL)


async def test_headless_home_assistant_does_not_require_frontend(monkeypatch):
    """Sensors and webhooks still run on installations without the HA UI."""
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, Mock
    from custom_components.athlth import frontend

    register = AsyncMock()
    add_js = Mock()
    monkeypatch.setattr(frontend, "add_extra_js_url", add_js)
    hass = SimpleNamespace(
        data={},
        config=SimpleNamespace(components=set()),
        http=SimpleNamespace(async_register_static_paths=register),
    )

    await frontend.async_register_premium_cards(hass)
    register.assert_not_awaited()
    add_js.assert_not_called()
    assert not hass.data["athlth"].get("premium_frontend_registered")

    # Frontend becomes available later: resource registration may retry.
    hass.config.components.add("frontend")
    await frontend.async_register_premium_cards(hass)
    register.assert_awaited_once()
    add_js.assert_called_once()

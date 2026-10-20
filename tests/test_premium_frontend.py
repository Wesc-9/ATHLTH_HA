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

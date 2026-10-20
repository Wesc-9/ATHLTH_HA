"""Serve the ATHLTH premium Lovelace cards without publishing user data."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN

FRONTEND_URL = f"/{DOMAIN}/frontend/athlth-cards.js"
FRONTEND_PATH = Path(__file__).parent / "frontend" / "athlth-cards.js"
_FRONTEND_REGISTERED = "premium_frontend_registered"


async def async_register_premium_cards(hass: HomeAssistant) -> None:
    """Expose bundled JS from integration, register for Lovelace frontend."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get(_FRONTEND_REGISTERED):
        return

    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(FRONTEND_PATH), cache_headers=False)]
    )
    add_extra_js_url(hass, FRONTEND_URL)
    domain_data[_FRONTEND_REGISTERED] = True

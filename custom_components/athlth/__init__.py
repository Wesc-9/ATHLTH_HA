"""ATHLTH integration for Home Assistant."""

from __future__ import annotations

import secrets
from typing import Any

from homeassistant.components import webhook
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .api import ATHLTHPairView
from .const import (
    CONF_SHARED_SECRET,
    CONF_WEBHOOK_ID,
    DATA_API_REGISTERED,
    DATA_RUNTIMES,
    DOMAIN,
)
from .runtime import ATHLTHRuntimeData
from .webhook import async_handle_webhook

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the ATHLTH integration."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    domain_data.setdefault(DATA_RUNTIMES, {})

    if not domain_data.get(DATA_API_REGISTERED):
        hass.http.register_view(ATHLTHPairView())
        domain_data[DATA_API_REGISTERED] = True

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ATHLTH from a config entry."""
    data = dict(entry.data)

    webhook_id = data.get(CONF_WEBHOOK_ID)
    shared_secret = data.get(CONF_SHARED_SECRET)

    if not webhook_id:
        webhook_id = webhook.async_generate_id()
        data[CONF_WEBHOOK_ID] = webhook_id

    if not shared_secret:
        shared_secret = secrets.token_urlsafe(48)
        data[CONF_SHARED_SECRET] = shared_secret

    if data != dict(entry.data):
        hass.config_entries.async_update_entry(entry, data=data)

    runtime = ATHLTHRuntimeData(
        entry_id=entry.entry_id,
        webhook_id=webhook_id,
        shared_secret=shared_secret,
    )

    domain_data = hass.data.setdefault(DOMAIN, {})
    runtimes = domain_data.setdefault(DATA_RUNTIMES, {})
    runtimes[entry.entry_id] = runtime

    webhook.async_register(
        hass,
        DOMAIN,
        "ATHLTH",
        webhook_id,
        async_handle_webhook,
        local_only=False,
        allowed_methods=["POST"],
    )

    entry.async_on_unload(
        lambda: webhook.async_unregister(hass, webhook_id)
    )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an ATHLTH config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(
        entry, PLATFORMS
    )

    if unloaded:
        domain_data = hass.data.get(DOMAIN, {})
        runtimes = domain_data.get(DATA_RUNTIMES, {})
        runtimes.pop(entry.entry_id, None)

    return unloaded

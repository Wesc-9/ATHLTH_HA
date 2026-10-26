"""Hertz Freerider multi-country prototype for Home Assistant."""

from __future__ import annotations

from datetime import timedelta
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, POLL_INTERVAL_MINUTES

_LOGGER = logging.getLogger(__name__)
PLATFORMS = ["sensor"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Initialize the user-configured source and route filters."""
    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name="Hertz Freerider",
        update_method=_unconfigured_fetch,
        update_interval=timedelta(minutes=POLL_INTERVAL_MINUTES),
    )
    # Preserve config while the feed adapter is developed: unavailable rather
    # than falsely reporting zero cars, and no unverified site scraping.
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_update_options))
    return True


async def _unconfigured_fetch() -> list:
    """Fail explicitly until at least one supported listing adapter exists."""
    raise UpdateFailed(
        "No verified, authorized Freerider listing data adapter is configured"
    )


async def async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Apply new origin, destination and countries from the options UI."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload all entities without affecting other integrations."""
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        entry.async_unload()
    return ok

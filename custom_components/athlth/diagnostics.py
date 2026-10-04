"""Privacy-safe diagnostics for ATHLTH."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.redact import async_redact_data

from .const import (
    CONF_CLOUDHOOK_URL,
    CONF_SHARED_SECRET,
    CONF_WEBHOOK_ID,
    DATA_RUNTIMES,
    DOMAIN,
    SUPPORTED_EVENTS,
    SUPPORTED_PROTOCOL_VERSION,
    SUPPORTED_SIGNATURE_ALGORITHM,
)
from .runtime import ATHLTHRuntimeData

_TO_REDACT = {
    CONF_CLOUDHOOK_URL,
    CONF_SHARED_SECRET,
    CONF_WEBHOOK_ID,
}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return diagnostics without workout, health or identity data."""
    runtime: ATHLTHRuntimeData | None = (
        hass.data.get(DOMAIN, {})
        .get(DATA_RUNTIMES, {})
        .get(entry.entry_id)
    )

    return {
        "protocol_version": SUPPORTED_PROTOCOL_VERSION,
        "signature_algorithm": SUPPORTED_SIGNATURE_ALGORITHM,
        "supported_events": sorted(SUPPORTED_EVENTS),
        "entry_data": async_redact_data(dict(entry.data), _TO_REDACT),
        "connection": {
            "loaded": runtime is not None,
            "transport": (
                "cloudhook"
                if runtime is not None and runtime.uses_cloudhook
                else "webhook"
            ),
            "has_seen_client": (
                runtime is not None and runtime.last_seen is not None
            ),
        },
    }

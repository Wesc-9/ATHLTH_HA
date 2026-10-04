"""Authenticated pairing API for ATHLTH."""

from __future__ import annotations

from http import HTTPStatus
import secrets

from aiohttp import web

from homeassistant.components.http import KEY_HASS, HomeAssistantView, require_admin

from .const import (
    CONF_SHARED_SECRET,
    DATA_RUNTIMES,
    DOMAIN,
    PAIR_API_PATH,
    SUPPORTED_PROTOCOL_VERSION,
)
from .runtime import ATHLTHRuntimeData


class ATHLTHPairView(HomeAssistantView):
    """Return pairing material to an authenticated ATHLTH client."""

    url = PAIR_API_PATH
    name = "api:athlth:pair"
    requires_auth = True

    @require_admin
    async def post(self, request: web.Request) -> web.Response:
        """Pair the ATHLTH app with this Home Assistant instance."""
        hass = request.app[KEY_HASS]

        runtimes: dict[str, ATHLTHRuntimeData] = (
            hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
        )
        if not runtimes:
            return self.json(
                {
                    "error": "not_configured",
                    "message": "ATHLTH is not loaded in Home Assistant.",
                },
                status_code=HTTPStatus.CONFLICT,
            )

        runtime = next(iter(runtimes.values()))

        # A successful authenticated pairing rotates the shared secret.
        # Re-pairing therefore invalidates any previous ATHLTH client secret.
        shared_secret = secrets.token_urlsafe(48)
        runtime.shared_secret = shared_secret
        runtime.nonces.clear()

        entry = hass.config_entries.async_get_entry(runtime.entry_id)
        if entry is None:
            return self.json(
                {
                    "error": "entry_missing",
                    "message": "ATHLTH config entry is unavailable.",
                },
                status_code=HTTPStatus.CONFLICT,
            )

        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_SHARED_SECRET: shared_secret,
            },
        )

        return self.json(
            {
                "protocol_version": SUPPORTED_PROTOCOL_VERSION,
                "client_id": runtime.entry_id,
                "webhook_id": runtime.webhook_id,
                "webhook_url": runtime.webhook_url,
                "webhook_path": f"/api/webhook/{runtime.webhook_id}",
                "shared_secret": shared_secret,
                "signature_algorithm": "HMAC-SHA256",
                "transport": (
                    "cloudhook" if runtime.uses_cloudhook else "webhook"
                ),
                "capabilities": [
                    "workout_started",
                    "workout_updated",
                    "workout_finished",
                    "recovery_updated",
                    "training_load_updated",
                    "weekly_progress_updated",
                    "next_workout_updated",
                    "sync_snapshot",
                    "unpair",
                ],
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
            },
        )

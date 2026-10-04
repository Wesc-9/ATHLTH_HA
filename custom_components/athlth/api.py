"""Authenticated pairing API for ATHLTH."""

from __future__ import annotations

from http import HTTPStatus

from aiohttp import web

from homeassistant.components import webhook
from homeassistant.components.http import KEY_HASS, HomeAssistantView, require_admin

from .const import (
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
        webhook_url = webhook.async_generate_url(hass, runtime.webhook_id)

        return self.json(
            {
                "protocol_version": SUPPORTED_PROTOCOL_VERSION,
                "client_id": runtime.entry_id,
                "webhook_id": runtime.webhook_id,
                "webhook_url": webhook_url,
                "webhook_path": f"/api/webhook/{runtime.webhook_id}",
                "shared_secret": runtime.shared_secret,
                "signature_algorithm": "HMAC-SHA256",
                "capabilities": [
                    "workout_started",
                    "workout_updated",
                    "workout_finished",
                    "recovery_updated",
                    "training_load_updated",
                    "weekly_progress_updated",
                    "next_workout_updated",
                    "sync_snapshot",
                ],
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
            },
        )

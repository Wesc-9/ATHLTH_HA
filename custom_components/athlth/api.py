"""Authenticated pairing API for ATHLTH."""

from __future__ import annotations

from http import HTTPStatus
import re
import secrets

from aiohttp import web

from homeassistant.components.http import KEY_HASS, HomeAssistantView, require_admin
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    CONF_PRIMARY_CLIENT_ID,
    CONF_PRIMARY_CLIENT_NAME,
    CONF_SHARED_SECRET,
    DATA_RUNTIMES,
    DOMAIN,
    PAIR_API_PATH,
    SUPPORTED_EVENTS,
    SUPPORTED_PROTOCOL_VERSION,
    SUPPORTED_SIGNATURE_ALGORITHM,
    signal_client_added,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData

_CLIENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,96}$")


class ATHLTHPairView(HomeAssistantView):
    """Return pairing material to an authenticated ATHLTH client."""

    url = PAIR_API_PATH
    name = "api:athlth:pair"
    requires_auth = True

    @require_admin
    async def post(self, request: web.Request) -> web.Response:
        """Pair one ATHLTH app installation with this Home Assistant instance."""
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
        entry = hass.config_entries.async_get_entry(runtime.entry_id)
        if entry is None:
            return self.json(
                {
                    "error": "entry_missing",
                    "message": "ATHLTH config entry is unavailable.",
                },
                status_code=HTTPStatus.CONFLICT,
            )

        body: dict[str, object] = {}
        if request.can_read_body:
            try:
                decoded = await request.json()
            except (ValueError, TypeError):
                decoded = {}
            if isinstance(decoded, dict):
                body = decoded

        requested_client_id = body.get("client_id")
        if requested_client_id is not None and (
            not isinstance(requested_client_id, str)
            or not _CLIENT_ID_PATTERN.fullmatch(requested_client_id)
        ):
            return self.json(
                {"error": "invalid_client_id"},
                status_code=HTTPStatus.BAD_REQUEST,
            )

        requested_name = body.get("client_name")
        if not isinstance(requested_name, str):
            requested_name = "ATHLTH"
        requested_name = requested_name.strip()[:64] or "ATHLTH"

        # Legacy app builds did not send a client id. They remain mapped to
        # the primary client. New builds send a stable random installation id.
        client_id = requested_client_id or runtime.primary_client_id
        created_client = False

        primary = runtime.primary_client

        # If this is the first modern pairing, claim the placeholder primary
        # id without changing the existing primary entity unique IDs.
        if (
            requested_client_id
            and runtime.primary_client_id == runtime.entry_id
            and client_id not in runtime.clients
            and len(runtime.clients) == 1
        ):
            runtime.clients.pop(runtime.primary_client_id, None)
            primary.client_id = client_id
            primary.name = requested_name
            runtime.primary_client_id = client_id
            runtime.clients[client_id] = primary

        client = runtime.resolve_client(client_id)

        if client is None:
            client = ATHLTHClientRuntime(
                client_id=client_id,
                name=requested_name,
                shared_secret=secrets.token_urlsafe(48),
            )
            runtime.clients[client_id] = client
            created_client = True
        else:
            client.name = requested_name
            client.shared_secret = secrets.token_urlsafe(48)
            client.nonces.clear()
            client.delivery_ids.clear()

        if client.is_primary or client.client_id == runtime.primary_client_id:
            client.is_primary = True
            hass.config_entries.async_update_entry(
                entry,
                data={
                    **entry.data,
                    CONF_PRIMARY_CLIENT_ID: runtime.primary_client_id,
                    CONF_PRIMARY_CLIENT_NAME: client.name,
                    CONF_SHARED_SECRET: client.shared_secret,
                },
            )
            if runtime.delivery_store is not None:
                await runtime.delivery_store.async_save(
                    {"delivery_ids": {}}
                )
        else:
            await runtime.async_save_additional_clients()

        if created_client:
            async_dispatcher_send(
                hass,
                signal_client_added(runtime.entry_id),
                client.client_id,
            )

        webhook_path = f"/api/webhook/{runtime.webhook_id}"
        webhook_url = runtime.webhook_url
        if webhook_url.startswith("/"):
            webhook_url = (
                f"{request.scheme}://{request.host}{webhook_path}"
            )

        return self.json(
            {
                "protocol_version": SUPPORTED_PROTOCOL_VERSION,
                "client_id": client.client_id,
                "webhook_id": runtime.webhook_id,
                "webhook_url": webhook_url,
                "webhook_path": webhook_path,
                "shared_secret": client.shared_secret,
                "signature_algorithm": SUPPORTED_SIGNATURE_ALGORITHM,
                "transport": (
                    "cloudhook" if runtime.uses_cloudhook else "webhook"
                ),
                "capabilities": sorted(SUPPORTED_EVENTS),
                "multi_client": True,
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache",
            },
        )

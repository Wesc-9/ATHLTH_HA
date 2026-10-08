"""Pairing APIs for ATHLTH."""

from __future__ import annotations

from http import HTTPStatus
import ipaddress
import re
import secrets
from typing import Any

from aiohttp import web

from homeassistant.components.http import KEY_HASS, HomeAssistantView, require_admin
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    CONF_PRIMARY_CLIENT_ID,
    CONF_PRIMARY_CLIENT_NAME,
    CONF_SHARED_SECRET,
    DATA_RUNTIMES,
    DOMAIN,
    PAIR_API_PATH,
    PAIR_LOCAL_API_PATH,
    SUPPORTED_EVENTS,
    SUPPORTED_PROTOCOL_VERSION,
    SUPPORTED_SIGNATURE_ALGORITHM,
    signal_client_added,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData

_CLIENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,96}$")
_PAIRING_CODE_PATTERN = re.compile(r"^\d{6}$")
# Tailscale uses shared-address-space IPv4, which is not is_private.
# Membership here permits only the same short-lived, rate-limited code exchange.
# It does NOT prove that a request came from an authenticated tailnet.
_TAILSCALE_ADDRESS_SPACE = ipaddress.ip_network("100.64.0.0/10")


class ATHLTHPairView(HomeAssistantView):
    """Return pairing material to an authenticated ATHLTH client."""

    url = PAIR_API_PATH
    name = "api:athlth:pair"
    requires_auth = True

    @require_admin
    async def post(self, request: web.Request) -> web.Response:
        """Pair one ATHLTH app installation through Home Assistant OAuth."""
        hass = request.app[KEY_HASS]
        resolved = _runtime_and_entry(hass)
        if isinstance(resolved, web.Response):
            return resolved

        runtime, entry = resolved
        body = await _async_read_body(request)
        return await _async_pair_client(
            hass,
            request,
            runtime,
            entry,
            body,
        )


class ATHLTHLocalPairView(HomeAssistantView):
    """Pair ATHLTH with a short-lived code on the local network."""

    url = PAIR_LOCAL_API_PATH
    name = "api:athlth:pair:local"
    requires_auth = False

    async def post(self, request: web.Request) -> web.Response:
        """Exchange a one-time local code for permanent pairing material."""
        if not _request_is_local(request):
            return _json_error(
                "local_network_required",
                HTTPStatus.FORBIDDEN,
            )

        hass = request.app[KEY_HASS]
        resolved = _runtime_and_entry(hass)
        if isinstance(resolved, web.Response):
            return resolved

        runtime, entry = resolved
        body = await _async_read_body(request)

        code = body.get("pairing_code")
        if (
            not isinstance(code, str)
            or not _PAIRING_CODE_PATTERN.fullmatch(code)
        ):
            return _json_error(
                "invalid_pairing_code",
                HTTPStatus.BAD_REQUEST,
            )

        if not runtime.verify_pairing_code(code):
            return _json_error(
                "invalid_or_expired_pairing_code",
                HTTPStatus.UNAUTHORIZED,
            )

        return await _async_pair_client(
            hass,
            request,
            runtime,
            entry,
            body,
        )


def _request_is_local(request: web.Request) -> bool:
    """Allow unauthenticated pairing-code exchange only from local addresses."""
    remote = request.remote
    if not remote:
        return False

    try:
        address = ipaddress.ip_address(remote)
    except ValueError:
        return False

    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or (
            isinstance(address, ipaddress.IPv4Address)
            and address in _TAILSCALE_ADDRESS_SPACE
        )
    )


def _runtime_and_entry(
    hass: HomeAssistant,
) -> tuple[ATHLTHRuntimeData, ConfigEntry] | web.Response:
    runtimes: dict[str, ATHLTHRuntimeData] = (
        hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
    )
    if not runtimes:
        return _json_error(
            "not_configured",
            HTTPStatus.CONFLICT,
            "ATHLTH is not loaded in Home Assistant.",
        )

    runtime = next(iter(runtimes.values()))
    entry = hass.config_entries.async_get_entry(runtime.entry_id)
    if entry is None:
        return _json_error(
            "entry_missing",
            HTTPStatus.CONFLICT,
            "ATHLTH config entry is unavailable.",
        )

    return runtime, entry


async def _async_read_body(
    request: web.Request,
) -> dict[str, Any]:
    if not request.can_read_body:
        return {}

    try:
        decoded = await request.json()
    except (ValueError, TypeError):
        return {}

    return decoded if isinstance(decoded, dict) else {}


async def _async_pair_client(
    hass: HomeAssistant,
    request: web.Request,
    runtime: ATHLTHRuntimeData,
    entry: ConfigEntry,
    body: dict[str, Any],
) -> web.Response:
    requested_client_id = body.get("client_id")
    if requested_client_id is not None and (
        not isinstance(requested_client_id, str)
        or not _CLIENT_ID_PATTERN.fullmatch(requested_client_id)
    ):
        return _json_error(
            "invalid_client_id",
            HTTPStatus.BAD_REQUEST,
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

    # If this is the first modern pairing, claim the placeholder primary id
    # without changing the existing primary entity unique IDs.
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

    return web.json_response(
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
            "pairing_method": (
                "local_code"
                if request.path == PAIR_LOCAL_API_PATH
                else "oauth"
            ),
        },
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )


def _json_error(
    code: str,
    status: HTTPStatus,
    message: str | None = None,
) -> web.Response:
    payload: dict[str, str] = {"error": code}
    if message:
        payload["message"] = message

    return web.json_response(
        payload,
        status=int(status),
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )

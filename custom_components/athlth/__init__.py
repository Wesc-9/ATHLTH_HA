"""ATHLTH integration for Home Assistant."""

from __future__ import annotations

import contextlib
import secrets
from typing import Any

from homeassistant.components import webhook
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.network import NoURLAvailableError
from homeassistant.helpers.storage import Store

from .actions import async_register_services
from .api import ATHLTHLocalPairView, ATHLTHPairView
from .const import (
    CONF_CLOUDHOOK_URL,
    CONF_PRIMARY_CLIENT_ID,
    CONF_PRIMARY_CLIENT_NAME,
    CONF_SHARED_SECRET,
    CONF_WEBHOOK_ID,
    DATA_API_REGISTERED,
    DATA_RUNTIMES,
    DOMAIN,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData
from .webhook import async_handle_webhook

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.CALENDAR,
    Platform.EVENT,
    Platform.BUTTON,
    Platform.NOTIFY,
]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the ATHLTH integration."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    domain_data.setdefault(DATA_RUNTIMES, {})

    if not domain_data.get(DATA_API_REGISTERED):
        hass.http.register_view(ATHLTHPairView())
        hass.http.register_view(ATHLTHLocalPairView())
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

    webhook_url, uses_cloudhook = await _async_resolve_webhook_url(
        hass,
        webhook_id,
        data,
    )

    primary_client_id = data.get(
        CONF_PRIMARY_CLIENT_ID,
        entry.entry_id,
    )
    primary_client_name = data.get(
        CONF_PRIMARY_CLIENT_NAME,
        "ATHLTH",
    )

    if CONF_PRIMARY_CLIENT_ID not in data:
        data[CONF_PRIMARY_CLIENT_ID] = primary_client_id
    if CONF_PRIMARY_CLIENT_NAME not in data:
        data[CONF_PRIMARY_CLIENT_NAME] = primary_client_name

    delivery_store: Store = Store(
        hass,
        1,
        f"{DOMAIN}.{entry.entry_id}.delivery_ids",
    )
    stored_delivery_data = await delivery_store.async_load() or {}
    raw_delivery_ids = stored_delivery_data.get("delivery_ids", {})
    primary_delivery_ids = {
        key: float(value)
        for key, value in raw_delivery_ids.items()
        if isinstance(key, str)
        and isinstance(value, (int, float))
    }

    client_store: Store = Store(
        hass,
        1,
        f"{DOMAIN}.{entry.entry_id}.clients",
    )
    stored_clients_data = await client_store.async_load() or {}
    raw_clients = stored_clients_data.get("clients", {})
    raw_primary_pending_commands = stored_clients_data.get(
        "primary_pending_commands",
        [],
    )
    primary_pending_commands = (
        [
            command
            for command in raw_primary_pending_commands
            if isinstance(command, dict)
        ][-16:]
        if isinstance(raw_primary_pending_commands, list)
        else []
    )
    raw_primary_calendar_events = stored_clients_data.get(
        "primary_calendar_events",
        [],
    )
    primary_state = {
        "calendar_events": raw_primary_calendar_events
    } if isinstance(raw_primary_calendar_events, list) else {}

    clients: dict[str, ATHLTHClientRuntime] = {
        primary_client_id: ATHLTHClientRuntime(
            client_id=primary_client_id,
            name=primary_client_name,
            shared_secret=shared_secret,
            delivery_ids=primary_delivery_ids,
            pending_commands=primary_pending_commands,
            state=primary_state,
            is_primary=True,
        )
    }

    if isinstance(raw_clients, dict):
        for client_id, raw_client in raw_clients.items():
            if (
                not isinstance(client_id, str)
                or not isinstance(raw_client, dict)
                or client_id == primary_client_id
            ):
                continue

            additional_secret = raw_client.get("shared_secret")
            if not isinstance(additional_secret, str) or not additional_secret:
                continue

            additional_name = raw_client.get("name")
            if not isinstance(additional_name, str) or not additional_name:
                additional_name = "ATHLTH"

            raw_additional_delivery_ids = raw_client.get(
                "delivery_ids",
                {},
            )
            additional_delivery_ids = (
                {
                    key: float(value)
                    for key, value in raw_additional_delivery_ids.items()
                    if isinstance(key, str)
                    and isinstance(value, (int, float))
                }
                if isinstance(raw_additional_delivery_ids, dict)
                else {}
            )
            raw_pending_commands = raw_client.get(
                "pending_commands",
                [],
            )
            pending_commands = (
                [
                    command
                    for command in raw_pending_commands
                    if isinstance(command, dict)
                ][-16:]
                if isinstance(raw_pending_commands, list)
                else []
            )
            raw_calendar_events = raw_client.get(
                "calendar_events",
                [],
            )
            additional_state = {
                "calendar_events": raw_calendar_events
            } if isinstance(raw_calendar_events, list) else {}

            clients[client_id] = ATHLTHClientRuntime(
                client_id=client_id,
                name=additional_name,
                shared_secret=additional_secret,
                delivery_ids=additional_delivery_ids,
                pending_commands=pending_commands,
                state=additional_state,
            )

    if data != dict(entry.data):
        hass.config_entries.async_update_entry(entry, data=data)

    runtime = ATHLTHRuntimeData(
        entry_id=entry.entry_id,
        webhook_id=webhook_id,
        webhook_url=webhook_url,
        uses_cloudhook=uses_cloudhook,
        clients=clients,
        primary_client_id=primary_client_id,
        client_store=client_store,
        delivery_store=delivery_store,
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
    await async_register_services(hass)
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


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove cloud resources belonging to an ATHLTH entry."""
    if (
        entry.data.get(CONF_CLOUDHOOK_URL)
        and "cloud" in hass.config.components
    ):
        from homeassistant.components import cloud

        with contextlib.suppress(
            cloud.CloudNotAvailable,
            cloud.CloudNotConnected,
        ):
            await cloud.async_delete_cloudhook(
                hass,
                entry.data[CONF_WEBHOOK_ID],
            )


async def _async_resolve_webhook_url(
    hass: HomeAssistant,
    webhook_id: str,
    data: dict[str, Any],
) -> tuple[str, bool]:
    """Prefer a cloudhook, then an external URL, then local access."""
    if "cloud" in hass.config.components:
        from homeassistant.components import cloud

        if (
            cloud.async_active_subscription(hass)
            and cloud.async_is_connected(hass)
        ):
            cloudhook_url = await cloud.async_get_or_create_cloudhook(
                hass, webhook_id
            )
            data[CONF_CLOUDHOOK_URL] = cloudhook_url
            return cloudhook_url, True

    data.pop(CONF_CLOUDHOOK_URL, None)

    try:
        return (
            webhook.async_generate_url(
                hass,
                webhook_id,
                prefer_external=True,
            ),
            False,
        )
    except NoURLAvailableError:
        # Home Assistant can be configured without an internal/external URL
        # that is usable during config-entry setup. Do not fail the whole
        # integration in that case. The authenticated pairing request later
        # provides the actual origin ATHLTH used to reach this instance.
        return (
            webhook.async_generate_path(webhook_id),
            False,
        )

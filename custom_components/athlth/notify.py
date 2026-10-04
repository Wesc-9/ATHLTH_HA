"""Notify entity for messages delivered to ATHLTH."""

from __future__ import annotations

from homeassistant.components.notify import NotifyEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DATA_RUNTIMES, DOMAIN, signal_client_added, signal_update
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up one ATHLTH notify entity per paired app installation."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][entry.entry_id]
    added_clients: set[str] = set()

    def add_client(client_id: str) -> None:
        client = runtime.clients.get(client_id)
        if client is None or client_id in added_clients:
            return
        added_clients.add(client_id)
        async_add_entities([ATHLTHNotifyEntity(entry, runtime, client)])

    for client in runtime.public_clients():
        add_client(client.client_id)

    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            signal_client_added(entry.entry_id),
            add_client,
        )
    )


class ATHLTHNotifyEntity(NotifyEntity):
    """Queue a Home Assistant message for ATHLTH."""

    _attr_has_entity_name = True
    _attr_name = "Notification"
    _attr_icon = "mdi:message-badge-outline"

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
        client: ATHLTHClientRuntime,
    ) -> None:
        self._entry_id = entry.entry_id
        self._runtime = runtime
        self._client = client

        if client.is_primary:
            unique_prefix = entry.entry_id
            device_identifier = entry.entry_id
            device_name = "ATHLTH"
        else:
            unique_prefix = f"{entry.entry_id}_{client.client_id}"
            device_identifier = f"{entry.entry_id}:{client.client_id}"
            suffix = client.client_id[-4:]
            device_name = f"{client.name} · {suffix}"

        self._attr_unique_id = f"{unique_prefix}_notification"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    async def async_send_message(
        self,
        message: str,
        title: str | None = None,
    ) -> None:
        """Queue a notification for delivery on the next ATHLTH sync."""
        await self._runtime.async_enqueue_command(
            self._client.client_id,
            "notification",
            title=title or "Home Assistant",
            message=message,
        )
        self._async_record_notification()
        async_dispatcher_send(self.hass, signal_update(self._entry_id))

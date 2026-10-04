"""Event entities exposed by ATHLTH."""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import (
    DATA_RUNTIMES,
    DOMAIN,
    USER_EVENT_TYPES,
    signal_client_added,
    signal_event,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up ATHLTH event entities."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][
        entry.entry_id
    ]
    added_clients: set[str] = set()

    def add_client(client_id: str) -> None:
        client = runtime.clients.get(client_id)
        if client is None or client_id in added_clients:
            return
        added_clients.add(client_id)
        async_add_entities([ATHLTHEventEntity(entry, runtime, client)])

    for client in runtime.public_clients():
        add_client(client.client_id)

    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            signal_client_added(entry.entry_id),
            add_client,
        )
    )


class ATHLTHEventEntity(EventEntity):
    """User-visible ATHLTH event stream for one app installation."""

    _attr_has_entity_name = True
    _attr_name = "Events"
    _attr_icon = "mdi:run-fast"
    _attr_event_types = list(USER_EVENT_TYPES)

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
        client: ATHLTHClientRuntime,
    ) -> None:
        self._entry_id = entry.entry_id
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

        self._attr_unique_id = f"{unique_prefix}_events"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    async def async_added_to_hass(self) -> None:
        """Subscribe after the entity has been added to Home Assistant."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_event(self._entry_id),
                self._handle_event,
            )
        )

    @callback
    def _handle_event(
        self,
        client_id: str,
        event_type: str,
        payload: dict,
    ) -> None:
        if client_id != self._client.client_id:
            return
        if event_type not in USER_EVENT_TYPES:
            return

        self._trigger_event(event_type, payload)
        self.async_write_ha_state()

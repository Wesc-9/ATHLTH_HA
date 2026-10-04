"""Safe commands exposed as Home Assistant button entities."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.button import ButtonEntity, ButtonEntityDescription
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


@dataclass(frozen=True, kw_only=True)
class ATHLTHButtonDescription(ButtonEntityDescription):
    command_type: str


BUTTONS = (
    ATHLTHButtonDescription(
        key="refresh_data",
        name="Refresh ATHLTH data",
        icon="mdi:sync",
        command_type="sync_now",
    ),
    ATHLTHButtonDescription(
        key="show_next_workout",
        name="Show next workout",
        icon="mdi:calendar-clock",
        command_type="show_next_workout",
    ),
    ATHLTHButtonDescription(
        key="training_reminder",
        name="Training reminder",
        icon="mdi:bell-ring-outline",
        command_type="training_reminder",
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up safe ATHLTH button entities."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][entry.entry_id]
    added_clients: set[str] = set()

    def add_client(client_id: str) -> None:
        client = runtime.clients.get(client_id)
        if client is None or client_id in added_clients:
            return
        added_clients.add(client_id)
        async_add_entities(
            ATHLTHButton(entry, runtime, client, description)
            for description in BUTTONS
        )

    for client in runtime.public_clients():
        add_client(client.client_id)

    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            signal_client_added(entry.entry_id),
            add_client,
        )
    )


class ATHLTHButton(ButtonEntity):
    """Queue a safe action for the paired ATHLTH app."""

    _attr_has_entity_name = True

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
        client: ATHLTHClientRuntime,
        description: ATHLTHButtonDescription,
    ) -> None:
        self.entity_description = description
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

        self._attr_unique_id = f"{unique_prefix}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    async def async_press(self) -> None:
        """Queue the button command for the next signed ATHLTH sync."""
        command_type = self.entity_description.command_type
        title: str | None = None
        message: str | None = None

        if command_type == "show_next_workout":
            title = "Next ATHLTH workout"
            workout = self._client.state.get("next_workout")
            scheduled = self._client.state.get("next_workout_time")
            if workout and scheduled:
                message = f"{workout} · {scheduled}"
            elif workout:
                message = str(workout)
            else:
                message = "No planned workout is currently available."

        elif command_type == "training_reminder":
            title = "ATHLTH"
            message = "Your training reminder from Home Assistant."

        await self._runtime.async_enqueue_command(
            self._client.client_id,
            command_type,
            title=title,
            message=message,
        )
        async_dispatcher_send(self.hass, signal_update(self._entry_id))

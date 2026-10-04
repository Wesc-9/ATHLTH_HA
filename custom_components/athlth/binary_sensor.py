"""Binary sensors exposed by ATHLTH."""

from __future__ import annotations

from typing import override

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    DATA_RUNTIMES,
    DOMAIN,
    signal_client_added,
    signal_update,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up ATHLTH workout-state sensors for all paired clients."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][
        entry.entry_id
    ]
    added_clients: set[str] = set()

    def add_client(client_id: str) -> None:
        client = runtime.clients.get(client_id)
        if client is None or client_id in added_clients:
            return

        added_clients.add(client_id)
        async_add_entities(
            [
                ATHLTHWorkoutActiveBinarySensor(
                    entry,
                    runtime,
                    client,
                )
            ]
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


class ATHLTHWorkoutActiveBinarySensor(RestoreEntity, BinarySensorEntity):
    """Show whether one ATHLTH client currently has an active workout."""

    _attr_has_entity_name = True
    _attr_name = "Workout active"
    _attr_icon = "mdi:run-fast"
    _attr_should_poll = False

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

        self._attr_unique_id = f"{unique_prefix}_workout_active"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def is_on(self) -> bool:
        """Return whether a workout is active."""
        return bool(self._client.state.get("workout_active", False))

    @property
    def extra_state_attributes(self):
        """Return the active workout name when available."""
        return {
            key: value
            for key, value in {
                "active_workout": self._client.state.get("active_workout"),
                "workout_type": self._client.state.get("active_workout_type"),
                "started_at": self._client.state.get("active_workout_started_at"),
                "device": self._client.state.get("active_workout_device"),
                "last_seen": self._client.last_seen,
            }.items()
            if value is not None
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Restore the previous value and subscribe to webhook updates."""
        await super().async_added_to_hass()

        if "workout_active" not in self._client.state:
            restored = await self.async_get_last_state()
            if restored is not None:
                self._client.state["workout_active"] = (
                    restored.state == STATE_ON
                )
                active_workout = restored.attributes.get(
                    "active_workout"
                )
                if isinstance(active_workout, str) and active_workout:
                    self._client.state["active_workout"] = active_workout

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )

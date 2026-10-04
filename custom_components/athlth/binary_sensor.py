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

from .const import DATA_RUNTIMES, DOMAIN, signal_update
from .runtime import ATHLTHRuntimeData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up ATHLTH binary sensors."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][
        entry.entry_id
    ]
    async_add_entities([ATHLTHWorkoutActiveBinarySensor(entry, runtime)])


class ATHLTHWorkoutActiveBinarySensor(RestoreEntity, BinarySensorEntity):
    """Show whether ATHLTH currently has an active workout."""

    _attr_has_entity_name = True
    _attr_name = "Workout active"
    _attr_icon = "mdi:run-fast"
    _attr_should_poll = False

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
    ) -> None:
        self._entry_id = entry.entry_id
        self._runtime = runtime
        self._attr_unique_id = f"{entry.entry_id}_workout_active"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="ATHLTH",
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def is_on(self) -> bool:
        """Return whether a workout is active."""
        return bool(self._runtime.state.get("workout_active", False))

    @property
    def extra_state_attributes(self):
        """Return the active workout name when available."""
        return {
            "active_workout": self._runtime.state.get("active_workout"),
            "last_seen": self._runtime.last_seen,
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Restore the previous value and subscribe to webhook updates."""
        await super().async_added_to_hass()

        if "workout_active" not in self._runtime.state:
            restored = await self.async_get_last_state()
            if restored is not None:
                self._runtime.state["workout_active"] = restored.state == STATE_ON
                active_workout = restored.attributes.get(
                    "active_workout"
                )
                if isinstance(active_workout, str) and active_workout:
                    self._runtime.state["active_workout"] = active_workout

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )

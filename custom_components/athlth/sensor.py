"""Sensors exposed by ATHLTH."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DATA_RUNTIMES, DOMAIN, signal_update
from .runtime import ATHLTHRuntimeData

SENSORS: tuple[SensorEntityDescription, ...] = (
    SensorEntityDescription(
        key="last_workout",
        name="Last workout",
        icon="mdi:run",
    ),
    SensorEntityDescription(
        key="recovery_score",
        name="Recovery score",
        icon="mdi:heart-pulse",
        native_unit_of_measurement="%",
    ),
    SensorEntityDescription(
        key="training_load",
        name="Training load",
        icon="mdi:chart-line",
    ),
    SensorEntityDescription(
        key="weekly_progress",
        name="Weekly progress",
        icon="mdi:progress-check",
        native_unit_of_measurement="%",
    ),
    SensorEntityDescription(
        key="next_workout",
        name="Next workout",
        icon="mdi:calendar-clock",
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up ATHLTH sensors."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][
        entry.entry_id
    ]
    async_add_entities(
        ATHLTHSensor(entry, runtime, description)
        for description in SENSORS
    )


class ATHLTHSensor(SensorEntity):
    """Representation of an ATHLTH sensor."""

    _attr_has_entity_name = True

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
        description: SensorEntityDescription,
    ) -> None:
        self.entity_description = description
        self._entry_id = entry.entry_id
        self._runtime = runtime
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="ATHLTH",
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def native_value(self):
        """Return the latest state received from ATHLTH."""
        return self._runtime.state.get(self.entity_description.key)

    @property
    def extra_state_attributes(self):
        """Return non-sensitive connection metadata."""
        return {
            "last_seen": self._runtime.last_seen,
            "last_event": self._runtime.state.get("last_event"),
        }

    async def async_added_to_hass(self) -> None:
        """Subscribe to ATHLTH webhook updates."""
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )

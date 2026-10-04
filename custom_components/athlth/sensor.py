"""Sensors exposed by ATHLTH."""

from __future__ import annotations

from typing import override

from homeassistant.components.sensor import (
    RestoreSensor,
    SensorEntity,
    SensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import (
    DATA_RUNTIMES,
    DOMAIN,
    signal_client_added,
    signal_update,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData

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
        native_unit_of_measurement="x",
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
    """Set up ATHLTH sensors for all paired clients."""
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
            ATHLTHSensor(entry, runtime, client, description)
            for description in SENSORS
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


class ATHLTHSensor(RestoreSensor, SensorEntity):
    """Representation of an ATHLTH sensor for one paired client."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        entry: ConfigEntry,
        runtime: ATHLTHRuntimeData,
        client: ATHLTHClientRuntime,
        description: SensorEntityDescription,
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

    @property
    def native_value(self):
        """Return the latest state received from this ATHLTH client."""
        return self._client.state.get(self.entity_description.key)

    @property
    def extra_state_attributes(self):
        """Return non-sensitive connection metadata."""
        return {
            "last_seen": self._client.last_seen,
            "last_event": self._client.state.get("last_event"),
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Restore the previous value and subscribe to webhook updates."""
        await super().async_added_to_hass()

        key = self.entity_description.key
        if key not in self._client.state:
            restored = await self.async_get_last_sensor_data()
            if restored is not None and restored.native_value is not None:
                self._client.state[key] = restored.native_value

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )

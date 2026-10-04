"""Sensors exposed by ATHLTH."""

from __future__ import annotations

from datetime import datetime
from typing import override

from homeassistant.components.sensor import (
    RestoreSensor,
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfLength, UnitOfMass, UnitOfSpeed, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

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
    SensorEntityDescription(
        key="next_workout_time",
        name="Next workout time",
        icon="mdi:calendar-clock",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    SensorEntityDescription(
        key="sleep_duration_minutes",
        name="Sleep duration",
        icon="mdi:sleep",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.MINUTES,
    ),
    SensorEntityDescription(
        key="hrv_milliseconds",
        name="HRV",
        icon="mdi:heart-pulse",
        native_unit_of_measurement="ms",
    ),
    SensorEntityDescription(
        key="resting_heart_rate",
        name="Resting heart rate",
        icon="mdi:heart",
        native_unit_of_measurement="bpm",
    ),
    SensorEntityDescription(
        key="respiratory_rate",
        name="Respiratory rate",
        icon="mdi:lungs",
        native_unit_of_measurement="breaths/min",
    ),
    SensorEntityDescription(
        key="weekly_training_minutes",
        name="Weekly training minutes",
        icon="mdi:timer-outline",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.MINUTES,
    ),
    SensorEntityDescription(
        key="weekly_distance_km",
        name="Weekly distance",
        icon="mdi:map-marker-distance",
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.KILOMETERS,
    ),
    SensorEntityDescription(
        key="recovery_state",
        name="Recovery state",
        icon="mdi:heart-check",
    ),
    SensorEntityDescription(
        key="active_goal",
        name="Active goal",
        icon="mdi:target",
    ),
    SensorEntityDescription(
        key="goal_progress",
        name="Goal progress",
        icon="mdi:bullseye-arrow",
        native_unit_of_measurement="%",
    ),
    SensorEntityDescription(
        key="goal_days_remaining",
        name="Goal days remaining",
        icon="mdi:calendar-end",
        native_unit_of_measurement=UnitOfTime.DAYS,
    ),
    SensorEntityDescription(
        key="training_streak",
        name="Training streak",
        icon="mdi:fire",
        native_unit_of_measurement=UnitOfTime.DAYS,
    ),
    SensorEntityDescription(
        key="weekly_workout_count",
        name="Weekly workout count",
        icon="mdi:counter",
    ),
    SensorEntityDescription(
        key="last_sync",
        name="Last sync",
        icon="mdi:cloud-sync",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    SensorEntityDescription(
        key="pending_delivery_count",
        name="Pending deliveries",
        icon="mdi:tray-arrow-up",
    ),
    SensorEntityDescription(
        key="pending_commands",
        name="Pending commands",
        icon="mdi:tray-arrow-down",
    ),
    SensorEntityDescription(
        key="workout_phase",
        name="Workout phase",
        icon="mdi:progress-clock",
    ),
    SensorEntityDescription(
        key="active_workout_elapsed_seconds",
        name="Workout elapsed",
        icon="mdi:timer-outline",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.SECONDS,
    ),
    SensorEntityDescription(
        key="active_workout_distance_meters",
        name="Workout distance",
        icon="mdi:map-marker-distance",
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.METERS,
    ),
    SensorEntityDescription(
        key="active_workout_pace_seconds_per_km",
        name="Workout pace",
        icon="mdi:speedometer",
        native_unit_of_measurement="s/km",
    ),
    SensorEntityDescription(
        key="active_workout_speed_kmh",
        name="Workout speed",
        icon="mdi:speedometer",
        native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR,
    ),
    SensorEntityDescription(
        key="active_workout_heart_rate_bpm",
        name="Workout heart rate",
        icon="mdi:heart-pulse",
        native_unit_of_measurement="bpm",
    ),
    SensorEntityDescription(
        key="active_workout_heart_rate_zone",
        name="Workout heart rate zone",
        icon="mdi:heart-circle",
    ),
    SensorEntityDescription(
        key="active_workout_environment",
        name="Workout environment",
        icon="mdi:home-map-marker",
    ),
    SensorEntityDescription(
        key="treadmill_incline_percent",
        name="Treadmill incline",
        icon="mdi:angle-acute",
        native_unit_of_measurement="%",
    ),
    SensorEntityDescription(
        key="current_exercise",
        name="Current exercise",
        icon="mdi:dumbbell",
    ),
    SensorEntityDescription(
        key="current_exercise_index",
        name="Exercise number",
        icon="mdi:format-list-numbered",
    ),
    SensorEntityDescription(
        key="current_set",
        name="Current set",
        icon="mdi:counter",
    ),
    SensorEntityDescription(
        key="current_set_index",
        name="Set index",
        icon="mdi:counter",
    ),
    SensorEntityDescription(
        key="current_set_total",
        name="Set total",
        icon="mdi:counter",
    ),
    SensorEntityDescription(
        key="current_reps",
        name="Current reps",
        icon="mdi:repeat",
    ),
    SensorEntityDescription(
        key="current_weight_kg",
        name="Current weight",
        icon="mdi:weight-kilogram",
        native_unit_of_measurement=UnitOfMass.KILOGRAMS,
    ),
    SensorEntityDescription(
        key="current_resistance_level",
        name="Resistance level",
        icon="mdi:tune-vertical",
    ),
    SensorEntityDescription(
        key="current_rest_seconds",
        name="Rest remaining",
        icon="mdi:timer-sand",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.SECONDS,
    ),
    SensorEntityDescription(
        key="current_row_distance_meters",
        name="Row distance",
        icon="mdi:rowing",
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.METERS,
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
        key = self.entity_description.key

        if key == "last_sync":
            if self._client.last_seen is None:
                return None
            return dt_util.utc_from_timestamp(
                self._client.last_seen
            )

        if key == "pending_commands":
            return len(self._client.pending_commands)

        value = self._client.state.get(key)

        if (
            self.entity_description.device_class == SensorDeviceClass.TIMESTAMP
            and isinstance(value, str)
        ):
            return dt_util.parse_datetime(value)

        return value

    @property
    def extra_state_attributes(self):
        """Return non-sensitive metadata and useful workout details."""
        attributes = {
            "last_seen": self._client.last_seen,
            "last_event": self._client.state.get("last_event"),
        }

        if self.entity_description.key == "last_workout":
            attributes.update(
                {
                    "type": self._client.state.get("last_workout_type"),
                    "duration_seconds": self._client.state.get(
                        "last_workout_duration_seconds"
                    ),
                    "distance_meters": self._client.state.get(
                        "last_workout_distance_meters"
                    ),
                    "ended_at": self._client.state.get(
                        "last_workout_ended_at"
                    ),
                    "device": self._client.state.get(
                        "last_workout_device"
                    ),
                }
            )

        if self.entity_description.key == "next_workout":
            attributes["scheduled_at"] = self._client.state.get(
                "next_workout_time"
            )

        return {
            key: value
            for key, value in attributes.items()
            if value is not None
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Restore the previous value and subscribe to webhook updates."""
        await super().async_added_to_hass()

        key = self.entity_description.key
        if key in {"last_sync", "pending_commands"}:
            self.async_on_remove(
                async_dispatcher_connect(
                    self.hass,
                    signal_update(self._entry_id),
                    self.async_write_ha_state,
                )
            )
            return

        if key not in self._client.state:
            restored = await self.async_get_last_sensor_data()
            if restored is not None and restored.native_value is not None:
                value = restored.native_value
                if isinstance(value, datetime):
                    value = value.isoformat()
                self._client.state[key] = value

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )

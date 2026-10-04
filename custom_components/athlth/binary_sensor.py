"""Binary sensors exposed by ATHLTH."""

from __future__ import annotations

from datetime import timedelta
import time
from typing import override

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_time_interval
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
                ),
                ATHLTHConnectionBinarySensor(
                    entry,
                    runtime,
                    client,
                ),
                ATHLTHConnectionHealthyBinarySensor(
                    entry,
                    runtime,
                    client,
                ),
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



class ATHLTHConnectionBinarySensor(BinarySensorEntity):
    """Show whether an ATHLTH app installation is paired."""

    _attr_has_entity_name = True
    _attr_name = "Connected"
    _attr_icon = "mdi:link-variant"
    _attr_should_poll = False
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

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

        self._attr_unique_id = f"{unique_prefix}_connected"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def is_on(self) -> bool:
        """A loaded client with pairing material is connected."""
        return bool(self._client.shared_secret)

    @property
    def extra_state_attributes(self):
        """Expose non-sensitive synchronization health."""
        return {
            "last_seen": self._client.last_seen,
            "pending_commands": len(self._client.pending_commands),
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Subscribe to ATHLTH runtime updates."""
        await super().async_added_to_hass()

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )



class ATHLTHConnectionHealthyBinarySensor(BinarySensorEntity):
    """Summarize pairing, synchronization freshness and queue health."""

    _attr_has_entity_name = True
    _attr_name = "Connection healthy"
    _attr_icon = "mdi:heart-pulse"
    _attr_should_poll = False
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

    _stale_after_seconds = 12 * 60 * 60
    _queue_warning = 8

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

        self._attr_unique_id = f"{unique_prefix}_connection_healthy"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def is_on(self) -> bool:
        """Return whether the pairing looks healthy without being over-sensitive."""
        if not self._client.shared_secret:
            return False

        if (
            self._client.last_seen is not None
            and time.time() - self._client.last_seen
            > self._stale_after_seconds
        ):
            return False

        if len(self._client.pending_commands) > self._queue_warning:
            return False

        pending_deliveries = self._client.state.get(
            "pending_delivery_count",
            0,
        )
        if (
            isinstance(pending_deliveries, (int, float))
            and pending_deliveries > self._queue_warning
        ):
            return False

        return True

    @property
    def extra_state_attributes(self):
        """Expose a non-sensitive reason for degraded connectivity."""
        now = time.time()
        age = (
            None
            if self._client.last_seen is None
            else max(now - self._client.last_seen, 0)
        )
        pending_deliveries = self._client.state.get(
            "pending_delivery_count",
            0,
        )

        if not self._client.shared_secret:
            status = "not_paired"
        elif age is not None and age > self._stale_after_seconds:
            status = "stale"
        elif len(self._client.pending_commands) > self._queue_warning:
            status = "command_queue"
        elif (
            isinstance(pending_deliveries, (int, float))
            and pending_deliveries > self._queue_warning
        ):
            status = "delivery_queue"
        elif self._client.last_seen is None:
            status = "waiting_for_first_sync"
        else:
            status = "healthy"

        return {
            "status": status,
            "last_seen": self._client.last_seen,
            "seconds_since_last_seen": age,
            "pending_commands": len(self._client.pending_commands),
            "pending_deliveries": pending_deliveries,
        }

    @override
    async def async_added_to_hass(self) -> None:
        """Refresh on ATHLTH traffic and periodically re-evaluate staleness."""
        await super().async_added_to_hass()

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self.async_write_ha_state,
            )
        )
        self.async_on_remove(
            async_track_time_interval(
                self.hass,
                lambda _now: self.async_write_ha_state(),
                timedelta(minutes=15),
            )
        )

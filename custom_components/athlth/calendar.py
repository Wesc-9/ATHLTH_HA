"""Training calendar exposed by ATHLTH."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DATA_RUNTIMES, DOMAIN, signal_client_added, signal_update
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up one ATHLTH training calendar per paired client."""
    runtime: ATHLTHRuntimeData = hass.data[DOMAIN][DATA_RUNTIMES][
        entry.entry_id
    ]
    added_clients: set[str] = set()

    def add_client(client_id: str) -> None:
        client = runtime.clients.get(client_id)
        if client is None or client_id in added_clients:
            return
        added_clients.add(client_id)
        async_add_entities([ATHLTHTrainingCalendar(entry, runtime, client)])

    for client in runtime.public_clients():
        add_client(client.client_id)

    entry.async_on_unload(
        async_dispatcher_connect(
            hass,
            signal_client_added(entry.entry_id),
            add_client,
        )
    )


class ATHLTHTrainingCalendar(CalendarEntity):
    """Read-only ATHLTH planned training calendar."""

    _attr_has_entity_name = True
    _attr_name = "Training"
    _attr_icon = "mdi:calendar-heart"
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

        self._attr_unique_id = f"{unique_prefix}_training_calendar"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device_identifier)},
            name=device_name,
            manufacturer="ATHLTH",
            model="Home Assistant Link",
        )

    @property
    def event(self) -> CalendarEvent | None:
        """Return the current or next planned workout."""
        events = self._events()
        if not events:
            return None

        now = dt_util.now()

        current = next(
            (
                event
                for event in events
                if isinstance(event.start, datetime)
                and isinstance(event.end, datetime)
                and event.start <= now < event.end
            ),
            None,
        )
        if current is not None:
            return current

        return next(
            (
                event
                for event in events
                if isinstance(event.start, datetime)
                and event.start >= now
            ),
            None,
        )

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return planned ATHLTH workouts within the requested window."""
        return [
            event
            for event in self._events()
            if isinstance(event.start, datetime)
            and isinstance(event.end, datetime)
            and event.end > start_date
            and event.start < end_date
        ]

    def _events(self) -> list[CalendarEvent]:
        raw_events = self._client.state.get("calendar_events", [])
        if not isinstance(raw_events, list):
            return []

        events: list[CalendarEvent] = []
        for raw in raw_events:
            if not isinstance(raw, dict):
                continue

            start_raw = raw.get("start")
            end_raw = raw.get("end")
            title = raw.get("title")
            if not all(
                isinstance(value, str) and value
                for value in (start_raw, end_raw, title)
            ):
                continue

            start = dt_util.parse_datetime(start_raw)
            end = dt_util.parse_datetime(end_raw)
            if start is None or end is None or end <= start:
                continue

            workout_type = raw.get("type")
            description = (
                f"ATHLTH · {workout_type}"
                if isinstance(workout_type, str) and workout_type
                else "ATHLTH planned workout"
            )

            events.append(
                CalendarEvent(
                    start=start,
                    end=end,
                    summary=title,
                    description=description,
                    uid=str(raw.get("id") or f"{start_raw}-{title}"),
                )
            )

        return sorted(events, key=lambda event: event.start)

    async def async_added_to_hass(self) -> None:
        """Subscribe to ATHLTH snapshot updates."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                signal_update(self._entry_id),
                self._handle_update,
            )
        )

    def _handle_update(self) -> None:
        self.async_write_ha_state()
        self.async_update_event_listeners()

"""Home Assistant actions that queue safe commands for ATHLTH clients."""

from __future__ import annotations

import uuid

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .const import DATA_RUNTIMES, DOMAIN
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData

SERVICE_SYNC_NOW = "sync_now"
SERVICE_SHOW_NEXT_WORKOUT = "show_next_workout"
SERVICE_OPEN_PLANNED_WORKOUT = "open_planned_workout"
SERVICE_SCHEDULE_EXTRA_WORKOUT = "schedule_extra_workout"
SERVICE_MOVE_PLANNED_WORKOUT = "move_planned_workout"
SERVICE_SEND_NOTIFICATION = "send_notification"

_CLIENT_ID = vol.Optional("client_id")

BASE_SCHEMA = vol.Schema({_CLIENT_ID: cv.string})
NOTIFICATION_SCHEMA = vol.Schema(
    {
        _CLIENT_ID: cv.string,
        vol.Required("message"): vol.All(
            cv.string,
            vol.Length(min=1, max=256),
        ),
        vol.Optional("title", default="Home Assistant"): vol.All(
            cv.string,
            vol.Length(max=96),
        ),
    }
)
OPEN_SCHEMA = vol.Schema(
    {
        _CLIENT_ID: cv.string,
        vol.Optional("workout_id"): vol.All(
            cv.string,
            vol.Length(max=64),
        ),
        vol.Optional("title"): vol.All(
            cv.string,
            vol.Length(max=128),
        ),
    }
)
SCHEDULE_SCHEMA = vol.Schema(
    {
        _CLIENT_ID: cv.string,
        vol.Required("title"): vol.All(
            cv.string,
            vol.Length(min=1, max=128),
        ),
        vol.Required("scheduled_at"): vol.All(
            cv.string,
            vol.Length(min=10, max=64),
        ),
        vol.Optional("workout_type", default="custom"): vol.In(
            ["running", "strength", "mobility", "custom"]
        ),
        vol.Optional("duration_minutes", default=60): vol.All(
            vol.Coerce(int),
            vol.Range(min=1, max=1440),
        ),
        vol.Optional("notes"): vol.All(
            cv.string,
            vol.Length(max=256),
        ),
    }
)
MOVE_SCHEMA = vol.Schema(
    {
        _CLIENT_ID: cv.string,
        vol.Required("workout_id"): vol.All(
            cv.string,
            vol.Length(min=1, max=64),
        ),
        vol.Required("scheduled_at"): vol.All(
            cv.string,
            vol.Length(min=10, max=64),
        ),
    }
)


def _runtime(hass: HomeAssistant) -> ATHLTHRuntimeData:
    """Resolve the single ATHLTH runtime."""
    runtimes: dict[str, ATHLTHRuntimeData] = (
        hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
    )
    if not runtimes:
        raise HomeAssistantError("ATHLTH is not loaded.")
    return next(iter(runtimes.values()))


def _client(
    runtime: ATHLTHRuntimeData,
    call: ServiceCall,
) -> ATHLTHClientRuntime:
    """Resolve a selected client or fall back to the primary client."""
    client_id = call.data.get("client_id")
    client = runtime.resolve_client(client_id)
    if client is None:
        raise HomeAssistantError(
            "The requested ATHLTH client is not paired."
        )
    return client


async def _queue(
    hass: HomeAssistant,
    call: ServiceCall,
    command_type: str,
    *,
    title: str | None = None,
    message: str | None = None,
    data: dict | None = None,
) -> None:
    """Queue a bounded command for delivery on the next signed app contact."""
    runtime = _runtime(hass)
    client = _client(runtime, call)
    queued = await runtime.async_enqueue_command(
        client.client_id,
        command_type,
        title=title,
        message=message,
        data=data,
    )
    if not queued:
        raise HomeAssistantError(
            "Unable to queue the ATHLTH command."
        )


async def async_register_services(
    hass: HomeAssistant,
) -> None:
    """Register safe Home Assistant to ATHLTH actions."""

    async def sync_now(call: ServiceCall) -> None:
        await _queue(hass, call, "sync_now")

    async def show_next_workout(call: ServiceCall) -> None:
        await _queue(hass, call, "show_next_workout")

    async def send_notification(call: ServiceCall) -> None:
        await _queue(
            hass,
            call,
            "notification",
            title=call.data["title"],
            message=call.data["message"],
        )

    async def open_planned_workout(call: ServiceCall) -> None:
        data = {
            key: call.data[key]
            for key in ("workout_id", "title")
            if call.data.get(key)
        }
        await _queue(
            hass,
            call,
            "open_planned_workout",
            data=data,
        )

    async def schedule_extra_workout(call: ServiceCall) -> None:
        data = {
            "workout_id": str(uuid.uuid4()),
            "title": call.data["title"],
            "scheduled_at": call.data["scheduled_at"],
            "workout_type": call.data["workout_type"],
            "duration_minutes": call.data["duration_minutes"],
        }
        if call.data.get("notes"):
            data["notes"] = call.data["notes"]

        await _queue(
            hass,
            call,
            "schedule_extra_workout",
            data=data,
        )

    async def move_planned_workout(call: ServiceCall) -> None:
        await _queue(
            hass,
            call,
            "move_planned_workout",
            data={
                "workout_id": call.data["workout_id"],
                "scheduled_at": call.data["scheduled_at"],
            },
        )

    registrations = (
        (SERVICE_SYNC_NOW, sync_now, BASE_SCHEMA),
        (
            SERVICE_SHOW_NEXT_WORKOUT,
            show_next_workout,
            BASE_SCHEMA,
        ),
        (
            SERVICE_SEND_NOTIFICATION,
            send_notification,
            NOTIFICATION_SCHEMA,
        ),
        (
            SERVICE_OPEN_PLANNED_WORKOUT,
            open_planned_workout,
            OPEN_SCHEMA,
        ),
        (
            SERVICE_SCHEDULE_EXTRA_WORKOUT,
            schedule_extra_workout,
            SCHEDULE_SCHEMA,
        ),
        (
            SERVICE_MOVE_PLANNED_WORKOUT,
            move_planned_workout,
            MOVE_SCHEMA,
        ),
    )

    for service, handler, schema in registrations:
        if not hass.services.has_service(DOMAIN, service):
            hass.services.async_register(
                DOMAIN,
                service,
                handler,
                schema=schema,
            )

"""Secure webhook handling for ATHLTH."""

from __future__ import annotations

import base64
import hashlib
import hmac
from http import HTTPStatus
import json
import re
import secrets
import time
from typing import Any

from aiohttp import web

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    CONF_SHARED_SECRET,
    DATA_RUNTIMES,
    DELIVERY_ID_TTL_SECONDS,
    DOMAIN,
    HEADER_CLIENT_ID,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_TIMESTAMP,
    MAX_CLOCK_SKEW_SECONDS,
    MAX_DELIVERY_ID_LENGTH,
    MAX_NONCE_LENGTH,
    MAX_PAYLOAD_BYTES,
    MAX_ROUTE_MAP_PAYLOAD_BYTES,
    NONCE_TTL_SECONDS,
    LIVE_STATE_KEYS,
    RESTORABLE_STATE_KEYS,
    ROUTE_MAP_STATE_KEYS,
    SIGNATURE_PREFIX,
    SUPPORTED_EVENTS,
    USER_EVENT_TYPES,
    WORKOUT_PHASES,
    signal_event,
    signal_update,
)
from .runtime import ATHLTHClientRuntime, ATHLTHRuntimeData

_EVENT_PATTERN = re.compile(r"^[a-z0-9_]{1,64}$")
_MAX_TEXT_LENGTH = 256


async def async_handle_webhook(
    hass: HomeAssistant,
    webhook_id: str,
    request: web.Request,
) -> web.Response:
    """Validate and process an ATHLTH webhook request."""
    runtime = _runtime_for_webhook(hass, webhook_id)
    if runtime is None:
        return _error("unknown_webhook", HTTPStatus.NOT_FOUND)

    content_length = request.content_length
    if (
        content_length is not None
        and content_length > MAX_ROUTE_MAP_PAYLOAD_BYTES
    ):
        return _error("payload_too_large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

    client_id = request.headers.get(HEADER_CLIENT_ID)
    client = runtime.resolve_client(client_id)
    if client is None:
        return _error("unknown_client", HTTPStatus.UNAUTHORIZED)

    timestamp_header = request.headers.get(HEADER_TIMESTAMP)
    nonce = request.headers.get(HEADER_NONCE)
    signature = request.headers.get(HEADER_SIGNATURE)

    if not timestamp_header or not nonce or not signature:
        return _error("missing_signature_headers", HTTPStatus.UNAUTHORIZED)

    if len(nonce) > MAX_NONCE_LENGTH:
        return _error("invalid_nonce", HTTPStatus.UNAUTHORIZED)

    try:
        timestamp = int(timestamp_header)
    except ValueError:
        return _error("invalid_timestamp", HTTPStatus.UNAUTHORIZED)

    now = int(time.time())
    if abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS:
        return _error("stale_request", HTTPStatus.UNAUTHORIZED)

    _purge_old_nonces(client, now)
    if nonce in client.nonces:
        return _error("replayed_request", HTTPStatus.CONFLICT)

    raw_body = await request.read()
    if len(raw_body) > MAX_ROUTE_MAP_PAYLOAD_BYTES:
        return _error("payload_too_large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

    if not _signature_is_valid(
        client.shared_secret,
        timestamp_header,
        nonce,
        raw_body,
        signature,
    ):
        return _error("invalid_signature", HTTPStatus.UNAUTHORIZED)

    try:
        message = json.loads(raw_body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _error("invalid_json", HTTPStatus.BAD_REQUEST)

    if (
        isinstance(message, dict)
        and message.get("event") != "workout_route_map"
        and len(raw_body) > MAX_PAYLOAD_BYTES
    ):
        return _error("payload_too_large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

    validation_error = _validate_message(message)
    if validation_error is not None:
        return _error(validation_error, HTTPStatus.BAD_REQUEST)

    event_type = message["event"]
    payload = message.get("payload", {})
    delivery_id = payload.get("delivery_id")

    client.nonces[nonce] = float(now)
    client.last_seen = float(now)
    _purge_old_delivery_ids(client, now)

    if (
        isinstance(delivery_id, str)
        and delivery_id in client.delivery_ids
    ):
        return web.json_response(
            {
                "ok": True,
                "event": event_type,
                "duplicate": True,
                "server_time": now,
                "commands": client.pending_commands,
                "capabilities": sorted(SUPPORTED_EVENTS),
            },
            headers={"Cache-Control": "no-store"},
        )

    if event_type == "command_ack":
        await runtime.async_ack_commands(
            client,
            payload.get("ids", []),
        )
    else:
        _apply_event(client, event_type, payload, now)

    public_payload = {
        key: value
        for key, value in payload.items()
        if key not in {"delivery_id", "map_image_base64"}
    }
    if event_type == "workout_route_map" and "map_image_base64" in payload:
        public_payload["map_available"] = True

    # The event bus is intentionally local to the user's Home Assistant.
    # Secrets, webhook identifiers and internal delivery IDs are not exposed.
    if event_type != "command_ack":
        hass.bus.async_fire(
            f"{DOMAIN}_{event_type}",
            {
                "event": event_type,
                "payload": public_payload,
                "client_id": client.client_id,
            },
        )

    if event_type in USER_EVENT_TYPES:
        async_dispatcher_send(
            hass,
            signal_event(runtime.entry_id),
            client.client_id,
            event_type,
            public_payload,
        )

    async_dispatcher_send(hass, signal_update(runtime.entry_id))

    if isinstance(delivery_id, str):
        await _remember_delivery(runtime, client, delivery_id, now)

    if (
        (
            event_type == "sync_snapshot"
            and isinstance(payload.get("state"), dict)
            and "calendar_events" in payload["state"]
        )
        or event_type == "workout_route_map"
    ):
        await runtime.async_save_clients()

    if event_type == "unpair":
        await _rotate_shared_secret(hass, runtime, client)

    return web.json_response(
        {
            "ok": True,
            "event": event_type,
            "duplicate": False,
            "server_time": now,
            "commands": client.pending_commands,
            "capabilities": sorted(SUPPORTED_EVENTS),
        },
        headers={"Cache-Control": "no-store"},
    )


def _error(code: str, status: HTTPStatus) -> web.Response:
    """Return a cache-safe webhook error."""
    return web.json_response(
        {"error": code},
        status=int(status),
        headers={"Cache-Control": "no-store"},
    )


def _runtime_for_webhook(
    hass: HomeAssistant, webhook_id: str
) -> ATHLTHRuntimeData | None:
    runtimes: dict[str, ATHLTHRuntimeData] = (
        hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
    )
    return next(
        (
            runtime
            for runtime in runtimes.values()
            if runtime.webhook_id == webhook_id
        ),
        None,
    )


def _signature_is_valid(
    shared_secret: str,
    timestamp: str,
    nonce: str,
    body: bytes,
    supplied_signature: str,
) -> bool:
    """Validate an ATHLTH HMAC signature."""
    signature = supplied_signature.strip().lower()
    if signature.startswith(SIGNATURE_PREFIX):
        signature = signature[len(SIGNATURE_PREFIX) :]

    if len(signature) != 64 or any(
        character not in "0123456789abcdef" for character in signature
    ):
        return False

    signed = timestamp.encode() + b"." + nonce.encode() + b"." + body
    expected = hmac.new(
        shared_secret.encode(),
        signed,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def _validate_message(message: object) -> str | None:
    """Validate the public ATHLTH webhook contract."""
    if not isinstance(message, dict):
        return "invalid_payload"

    event_type = message.get("event")
    payload = message.get("payload", {})

    if not isinstance(event_type, str) or not _EVENT_PATTERN.fullmatch(event_type):
        return "invalid_event"

    if event_type not in SUPPORTED_EVENTS:
        return "unsupported_event"

    if not isinstance(payload, dict):
        return "invalid_payload"

    if event_type == "workout_route_map":
        route_error = _validate_workout_route_map(payload)
        if route_error is not None:
            return route_error
    elif not _payload_has_safe_shape(payload):
        return "invalid_payload"

    delivery_id = payload.get("delivery_id")
    if delivery_id is not None and (
        not isinstance(delivery_id, str)
        or not delivery_id
        or len(delivery_id) > MAX_DELIVERY_ID_LENGTH
    ):
        return "invalid_delivery_id"

    if event_type == "recovery_updated":
        if not _number_in_range(payload.get("score"), 0, 100):
            return "invalid_recovery_score"

    elif event_type == "training_load_updated":
        if not _number_in_range(payload.get("load"), 0, 10):
            return "invalid_training_load"

    elif event_type == "weekly_progress_updated":
        if not _number_in_range(payload.get("percent"), 0, 100):
            return "invalid_weekly_progress"

    elif event_type == "workout_phase_updated":
        if payload.get("phase") not in WORKOUT_PHASES:
            return "invalid_workout_phase"

    elif event_type in {"strength_set_updated", "strength_set_completed"}:
        ranges = {
            "current_exercise_index": (0, 500),
            "current_set": (1, 1000),
            "current_set_index": (0, 999),
            "current_set_total": (1, 1000),
            "current_reps": (0, 10000),
            "current_weight_kg": (0, 2000),
            "current_resistance_level": (1, 10),
            "current_rest_seconds": (0, 7200),
            "current_row_distance_meters": (0, 1_000_000),
        }
        for key, (minimum, maximum) in ranges.items():
            if key in payload and not _number_in_range(
                payload.get(key), minimum, maximum
            ):
                return f"invalid_{key}"

    elif event_type == "sync_snapshot":
        state = payload.get("state", {})
        if not isinstance(state, dict):
            return "invalid_snapshot"
        if not set(state).issubset(RESTORABLE_STATE_KEYS):
            return "invalid_snapshot"
        snapshot_error = _validate_snapshot_state(state)
        if snapshot_error is not None:
            return snapshot_error

    elif event_type == "command_ack":
        command_ids = payload.get("ids")
        if (
            not isinstance(command_ids, list)
            or len(command_ids) > 16
            or any(
                not isinstance(command_id, str)
                or not command_id
                or len(command_id) > 64
                for command_id in command_ids
            )
        ):
            return "invalid_command_ack"

    return None


def _validate_workout_route_map(payload: dict[str, Any]) -> str | None:
    """Validate the larger completed-route payload without weakening other events."""
    if payload.get("clear") is True:
        return None

    allowed = {
        "name",
        "type",
        "started_at",
        "ended_at",
        "duration_seconds",
        "distance_meters",
        "device",
        "route_points",
        "route_point_count",
        "elevation_gain_meters",
        "average_pace_seconds_per_km",
        "active_energy_kcal",
        "average_heart_rate_bpm",
        "max_heart_rate_bpm",
        "route_match_percent",
        "map_mime_type",
        "map_image_base64",
    }
    if not set(payload).issubset(allowed):
        return "invalid_workout_route_map"

    route_points = payload.get("route_points")
    if (
        not isinstance(route_points, list)
        or not 2 <= len(route_points) <= 64
    ):
        return "invalid_route_points"

    for point in route_points:
        if (
            not isinstance(point, list)
            or len(point) != 2
            or not _number_in_range(point[0], -90, 90)
            or not _number_in_range(point[1], -180, 180)
        ):
            return "invalid_route_points"

    ranges = {
        "duration_seconds": (0, 604800),
        "distance_meters": (0, 5_000_000),
        "route_point_count": (2, 100_000),
        "elevation_gain_meters": (0, 100_000),
        "average_pace_seconds_per_km": (0, 7200),
        "active_energy_kcal": (0, 100_000),
        "average_heart_rate_bpm": (20, 260),
        "max_heart_rate_bpm": (20, 260),
        "route_match_percent": (0, 100),
    }
    for key, (minimum, maximum) in ranges.items():
        if key in payload and not _number_in_range(
            payload.get(key), minimum, maximum
        ):
            return f"invalid_{key}"

    for key in ("name", "type", "started_at", "ended_at", "device"):
        value = payload.get(key)
        if value is not None and (
            not isinstance(value, str)
            or not value
            or len(value) > _MAX_TEXT_LENGTH
        ):
            return f"invalid_{key}"

    image = payload.get("map_image_base64")
    mime_type = payload.get("map_mime_type")
    if image is None:
        if mime_type is not None:
            return "invalid_map_image"
        return None

    if (
        mime_type != "image/jpeg"
        or not isinstance(image, str)
        or not image
        or len(image) > 320_000
    ):
        return "invalid_map_image"

    try:
        decoded = base64.b64decode(image, validate=True)
    except (ValueError, TypeError):
        return "invalid_map_image"

    if not decoded or len(decoded) > 240_000:
        return "invalid_map_image"

    return None


def _validate_snapshot_state(state: dict[str, Any]) -> str | None:
    """Validate bounded numeric values in an ATHLTH snapshot."""
    ranges = {
        "recovery_score": (0, 100),
        "training_load": (0, 10),
        "weekly_progress": (0, 100),
        "sleep_duration_minutes": (0, 1440),
        "hrv_milliseconds": (0, 2000),
        "resting_heart_rate": (20, 250),
        "respiratory_rate": (1, 80),
        "weekly_training_minutes": (0, 10080),
        "weekly_distance_km": (0, 5000),
        "last_workout_duration_seconds": (0, 604800),
        "last_workout_distance_meters": (0, 5_000_000),
        "goal_progress": (0, 100),
        "goal_days_remaining": (0, 36_500),
        "training_streak": (0, 36_500),
        "weekly_workout_count": (0, 10_000),
        "pending_delivery_count": (0, 100),
        "active_workout_elapsed_seconds": (0, 604800),
        "active_workout_distance_meters": (0, 5_000_000),
        "active_workout_pace_seconds_per_km": (0, 7200),
        "active_workout_speed_kmh": (0, 100),
        "active_workout_heart_rate_bpm": (20, 260),
        "active_workout_heart_rate_zone": (1, 5),
        "treadmill_incline_percent": (-20, 40),
        "current_exercise_index": (0, 500),
        "current_set": (1, 1000),
        "current_set_index": (0, 999),
        "current_set_total": (1, 1000),
        "current_reps": (0, 10000),
        "current_weight_kg": (0, 2000),
        "current_resistance_level": (1, 10),
        "current_rest_seconds": (0, 7200),
        "current_row_distance_meters": (0, 1_000_000),
    }

    for key, (minimum, maximum) in ranges.items():
        value = state.get(key)
        if value is None:
            continue
        if not _number_in_range(value, minimum, maximum):
            return f"invalid_{key}"

    workout_phase = state.get("workout_phase")
    if workout_phase is not None and workout_phase not in WORKOUT_PHASES:
        return "invalid_workout_phase"

    environment = state.get("active_workout_environment")
    if environment is not None and environment not in {
        "outdoor",
        "indoor",
        "treadmill",
        "gym",
        "unknown",
    }:
        return "invalid_active_workout_environment"

    recovery_state = state.get("recovery_state")
    if recovery_state is not None and recovery_state not in {
        "building_baseline",
        "ready",
        "balanced",
        "take_it_easy",
        "recover",
    }:
        return "invalid_recovery_state"

    calendar_events = state.get("calendar_events")
    if calendar_events is not None:
        if not isinstance(calendar_events, list) or len(calendar_events) > 64:
            return "invalid_calendar_events"

        for event in calendar_events:
            if not isinstance(event, dict):
                return "invalid_calendar_events"
            if not set(event).issubset(
                {"id", "title", "start", "end", "type"}
            ):
                return "invalid_calendar_events"
            if not all(
                isinstance(event.get(key), str) and event.get(key)
                for key in ("id", "title", "start", "end")
            ):
                return "invalid_calendar_events"

    return None


def _payload_has_safe_shape(value: object, depth: int = 0) -> bool:
    """Bound JSON nesting, collection sizes and user-provided text."""
    if depth > 4:
        return False

    if value is None or isinstance(value, (bool, int, float)):
        return True

    if isinstance(value, str):
        return len(value) <= _MAX_TEXT_LENGTH

    if isinstance(value, list):
        return len(value) <= 64 and all(
            _payload_has_safe_shape(item, depth + 1) for item in value
        )

    if isinstance(value, dict):
        return len(value) <= 64 and all(
            isinstance(key, str)
            and len(key) <= 64
            and _payload_has_safe_shape(item, depth + 1)
            for key, item in value.items()
        )

    return False


def _number_in_range(value: object, minimum: float, maximum: float) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return minimum <= float(value) <= maximum


def _purge_old_nonces(client: ATHLTHClientRuntime, now: int) -> None:
    cutoff = now - NONCE_TTL_SECONDS
    stale = [
        nonce
        for nonce, seen_at in client.nonces.items()
        if seen_at < cutoff
    ]
    for nonce in stale:
        client.nonces.pop(nonce, None)


def _purge_old_delivery_ids(
    client: ATHLTHClientRuntime,
    now: int,
) -> None:
    cutoff = now - DELIVERY_ID_TTL_SECONDS
    stale = [
        delivery_id
        for delivery_id, seen_at in client.delivery_ids.items()
        if seen_at < cutoff
    ]
    for delivery_id in stale:
        client.delivery_ids.pop(delivery_id, None)


async def _remember_delivery(
    runtime: ATHLTHRuntimeData,
    client: ATHLTHClientRuntime,
    delivery_id: str,
    now: int,
) -> None:
    client.delivery_ids[delivery_id] = float(now)
    _purge_old_delivery_ids(client, now)

    if client.is_primary:
        if runtime.delivery_store is not None:
            await runtime.delivery_store.async_save(
                {"delivery_ids": client.delivery_ids}
            )
    else:
        await runtime.async_save_additional_clients()


async def _rotate_shared_secret(
    hass: HomeAssistant,
    runtime: ATHLTHRuntimeData,
    client: ATHLTHClientRuntime,
) -> None:
    """Invalidate only the client that requested unpairing."""
    shared_secret = secrets.token_urlsafe(48)
    client.shared_secret = shared_secret
    client.nonces.clear()
    client.delivery_ids.clear()
    client.pending_commands.clear()
    client.state.clear()
    client.state["workout_active"] = False

    entry = hass.config_entries.async_get_entry(runtime.entry_id)

    if client.is_primary:
        if runtime.delivery_store is not None:
            await runtime.delivery_store.async_save(
                {"delivery_ids": {}}
            )
        if entry is not None:
            hass.config_entries.async_update_entry(
                entry,
                data={
                    **entry.data,
                    CONF_SHARED_SECRET: shared_secret,
                },
            )
    else:
        await runtime.async_save_additional_clients()


def _clear_live_state(client: ATHLTHClientRuntime) -> None:
    """Remove transient workout details after a workout ends."""
    for key in LIVE_STATE_KEYS:
        client.state.pop(key, None)


def _copy_live_fields(
    client: ATHLTHClientRuntime,
    payload: dict[str, Any],
) -> None:
    """Copy only documented transient live fields."""
    for key in LIVE_STATE_KEYS:
        if key in payload:
            client.state[key] = payload[key]

    entity_state = payload.get("entity_state")
    if isinstance(entity_state, dict):
        for key, value in entity_state.items():
            if key in LIVE_STATE_KEYS:
                client.state[key] = value


def _apply_event(
    client: ATHLTHClientRuntime,
    event_type: str,
    payload: dict[str, Any],
    now: int,
) -> None:
    client.state["last_event"] = event_type
    client.state["last_event_at"] = now

    entity_state = payload.get("entity_state")
    if isinstance(entity_state, dict):
        for key, value in entity_state.items():
            if key in RESTORABLE_STATE_KEYS:
                client.state[key] = value

    if event_type == "workout_started":
        client.state["workout_active"] = True
        client.state["active_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
            or payload.get("type")
        )
        client.state["active_workout_type"] = payload.get("type")
        client.state["active_workout_started_at"] = payload.get("started_at")
        client.state["active_workout_device"] = payload.get("device")
        client.state["workout_phase"] = payload.get("phase") or "active"
        _copy_live_fields(client, payload)

    elif event_type in {"workout_updated", "workout_phase_updated"}:
        client.state["workout_active"] = True
        if payload.get("name") or payload.get("workout_name"):
            client.state["active_workout"] = (
                payload.get("name") or payload.get("workout_name")
            )
        if payload.get("type"):
            client.state["active_workout_type"] = payload["type"]
        if payload.get("started_at"):
            client.state["active_workout_started_at"] = payload["started_at"]
        if payload.get("device"):
            client.state["active_workout_device"] = payload["device"]
        if payload.get("phase") in WORKOUT_PHASES:
            client.state["workout_phase"] = payload["phase"]
        _copy_live_fields(client, payload)

    elif event_type in {"strength_set_updated", "strength_set_completed"}:
        client.state["workout_active"] = True
        client.state["active_workout_type"] = "strength"
        client.state["workout_phase"] = (
            "rest" if payload.get("current_rest_seconds", 0) else "active"
        )
        _copy_live_fields(client, payload)

    elif event_type == "workout_cancelled":
        client.state["workout_active"] = False
        for key in (
            "active_workout",
            "active_workout_type",
            "active_workout_started_at",
            "active_workout_device",
        ):
            client.state.pop(key, None)
        _clear_live_state(client)

    elif event_type == "workout_finished":
        client.state["workout_active"] = False
        if payload.get("completed", True):
            client.state["last_workout"] = (
                payload.get("name")
                or payload.get("workout_name")
                or payload.get("type")
            )
            client.state["last_workout_type"] = payload.get("type")
            client.state["last_workout_duration_seconds"] = payload.get(
                "duration_seconds"
            )
            client.state["last_workout_distance_meters"] = payload.get(
                "distance_meters"
            )
            client.state["last_workout_ended_at"] = payload.get(
                "ended_at",
                now,
            )
            client.state["last_workout_device"] = payload.get("device")
            client.state["last_workout_average_pace_seconds_per_km"] = payload.get(
                "average_pace_seconds_per_km"
            )
            client.state["last_workout_active_energy_kcal"] = payload.get(
                "active_energy_kcal"
            )
            client.state["last_workout_average_heart_rate_bpm"] = payload.get(
                "average_heart_rate_bpm"
            )
            client.state["last_workout_max_heart_rate_bpm"] = payload.get(
                "max_heart_rate_bpm"
            )
            client.state["last_workout_route_match_percent"] = payload.get(
                "route_match_percent"
            )
        for key in (
            "active_workout",
            "active_workout_type",
            "active_workout_started_at",
            "active_workout_device",
        ):
            client.state.pop(key, None)
        _clear_live_state(client)

    elif event_type == "workout_route_map":
        if payload.get("clear") is True:
            for key in ROUTE_MAP_STATE_KEYS:
                client.state.pop(key, None)
        else:
            mapping = {
                "map_image_base64": "last_workout_route_map_base64",
                "map_mime_type": "last_workout_route_map_mime_type",
                "route_points": "last_workout_route_points",
                "route_point_count": "last_workout_route_point_count",
                "elevation_gain_meters": "last_workout_elevation_gain_meters",
                "average_pace_seconds_per_km":
                    "last_workout_average_pace_seconds_per_km",
                "active_energy_kcal": "last_workout_active_energy_kcal",
                "average_heart_rate_bpm":
                    "last_workout_average_heart_rate_bpm",
                "max_heart_rate_bpm": "last_workout_max_heart_rate_bpm",
                "route_match_percent": "last_workout_route_match_percent",
                "started_at": "last_workout_route_started_at",
                "ended_at": "last_workout_route_ended_at",
                "distance_meters": "last_workout_route_distance_meters",
                "duration_seconds": "last_workout_route_duration_seconds",
                "device": "last_workout_route_device",
                "name": "last_workout_route_name",
                "type": "last_workout_route_type",
            }
            for source, target in mapping.items():
                value = payload.get(source)
                if value is not None:
                    client.state[target] = value

    elif event_type == "recovery_updated":
        client.state["recovery_score"] = payload["score"]

    elif event_type == "training_load_updated":
        client.state["training_load"] = payload["load"]

    elif event_type == "weekly_progress_updated":
        client.state["weekly_progress"] = payload["percent"]

    elif event_type == "next_workout_updated":
        client.state["next_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
        )
        client.state["next_workout_time"] = payload.get("scheduled_at")

    elif event_type == "goal_completed":
        if payload.get("title"):
            client.state["active_goal"] = payload["title"]
        client.state["goal_progress"] = 100

    elif event_type == "sync_snapshot":
        snapshot = payload.get("state", {})
        if isinstance(snapshot, dict):
            for key, value in snapshot.items():
                if key in RESTORABLE_STATE_KEYS:
                    client.state[key] = value

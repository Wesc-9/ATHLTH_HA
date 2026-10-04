"""Secure webhook handling for ATHLTH."""

from __future__ import annotations

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
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_TIMESTAMP,
    MAX_CLOCK_SKEW_SECONDS,
    MAX_DELIVERY_ID_LENGTH,
    MAX_NONCE_LENGTH,
    MAX_PAYLOAD_BYTES,
    NONCE_TTL_SECONDS,
    RESTORABLE_STATE_KEYS,
    SIGNATURE_PREFIX,
    SUPPORTED_EVENTS,
    signal_update,
)
from .runtime import ATHLTHRuntimeData

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
    if content_length is not None and content_length > MAX_PAYLOAD_BYTES:
        return _error("payload_too_large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

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

    _purge_old_nonces(runtime, now)
    if nonce in runtime.nonces:
        return _error("replayed_request", HTTPStatus.CONFLICT)

    raw_body = await request.read()
    if len(raw_body) > MAX_PAYLOAD_BYTES:
        return _error("payload_too_large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

    if not _signature_is_valid(
        runtime.shared_secret,
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

    validation_error = _validate_message(message)
    if validation_error is not None:
        return _error(validation_error, HTTPStatus.BAD_REQUEST)

    event_type = message["event"]
    payload = message.get("payload", {})
    delivery_id = payload.get("delivery_id")

    runtime.nonces[nonce] = float(now)
    runtime.last_seen = float(now)
    _purge_old_delivery_ids(runtime, now)

    if (
        isinstance(delivery_id, str)
        and delivery_id in runtime.delivery_ids
    ):
        return web.json_response(
            {
                "ok": True,
                "event": event_type,
                "duplicate": True,
                "server_time": now,
            },
            headers={"Cache-Control": "no-store"},
        )

    _apply_event(runtime, event_type, payload, now)

    public_payload = {
        key: value
        for key, value in payload.items()
        if key != "delivery_id"
    }

    # The event bus is intentionally local to the user's Home Assistant.
    # Secrets, webhook identifiers and internal delivery IDs are not exposed.
    hass.bus.async_fire(
        f"{DOMAIN}_{event_type}",
        {
            "event": event_type,
            "payload": public_payload,
            "client_id": runtime.entry_id,
        },
    )
    async_dispatcher_send(hass, signal_update(runtime.entry_id))

    if isinstance(delivery_id, str):
        await _remember_delivery(runtime, delivery_id, now)

    if event_type == "unpair":
        await _rotate_shared_secret(hass, runtime)

    return web.json_response(
        {
            "ok": True,
            "event": event_type,
            "duplicate": False,
            "server_time": now,
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

    if not _payload_has_safe_shape(payload):
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

    elif event_type == "sync_snapshot":
        state = payload.get("state", {})
        if not isinstance(state, dict):
            return "invalid_snapshot"
        if not set(state).issubset(RESTORABLE_STATE_KEYS):
            return "invalid_snapshot"

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


def _purge_old_nonces(runtime: ATHLTHRuntimeData, now: int) -> None:
    cutoff = now - NONCE_TTL_SECONDS
    stale = [
        nonce
        for nonce, seen_at in runtime.nonces.items()
        if seen_at < cutoff
    ]
    for nonce in stale:
        runtime.nonces.pop(nonce, None)


def _purge_old_delivery_ids(
    runtime: ATHLTHRuntimeData,
    now: int,
) -> None:
    cutoff = now - DELIVERY_ID_TTL_SECONDS
    stale = [
        delivery_id
        for delivery_id, seen_at in runtime.delivery_ids.items()
        if seen_at < cutoff
    ]
    for delivery_id in stale:
        runtime.delivery_ids.pop(delivery_id, None)


async def _remember_delivery(
    runtime: ATHLTHRuntimeData,
    delivery_id: str,
    now: int,
) -> None:
    runtime.delivery_ids[delivery_id] = float(now)
    _purge_old_delivery_ids(runtime, now)

    if runtime.delivery_store is not None:
        await runtime.delivery_store.async_save(
            {"delivery_ids": runtime.delivery_ids}
        )


async def _rotate_shared_secret(
    hass: HomeAssistant,
    runtime: ATHLTHRuntimeData,
) -> None:
    """Invalidate the current ATHLTH pairing without exposing a new secret."""
    shared_secret = secrets.token_urlsafe(48)
    runtime.shared_secret = shared_secret
    runtime.nonces.clear()
    runtime.delivery_ids.clear()
    runtime.state["workout_active"] = False
    runtime.state.pop("active_workout", None)

    if runtime.delivery_store is not None:
        await runtime.delivery_store.async_save(
            {"delivery_ids": {}}
        )

    entry = hass.config_entries.async_get_entry(runtime.entry_id)
    if entry is not None:
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_SHARED_SECRET: shared_secret,
            },
        )


def _apply_event(
    runtime: ATHLTHRuntimeData,
    event_type: str,
    payload: dict[str, Any],
    now: int,
) -> None:
    runtime.state["last_event"] = event_type
    runtime.state["last_event_at"] = now

    entity_state = payload.get("entity_state")
    if isinstance(entity_state, dict):
        for key, value in entity_state.items():
            if key in RESTORABLE_STATE_KEYS:
                runtime.state[key] = value

    if event_type == "workout_started":
        runtime.state["workout_active"] = True
        runtime.state["active_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
            or payload.get("type")
        )

    elif event_type == "workout_updated":
        runtime.state["workout_active"] = True

    elif event_type == "workout_cancelled":
        runtime.state["workout_active"] = False
        runtime.state.pop("active_workout", None)

    elif event_type == "workout_finished":
        runtime.state["workout_active"] = False
        if payload.get("completed", True):
            runtime.state["last_workout"] = (
                payload.get("name")
                or payload.get("workout_name")
                or payload.get("type")
            )
            runtime.state["last_workout_at"] = payload.get("ended_at", now)
        runtime.state.pop("active_workout", None)

    elif event_type == "recovery_updated":
        runtime.state["recovery_score"] = payload["score"]

    elif event_type == "training_load_updated":
        runtime.state["training_load"] = payload["load"]

    elif event_type == "weekly_progress_updated":
        runtime.state["weekly_progress"] = payload["percent"]

    elif event_type == "next_workout_updated":
        runtime.state["next_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
        )

    elif event_type == "sync_snapshot":
        snapshot = payload.get("state", {})
        if isinstance(snapshot, dict):
            for key, value in snapshot.items():
                if key in RESTORABLE_STATE_KEYS:
                    runtime.state[key] = value

"""Secure webhook handling for ATHLTH."""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from typing import Any

from aiohttp import web

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    DATA_RUNTIMES,
    DOMAIN,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_TIMESTAMP,
    MAX_CLOCK_SKEW_SECONDS,
    NONCE_TTL_SECONDS,
    SIGNATURE_PREFIX,
    signal_update,
)
from .runtime import ATHLTHRuntimeData

_EVENT_PATTERN = re.compile(r"^[a-z0-9_]{1,64}$")


async def async_handle_webhook(
    hass: HomeAssistant,
    webhook_id: str,
    request: web.Request,
) -> web.Response:
    """Validate and process an ATHLTH webhook request."""
    runtime = _runtime_for_webhook(hass, webhook_id)
    if runtime is None:
        return web.json_response({"error": "unknown_webhook"}, status=404)

    timestamp_header = request.headers.get(HEADER_TIMESTAMP)
    nonce = request.headers.get(HEADER_NONCE)
    signature = request.headers.get(HEADER_SIGNATURE)

    if not timestamp_header or not nonce or not signature:
        return web.json_response(
            {"error": "missing_signature_headers"},
            status=401,
        )

    try:
        timestamp = int(timestamp_header)
    except ValueError:
        return web.json_response({"error": "invalid_timestamp"}, status=401)

    now = int(time.time())
    if abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS:
        return web.json_response({"error": "stale_request"}, status=401)

    _purge_old_nonces(runtime, now)
    if nonce in runtime.nonces:
        return web.json_response({"error": "replayed_request"}, status=409)

    raw_body = await request.read()
    if not _signature_is_valid(
        runtime.shared_secret,
        timestamp_header,
        nonce,
        raw_body,
        signature,
    ):
        return web.json_response({"error": "invalid_signature"}, status=401)

    try:
        message = json.loads(raw_body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return web.json_response({"error": "invalid_json"}, status=400)

    if not isinstance(message, dict):
        return web.json_response({"error": "invalid_payload"}, status=400)

    event_type = message.get("event")
    payload = message.get("payload", {})

    if not isinstance(event_type, str) or not _EVENT_PATTERN.fullmatch(event_type):
        return web.json_response({"error": "invalid_event"}, status=400)

    if not isinstance(payload, dict):
        return web.json_response({"error": "invalid_payload"}, status=400)

    runtime.nonces[nonce] = float(now)
    runtime.last_seen = float(now)

    _apply_event(runtime, event_type, payload, now)

    hass.bus.async_fire(
        f"{DOMAIN}_{event_type}",
        {
            "event": event_type,
            "payload": payload,
            "client_id": runtime.entry_id,
        },
    )
    async_dispatcher_send(hass, signal_update(runtime.entry_id))

    return web.json_response(
        {
            "ok": True,
            "event": event_type,
            "server_time": now,
        }
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
    signature = supplied_signature
    if signature.startswith(SIGNATURE_PREFIX):
        signature = signature[len(SIGNATURE_PREFIX) :]

    signed = timestamp.encode() + b"." + nonce.encode() + b"." + body
    expected = hmac.new(
        shared_secret.encode(),
        signed,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature.lower())


def _purge_old_nonces(runtime: ATHLTHRuntimeData, now: int) -> None:
    cutoff = now - NONCE_TTL_SECONDS
    stale = [
        nonce
        for nonce, seen_at in runtime.nonces.items()
        if seen_at < cutoff
    ]
    for nonce in stale:
        runtime.nonces.pop(nonce, None)


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
        runtime.state.update(entity_state)

    if event_type == "workout_started":
        runtime.state["workout_active"] = True
        runtime.state["active_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
            or payload.get("type")
        )

    elif event_type == "workout_updated":
        runtime.state["workout_active"] = True

    elif event_type == "workout_finished":
        runtime.state["workout_active"] = False
        runtime.state["last_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
            or payload.get("type")
        )
        runtime.state["last_workout_at"] = payload.get(
            "ended_at", now
        )
        runtime.state.pop("active_workout", None)

    elif event_type == "recovery_updated":
        if "score" in payload:
            runtime.state["recovery_score"] = payload["score"]

    elif event_type == "training_load_updated":
        if "load" in payload:
            runtime.state["training_load"] = payload["load"]

    elif event_type == "weekly_progress_updated":
        if "percent" in payload:
            runtime.state["weekly_progress"] = payload["percent"]

    elif event_type == "next_workout_updated":
        runtime.state["next_workout"] = (
            payload.get("name")
            or payload.get("workout_name")
        )

    elif event_type == "sync_snapshot":
        snapshot = payload.get("state", payload)
        if isinstance(snapshot, dict):
            runtime.state.update(snapshot)

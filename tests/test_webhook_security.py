"""Security contract tests for ATHLTH webhooks."""

import hashlib
import hmac
import json

from custom_components.athlth.webhook import (
    _signature_is_valid,
    _validate_message,
)


def test_valid_signature():
    """A correctly signed body is accepted."""
    secret = "test-secret"
    timestamp = "1770000000"
    nonce = "a-unique-nonce"
    body = json.dumps(
        {"event": "workout_started", "payload": {"name": "Run"}},
        separators=(",", ":"),
    ).encode()
    signed = timestamp.encode() + b"." + nonce.encode() + b"." + body
    signature = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()

    assert _signature_is_valid(
        secret,
        timestamp,
        nonce,
        body,
        f"sha256={signature}",
    )


def test_modified_body_rejects_signature():
    """A signature cannot be reused for a modified body."""
    secret = "test-secret"
    timestamp = "1770000000"
    nonce = "a-unique-nonce"
    body = b'{"event":"workout_started","payload":{"name":"Run"}}'
    signed = timestamp.encode() + b"." + nonce.encode() + b"." + body
    signature = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()

    assert not _signature_is_valid(
        secret,
        timestamp,
        nonce,
        b'{"event":"workout_started","payload":{"name":"Changed"}}',
        f"sha256={signature}",
    )


def test_unknown_event_is_rejected():
    """Signed clients still cannot invent new event types."""
    assert (
        _validate_message(
            {"event": "turn_off_all_locks", "payload": {}}
        )
        == "unsupported_event"
    )


def test_health_values_are_bounded():
    """Health-derived numeric values must remain inside protocol bounds."""
    assert (
        _validate_message(
            {"event": "recovery_updated", "payload": {"score": 101}}
        )
        == "invalid_recovery_score"
    )
    assert (
        _validate_message(
            {"event": "weekly_progress_updated", "payload": {"percent": -1}}
        )
        == "invalid_weekly_progress"
    )
    assert (
        _validate_message(
            {"event": "training_load_updated", "payload": {"load": 1.1}}
        )
        is None
    )


def test_snapshot_only_accepts_documented_entity_state():
    """Snapshots cannot create arbitrary Home Assistant state keys."""
    assert (
        _validate_message(
            {
                "event": "sync_snapshot",
                "payload": {
                    "state": {
                        "workout_active": False,
                        "recovery_score": 82,
                        "training_load": 1.03,
                    }
                },
            }
        )
        is None
    )

    assert (
        _validate_message(
            {
                "event": "sync_snapshot",
                "payload": {"state": {"private_token": "nope"}},
            }
        )
        == "invalid_snapshot"
    )


def test_health_snapshot_values_are_bounded():
    """Health snapshots accept realistic values and reject unsafe ranges."""
    valid = {
        "event": "sync_snapshot",
        "payload": {
            "state": {
                "sleep_duration_minutes": 455,
                "hrv_milliseconds": 62.5,
                "resting_heart_rate": 48,
                "respiratory_rate": 14.2,
                "weekly_training_minutes": 310,
                "weekly_distance_km": 42.2,
            }
        },
    }
    assert _validate_message(valid) is None

    invalid = {
        "event": "sync_snapshot",
        "payload": {
            "state": {
                "resting_heart_rate": 900,
            }
        },
    }
    assert _validate_message(invalid) == "invalid_resting_heart_rate"


def test_next_workout_timestamp_is_allowed_in_snapshot():
    """The next-workout timestamp is part of the documented snapshot state."""
    assert (
        _validate_message(
            {
                "event": "sync_snapshot",
                "payload": {
                    "state": {
                        "next_workout": "Intervals",
                        "next_workout_time": "2026-10-05T18:00:00+02:00",
                    }
                },
            }
        )
        is None
    )


def test_calendar_snapshot_and_recovery_state_are_validated():
    """Calendar and recovery-state snapshots accept only documented shapes."""
    valid = {
        "event": "sync_snapshot",
        "payload": {
            "state": {
                "recovery_state": "balanced",
                "calendar_events": [
                    {
                        "id": "session-1",
                        "title": "Intervals",
                        "start": "2026-10-05T18:00:00+02:00",
                        "end": "2026-10-05T19:00:00+02:00",
                        "type": "running",
                    }
                ],
            }
        },
    }
    assert _validate_message(valid) is None

    invalid_recovery = {
        "event": "sync_snapshot",
        "payload": {"state": {"recovery_state": "diagnosed_sick"}},
    }
    assert _validate_message(invalid_recovery) == "invalid_recovery_state"

    invalid_calendar = {
        "event": "sync_snapshot",
        "payload": {
            "state": {
                "calendar_events": [
                    {
                        "id": "session-1",
                        "title": "Intervals",
                        "start": "2026-10-05T18:00:00+02:00",
                        "end": "2026-10-05T19:00:00+02:00",
                        "private_notes": "not allowed",
                    }
                ]
            }
        },
    }
    assert _validate_message(invalid_calendar) == "invalid_calendar_events"


def test_command_ack_contract_is_bounded():
    """Only a small list of command ids may be acknowledged."""
    assert (
        _validate_message(
            {
                "event": "command_ack",
                "payload": {"ids": ["a", "b"]},
            }
        )
        is None
    )

    assert (
        _validate_message(
            {
                "event": "command_ack",
                "payload": {"ids": ["x"] * 17},
            }
        )
        == "invalid_command_ack"
    )

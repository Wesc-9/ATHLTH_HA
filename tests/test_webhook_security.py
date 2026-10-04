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

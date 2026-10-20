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


def test_live_workout_snapshot_contract():
    """Live workout state is bounded and uses documented phases."""
    valid = {
        "event": "sync_snapshot",
        "payload": {
            "state": {
                "workout_active": True,
                "workout_phase": "active",
                "active_workout_elapsed_seconds": 1234,
                "active_workout_distance_meters": 5012.5,
                "active_workout_pace_seconds_per_km": 310,
                "active_workout_speed_kmh": 11.6,
                "active_workout_heart_rate_bpm": 152,
                "active_workout_heart_rate_zone": 4,
                "active_workout_environment": "treadmill",
                "treadmill_incline_percent": 2.5,
            }
        },
    }
    assert _validate_message(valid) is None

    invalid = {
        "event": "sync_snapshot",
        "payload": {"state": {"workout_phase": "teleporting"}},
    }
    assert _validate_message(invalid) == "invalid_workout_phase"


def test_strength_set_event_contract():
    """Strength and rowing details stay inside safe bounds."""
    assert (
        _validate_message(
            {
                "event": "strength_set_completed",
                "payload": {
                    "current_exercise": "Bench press",
                    "current_exercise_index": 0,
                    "current_set": 2,
                    "current_set_index": 1,
                    "current_set_total": 4,
                    "current_reps": 8,
                    "current_weight_kg": 100,
                    "current_resistance_level": 5,
                    "current_rest_seconds": 90,
                    "current_row_distance_meters": 500,
                },
            }
        )
        is None
    )
    assert (
        _validate_message(
            {
                "event": "strength_set_updated",
                "payload": {"current_resistance_level": 11},
            }
        )
        == "invalid_current_resistance_level"
    )


def test_achievement_and_record_events_are_documented():
    """PR and achievement events can be automated in Home Assistant."""
    for event in (
        "personal_record",
        "achievement_unlocked",
        "goal_completed",
        "challenge_completed",
    ):
        assert _validate_message(
            {"event": event, "payload": {"title": "Example"}}
        ) is None


# CGNAT addresses are not considered private by ipaddress. Only the
# explicitly scoped Tailscale-style space is added to code pairing.
from types import SimpleNamespace

from custom_components.athlth.api import _request_is_local


def test_pairing_accepts_tailscale_address_space():
    assert _request_is_local(SimpleNamespace(remote=".".join(("100", "102", "120", "20"))))
    assert _request_is_local(SimpleNamespace(remote="100.64.0.1"))
    assert _request_is_local(SimpleNamespace(remote="100.127.255.254"))


def test_pairing_rejects_public_and_outside_shared_range():
    assert not _request_is_local(SimpleNamespace(remote="100.63.255.255"))
    assert not _request_is_local(SimpleNamespace(remote="100.128.0.1"))
    assert not _request_is_local(SimpleNamespace(remote="8.8.8.8"))
    assert not _request_is_local(SimpleNamespace(remote="invalid"))
    assert not _request_is_local(SimpleNamespace(remote=None))


def test_pairing_keeps_regular_private_address_support():
    assert _request_is_local(SimpleNamespace(remote=".".join(("192", "168", "1", "100"))))
    assert _request_is_local(SimpleNamespace(remote=".".join(("10", "0", "0", "3"))))
    assert _request_is_local(SimpleNamespace(remote="127.0.0.1"))


def test_revoking_completed_workout_sharing_clears_route_state():
    """A disabled share must not leave stale GPS images or workout metadata."""
    from custom_components.athlth.runtime import ATHLTHClientRuntime
    from custom_components.athlth.webhook import _apply_event

    client = ATHLTHClientRuntime(
        client_id="primary",
        name="Primary",
        shared_secret="placeholder-test-only",
        is_primary=True,
        state={
            "last_workout": "Outdoor run",
            "last_workout_type": "outdoor_run",
            "last_workout_distance_meters": 5000,
            "last_workout_route_points": [[1, 2], [3, 4]],
            "last_workout_route_map_base64": "not-real-image",
            "last_workout_route_ended_at": "2026-10-20T10:00:00Z",
        },
    )
    _apply_event(client, "sync_snapshot", {"state": {"last_workout": None}}, 1000)
    assert client.state["last_workout"] is None
    assert "last_workout_type" not in client.state
    assert "last_workout_distance_meters" not in client.state
    assert "last_workout_route_points" not in client.state
    assert "last_workout_route_map_base64" not in client.state



def test_recent_completed_workout_is_bounded_deduplicated_and_no_gps():
    """Track only authenticated completed events for the current installation."""
    from custom_components.athlth.runtime import ATHLTHClientRuntime
    from custom_components.athlth.webhook import _apply_event

    client = ATHLTHClientRuntime(
        client_id="test-installation", name="A", shared_secret="test",
    )
    payload = {
        "name": "Trail run", "type": "outdoor_run", "completed": True,
        "duration_seconds": 1800, "distance_meters": 4000,
        "ended_at": "2026-10-20T17:00:00+02:00",
        "route_points": [[60.1, 12.3]],
        "map_image_base64": "not-exported",
    }
    _apply_event(client, "workout_finished", payload, 1000)
    _apply_event(client, "workout_finished", payload, 1001)
    assert len(client.state["recent_workouts"]) == 1
    assert client.state["recent_workouts"][0]["name"] == "Trail run"
    assert "route_points" not in client.state["recent_workouts"][0]
    assert "map_image_base64" not in client.state["recent_workouts"][0]

    _apply_event(
        client, "workout_finished",
        {"completed": False, "name": "Cancelled", "type": "run"},
        1002,
    )
    assert len(client.state["recent_workouts"]) == 1

    for idx in range(20):
        _apply_event(
            client, "workout_finished",
            {"completed": True, "name": "Walk", "type": "walk",
             "ended_at": f"2026-10-21T10:{idx:02}:00Z"},
            1100 + idx,
        )
    assert len(client.state["recent_workouts"]) == 10

    _apply_event(client, "sync_snapshot", {"state": {"last_workout": None}}, 1200)
    assert "recent_workouts" not in client.state



def test_training_plan_snapshot_is_validated_and_isolated():
    """Plan metadata has a strict shape and cannot smuggle extra fields."""
    from custom_components.athlth.webhook import _validate_message

    valid = {
        "id": "plan-123",
        "title": "8-week intervals",
        "current_week": 3,
        "total_weeks": 8,
        "starts_at": "2026-10-01T00:00:00Z",
    }
    assert _validate_message({
        "event": "sync_snapshot", "payload": {"state": {
            "training_plan": valid,
            "calendar_events": [{
                "id": "session-1", "title": "4x4",
                "start": "2026-10-20T18:00:00Z",
                "end": "2026-10-20T19:00:00Z",
                "type": "running", "status": "completed",
                "plan_id": "plan-123",
            }],
        }}
    }) is None
    assert _validate_message({
        "event": "sync_snapshot",
        "payload": {"state": {"training_plan": {
            **valid, "shared_secret": "should-not-be-here",
        }}},
    }) == "invalid_training_plan"
    assert _validate_message({
        "event": "sync_snapshot",
        "payload": {"state": {"training_plan": {
            **valid, "current_week": 99,
        }}},
    }) == "invalid_training_plan"
    assert _validate_message({
        "event": "sync_snapshot",
        "payload": {"state": {"training_plan": None}},
    }) is None
    assert _validate_message({
        "event": "sync_snapshot",
        "payload": {"state": {"calendar_events": [{
            "id": "x", "title": "Run", "start": "2026-10-20T18:00:00Z",
            "end": "2026-10-20T19:00:00Z", "status": "lying",
        }]}},
    }) == "invalid_calendar_events"



def test_foreground_completed_workout_snapshot_is_bounded():
    """iPhone foreground last-workout metrics must be accepted without GPS."""
    from custom_components.athlth.webhook import _validate_message
    valid = {
        "event": "sync_snapshot",
        "payload": {"state": {
            "last_workout": "Running",
            "last_workout_type": "indoor_running",
            "last_workout_duration_seconds": 2700.0,
            "last_workout_distance_meters": 5500.0,
            "last_workout_ended_at": "2026-10-20T17:55:00Z",
            "last_workout_active_energy_kcal": 365.0,
            "last_workout_average_heart_rate_bpm": None,
            "last_workout_max_heart_rate_bpm": None,
        }},
    }
    assert _validate_message(valid) is None

    invalid = {"event": "sync_snapshot", "payload": {"state": {
        **valid["payload"]["state"],
        "last_workout_distance_meters": -100,
    }}}
    assert _validate_message(invalid) == "invalid_last_workout_distance_meters"



def test_foreground_privacy_field_requires_boolean_or_null():
    from custom_components.athlth.webhook import _validate_message

    def validated(flag):
        return _validate_message({
            "event": "sync_snapshot",
            "payload": {"state": {"app_foreground": flag}},
        })

    assert validated(True) is None
    assert validated(False) is None
    assert validated(None) is None
    assert validated("true") == "invalid_app_foreground"
    assert validated(1) == "invalid_app_foreground"

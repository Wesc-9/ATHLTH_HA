"""ATHLTH online and training presence is opt-in and expires safely."""

from custom_components.athlth.presence import resolve_presence


NOW = 1_000_000.0


def test_paired_device_is_not_automatically_online():
    assert resolve_presence({}, NOW, now=NOW) == "not_shared"
    assert resolve_presence({"app_foreground": None}, NOW, now=NOW) == "not_shared"


def test_online_requires_explicit_foreground_and_fresh_signed_delivery():
    assert resolve_presence({"app_foreground": True}, NOW - 10, now=NOW) == "online"
    assert resolve_presence({"app_foreground": False}, NOW - 10, now=NOW) == "offline"
    assert resolve_presence({"app_foreground": True}, NOW - 241, now=NOW) == "unknown"
    assert resolve_presence({"app_foreground": True}, None, now=NOW) == "unknown"
    assert resolve_presence({"app_foreground": True}, NOW + 120, now=NOW) == "unknown"


def test_recording_is_independent_of_app_foreground_but_cannot_be_stale():
    assert resolve_presence(
        {"workout_active": True, "app_foreground": False}, NOW - 15, now=NOW
    ) == "training"
    assert resolve_presence({"workout_active": True}, NOW - 15, now=NOW) == "training"
    assert resolve_presence(
        {"workout_active": True, "app_foreground": True}, NOW - 400, now=NOW
    ) == "unknown"
    assert resolve_presence(
        {"workout_active": False, "app_foreground": None}, NOW, now=NOW
    ) == "not_shared"

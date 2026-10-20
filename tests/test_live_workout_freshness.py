"""Ensure recording status is never mistaken for an indefinitely live Watch."""

from types import SimpleNamespace
import pytest

from custom_components.athlth.runtime import ATHLTHClientRuntime
from custom_components.athlth.binary_sensor import ATHLTHWorkoutActiveBinarySensor


@pytest.mark.parametrize(
    "age,expected",
    [
        (0, True),
        (239, True),
        (240, True),
        (241, False),
        (3000, False),
        (-61, False),
        (-60, True),
    ],
)
def test_live_workout_sensor_requires_fresh_signed_data(monkeypatch, age, expected):
    from custom_components.athlth import binary_sensor

    now = 1_000_000.0
    monkeypatch.setattr(binary_sensor.time, "time", lambda: now)
    client = ATHLTHClientRuntime(
        client_id="watch", name="Watch", shared_secret="signed",
        state={"workout_active": True, "active_workout": "Run"},
        last_seen=now - age,
        is_primary=True,
    )
    entry = SimpleNamespace(entry_id="entry")
    sensor = ATHLTHWorkoutActiveBinarySensor(entry, None, client)
    assert sensor.available is expected
    assert sensor.is_on is True


def test_restored_recording_does_not_stay_active_without_fresh_sync(monkeypatch):
    from custom_components.athlth import binary_sensor
    monkeypatch.setattr(binary_sensor.time, "time", lambda: 1000.0)

    client = ATHLTHClientRuntime(
        client_id="phone", name="Phone", shared_secret="signed",
        state={"workout_active": True},
        last_seen=None,
        is_primary=True,
    )
    sensor = ATHLTHWorkoutActiveBinarySensor(
        SimpleNamespace(entry_id="entry"), None, client
    )
    assert sensor.is_on is True
    assert sensor.available is False

    client.last_seen = 999.0
    assert sensor.available is True
    client.state["workout_active"] = False
    assert sensor.available is True
    assert sensor.is_on is False
    client.state.pop("workout_active")
    assert sensor.available is False


def test_connected_means_paired_not_live():
    from custom_components.athlth.binary_sensor import ATHLTHConnectionBinarySensor
    client = ATHLTHClientRuntime(
        client_id="phone", name="Phone", shared_secret="signed",
        last_seen=None, is_primary=True,
    )
    paired = ATHLTHConnectionBinarySensor(
        SimpleNamespace(entry_id="entry"), None, client
    )
    assert paired.is_on is True
    assert client.last_seen is None

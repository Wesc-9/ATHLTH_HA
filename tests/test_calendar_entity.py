"""Runtime behavior tests for the ATHLTH training calendar."""

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.athlth.calendar import ATHLTHTrainingCalendar
from custom_components.athlth.const import DOMAIN
from custom_components.athlth.runtime import (
    ATHLTHClientRuntime,
    ATHLTHRuntimeData,
)


def test_training_calendar_builds_home_assistant_events():
    """Shared ATHLTH sessions become real Home Assistant calendar events."""
    client = ATHLTHClientRuntime(
        client_id="client-primary",
        name="Primary",
        shared_secret="secret",
        is_primary=True,
        state={
            "calendar_events": [
                {
                    "id": "session-1",
                    "title": "Intervals",
                    "start": "2026-10-05T18:00:00+02:00",
                    "end": "2026-10-05T19:00:00+02:00",
                    "type": "running",
                }
            ]
        },
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="https://example.invalid/webhook",
        clients={client.client_id: client},
        primary_client_id=client.client_id,
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        entry_id="entry",
        data={},
    )

    entity = ATHLTHTrainingCalendar(
        entry,
        runtime,
        client,
    )
    events = entity._events()

    assert len(events) == 1
    assert events[0].summary == "Intervals"
    assert events[0].uid == "session-1"
    assert events[0].description == "ATHLTH · running"
    assert events[0].end > events[0].start

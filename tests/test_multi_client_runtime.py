"""Tests for independent ATHLTH client runtime state."""

from custom_components.athlth.runtime import (
    ATHLTHClientRuntime,
    ATHLTHRuntimeData,
)


def test_clients_have_independent_secrets_and_state():
    """Pairing one ATHLTH client must not mutate another client."""
    primary = ATHLTHClientRuntime(
        client_id="client-primary",
        name="Primary",
        shared_secret="primary-secret",
        is_primary=True,
    )
    second = ATHLTHClientRuntime(
        client_id="client-second",
        name="Second",
        shared_secret="second-secret",
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="https://example.invalid/api/webhook/webhook",
        clients={
            primary.client_id: primary,
            second.client_id: second,
        },
        primary_client_id=primary.client_id,
    )

    primary.state["workout_active"] = True
    second.state["workout_active"] = False

    assert runtime.resolve_client(primary.client_id) is primary
    assert runtime.resolve_client(second.client_id) is second
    assert runtime.resolve_client("entry") is primary
    assert primary.shared_secret != second.shared_secret
    assert primary.state["workout_active"] is True
    assert second.state["workout_active"] is False



def test_local_pairing_code_is_one_time():
    """A valid local pairing code can be used exactly once."""
    primary = ATHLTHClientRuntime(
        client_id="client-primary",
        name="Primary",
        shared_secret="primary-secret",
        is_primary=True,
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="/api/webhook/webhook",
        clients={primary.client_id: primary},
        primary_client_id=primary.client_id,
    )

    code, expires_at = runtime.issue_pairing_code()

    assert len(code) == 6
    assert code.isdigit()
    assert expires_at > 0
    assert runtime.verify_pairing_code(code) is True
    assert runtime.verify_pairing_code(code) is False


def test_local_pairing_code_locks_after_failed_attempts():
    """Repeated invalid codes invalidate the pending local pairing."""
    primary = ATHLTHClientRuntime(
        client_id="client-primary",
        name="Primary",
        shared_secret="primary-secret",
        is_primary=True,
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="/api/webhook/webhook",
        clients={primary.client_id: primary},
        primary_client_id=primary.client_id,
    )

    code, _ = runtime.issue_pairing_code(attempts=2)

    assert runtime.verify_pairing_code("999999") is False
    assert runtime.verify_pairing_code("888888") is False
    assert runtime.verify_pairing_code(code) is False



async def test_multi_client_plan_and_recent_history_persist_independently():
    """Saving shared plans/workouts must not mix data between two pairings."""
    class CapturingStore:
        def __init__(self):
            self.payload = None

        async def async_save(self, payload):
            self.payload = payload

    store = CapturingStore()
    primary = ATHLTHClientRuntime(
        client_id="device-a", name="Person A",
        shared_secret="secret-a", is_primary=True,
        state={
            "training_plan": {"id": "plan-a", "title": "Plan A",
                              "current_week": 2, "total_weeks": 8},
            "recent_workouts": [{"id": "work-a", "name": "Run"}],
        },
    )
    secondary = ATHLTHClientRuntime(
        client_id="device-b", name="Person B", shared_secret="secret-b",
        state={
            "training_plan": {"id": "plan-b", "title": "Plan B",
                              "current_week": 1, "total_weeks": 4},
            "recent_workouts": [{"id": "work-b", "name": "Strength"}],
        },
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry", webhook_id="webhook", webhook_url="/api/webhook/webhook",
        clients={primary.client_id: primary, secondary.client_id: secondary},
        primary_client_id=primary.client_id, client_store=store,
    )

    await runtime.async_save_clients()
    assert store.payload["primary_training_plan"]["id"] == "plan-a"
    assert store.payload["primary_recent_workouts"][0]["id"] == "work-a"
    assert store.payload["clients"]["device-b"]["training_plan"]["id"] == "plan-b"
    assert store.payload["clients"]["device-b"]["recent_workouts"][0]["id"] == "work-b"

    # Simulate revoking one member's share; the other must remain untouched.
    primary.state.pop("training_plan")
    primary.state.pop("recent_workouts")
    await runtime.async_save_clients()
    assert store.payload["primary_training_plan"] is None
    assert store.payload["primary_recent_workouts"] == []
    assert store.payload["clients"]["device-b"]["training_plan"]["id"] == "plan-b"


async def test_profile_and_pr_records_persist_without_cross_client_leakage():
    class CapturingStore:
        payload = None

        async def async_save(self, payload):
            self.payload = payload

    store = CapturingStore()
    a = ATHLTHClientRuntime(
        client_id="device-a", name="A", shared_secret="secret-a", is_primary=True,
        state={
            "athlete_display_name": "Athlete A",
            "athlete_avatar_url": "https://a.supabase.co/storage/v1/object/public/profile-avatars/a/avatar.jpg",
            "performance_records": [{
                "id": "best-5k", "title": "5K", "value": "20:00",
                "category": "running", "date": "2026-10-22T10:00:00Z",
            }],
        },
    )
    b = ATHLTHClientRuntime(
        client_id="device-b", name="B", shared_secret="secret-b",
        state={
            "athlete_display_name": "Athlete B",
            "performance_records": [{
                "id": "bench", "title": "Bench", "value": "90 kg",
                "category": "strength", "date": "2026-10-22T11:00:00Z",
            }],
        },
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry", webhook_id="webhook", webhook_url="/api/webhook/webhook",
        clients={a.client_id: a, b.client_id: b},
        primary_client_id=a.client_id, client_store=store,
    )
    await runtime.async_save_clients()
    assert store.payload["primary_identity"]["athlete_display_name"] == "Athlete A"
    assert store.payload["primary_performance_records"][0]["value"] == "20:00"
    assert store.payload["clients"]["device-b"]["identity"]["athlete_display_name"] == "Athlete B"
    assert store.payload["clients"]["device-b"]["performance_records"][0]["value"] == "90 kg"

    a.state["athlete_display_name"] = None
    a.state["athlete_avatar_url"] = None
    a.state["performance_records"] = []
    await runtime.async_save_clients()
    assert store.payload["primary_identity"]["athlete_avatar_url"] is None
    assert store.payload["primary_performance_records"] == []
    assert store.payload["clients"]["device-b"]["identity"]["athlete_display_name"] == "Athlete B"


async def test_90_day_history_persists_per_athlete_and_revocation_is_isolated():
    from datetime import datetime, timezone, timedelta
    class CapturingStore:
        payload = None
        async def async_save(self, payload):
            self.payload = payload

    timestamp = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    item = {
        "id": "workout-1", "type": "Running",
        "started_at": timestamp, "ended_at": timestamp,
        "duration_seconds": 1200, "environment": "unknown",
        "source": "apple_health", "distance_provenance": "healthkit_unverified",
    }
    primary = ATHLTHClientRuntime(
        client_id="a", name="A", shared_secret="a", is_primary=True,
        state={"workout_history": [item]},
    )
    second = ATHLTHClientRuntime(
        client_id="b", name="B", shared_secret="b",
        state={"workout_history": [{**item, "id": "workout-b"}]},
    )
    store = CapturingStore()
    runtime = ATHLTHRuntimeData(
        entry_id="entry", webhook_id="webhook", webhook_url="/api/webhook/webhook",
        clients={"a": primary, "b": second}, primary_client_id="a",
        client_store=store,
    )
    await runtime.async_save_clients()
    assert store.payload["primary_workout_history"][0]["id"] == "workout-1"
    assert store.payload["clients"]["b"]["workout_history"][0]["id"] == "workout-b"

    primary.state.pop("workout_history")
    await runtime.async_save_clients()
    assert store.payload["primary_workout_history"] == []
    assert store.payload["clients"]["b"]["workout_history"][0]["id"] == "workout-b"

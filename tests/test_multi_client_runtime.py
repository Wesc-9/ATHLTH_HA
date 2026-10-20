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

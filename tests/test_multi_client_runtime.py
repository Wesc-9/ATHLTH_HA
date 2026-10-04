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

"""Tests for ATHLTH Home Assistant command queues."""

from custom_components.athlth.runtime import (
    ATHLTHClientRuntime,
    ATHLTHRuntimeData,
)


async def test_commands_are_isolated_per_client():
    """One ATHLTH client cannot receive another client's command."""
    primary = ATHLTHClientRuntime(
        client_id="primary-client",
        name="Primary",
        shared_secret="primary-secret",
        is_primary=True,
    )
    second = ATHLTHClientRuntime(
        client_id="second-client",
        name="Second",
        shared_secret="second-secret",
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="https://example.invalid/webhook",
        clients={
            primary.client_id: primary,
            second.client_id: second,
        },
        primary_client_id=primary.client_id,
    )

    assert await runtime.async_enqueue_command(
        second.client_id,
        "training_reminder",
    )

    assert primary.pending_commands == []
    assert len(second.pending_commands) == 1
    assert second.pending_commands[0]["type"] == "training_reminder"


async def test_command_ack_removes_only_acknowledged_ids():
    """Acknowledging one command must leave later commands queued."""
    primary = ATHLTHClientRuntime(
        client_id="primary-client",
        name="Primary",
        shared_secret="primary-secret",
        is_primary=True,
    )
    runtime = ATHLTHRuntimeData(
        entry_id="entry",
        webhook_id="webhook",
        webhook_url="https://example.invalid/webhook",
        clients={primary.client_id: primary},
        primary_client_id=primary.client_id,
    )

    await runtime.async_enqueue_command(primary.client_id, "sync_now")
    await runtime.async_enqueue_command(
        primary.client_id,
        "training_reminder",
    )

    first_id = primary.pending_commands[0]["id"]
    second_id = primary.pending_commands[1]["id"]

    await runtime.async_ack_commands(primary, [first_id])

    assert [command["id"] for command in primary.pending_commands] == [
        second_id
    ]

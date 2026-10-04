"""Runtime state for ATHLTH."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from homeassistant.helpers.storage import Store


@dataclass(slots=True)
class ATHLTHClientRuntime:
    """Runtime state and credentials for one paired ATHLTH client."""

    client_id: str
    name: str
    shared_secret: str
    state: dict[str, Any] = field(default_factory=dict)
    nonces: dict[str, float] = field(default_factory=dict)
    delivery_ids: dict[str, float] = field(default_factory=dict)
    last_seen: float | None = None
    is_primary: bool = False


@dataclass(slots=True)
class ATHLTHRuntimeData:
    """Runtime data kept in memory for one ATHLTH config entry."""

    entry_id: str
    webhook_id: str
    webhook_url: str
    uses_cloudhook: bool = False
    clients: dict[str, ATHLTHClientRuntime] = field(default_factory=dict)
    primary_client_id: str = ""
    client_store: Store | None = None
    delivery_store: Store | None = None

    @property
    def primary_client(self) -> ATHLTHClientRuntime:
        """Return the primary ATHLTH client."""
        client = self.clients.get(self.primary_client_id)
        if client is not None:
            return client

        if self.clients:
            return next(iter(self.clients.values()))

        raise RuntimeError("ATHLTH runtime has no paired client state")

    # Backwards-compatible properties used by the primary entity set.
    @property
    def shared_secret(self) -> str:
        return self.primary_client.shared_secret

    @shared_secret.setter
    def shared_secret(self, value: str) -> None:
        self.primary_client.shared_secret = value

    @property
    def state(self) -> dict[str, Any]:
        return self.primary_client.state

    @property
    def nonces(self) -> dict[str, float]:
        return self.primary_client.nonces

    @property
    def delivery_ids(self) -> dict[str, float]:
        return self.primary_client.delivery_ids

    @property
    def last_seen(self) -> float | None:
        return self.primary_client.last_seen

    @last_seen.setter
    def last_seen(self, value: float | None) -> None:
        self.primary_client.last_seen = value

    def resolve_client(
        self,
        client_id: str | None,
    ) -> ATHLTHClientRuntime | None:
        """Resolve a client while accepting the legacy entry id alias."""
        if not client_id or client_id == self.entry_id:
            return self.primary_client
        return self.clients.get(client_id)

    def public_clients(self) -> list[ATHLTHClientRuntime]:
        """Return paired clients in stable display order."""
        return sorted(
            self.clients.values(),
            key=lambda client: (
                not client.is_primary,
                client.name.casefold(),
                client.client_id,
            ),
        )

    async def async_save_additional_clients(self) -> None:
        """Persist non-primary client credentials and delivery ids."""
        if self.client_store is None:
            return

        payload = {
            "clients": {
                client_id: {
                    "name": client.name,
                    "shared_secret": client.shared_secret,
                    "delivery_ids": client.delivery_ids,
                }
                for client_id, client in self.clients.items()
                if not client.is_primary
            }
        }
        await self.client_store.async_save(payload)

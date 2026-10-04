"""Runtime state for ATHLTH."""

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ATHLTHRuntimeData:
    """Runtime data kept in memory for one ATHLTH config entry."""

    entry_id: str
    webhook_id: str
    webhook_url: str
    shared_secret: str
    uses_cloudhook: bool = False
    state: dict[str, Any] = field(default_factory=dict)
    nonces: dict[str, float] = field(default_factory=dict)
    last_seen: float | None = None

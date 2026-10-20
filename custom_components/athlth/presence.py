"""Privacy-aware, expiring app-foreground and recording status.

Never equate an authenticated pairing with an online person.
The flag is explicit and may be missing when sharing is disabled.
"""

from __future__ import annotations

from typing import Any

PRESENCE_FRESH_SECONDS = 240
CLOCK_TOLERANCE_SECONDS = 60


def resolve_presence(
    state: dict[str, Any],
    last_seen: float | None,
    *,
    now: float,
) -> str:
    """Return training, online, offline, not_shared or unknown.

    'Online' means this paired ATHLTH app was foregrounded during a recent
    signed delivery, not that the user is online anywhere in the ATHLTH social
    network. An active Watch session may report training with the phone closed.
    """
    foreground = state.get("app_foreground")
    training = state.get("workout_active") is True
    if not training and foreground is None:
        return "not_shared"
    if last_seen is None:
        return "unknown"
    age = now - last_seen
    if age < -CLOCK_TOLERANCE_SECONDS or age > PRESENCE_FRESH_SECONDS:
        return "unknown"
    if training:
        return "training"
    if foreground is True:
        return "online"
    if foreground is False:
        return "offline"
    return "not_shared"

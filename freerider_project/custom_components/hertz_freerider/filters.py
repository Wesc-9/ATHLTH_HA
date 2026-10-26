"""Pure ride filtering logic shared by future country adapters."""

from __future__ import annotations

from dataclasses import dataclass
import unicodedata


@dataclass(frozen=True)
class Ride:
    source_country: str
    source_id: str
    origin: str
    destination: str
    vehicle: str
    booking_url: str


def normalize(text: str) -> str:
    """Casefold and ignore simple accents for robust town matches."""
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c)).casefold().strip()


def matching_rides(
    rides: list[Ride], countries: list[str], origin: str = "", destination: str = ""
) -> list[Ride]:
    """Filter independently by country, departure and destination."""
    return [
        ride
        for ride in rides
        if ride.source_country in countries
        and normalize(origin) in normalize(ride.origin)
        and normalize(destination) in normalize(ride.destination)
    ]

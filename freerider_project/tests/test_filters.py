"""Tests for multi-country matching. Run with pytest at project root."""

from custom_components.hertz_freerider.filters import Ride, matching_rides


def test_country_and_route_filters():
    sample = [
        Ride("NO", "1", "Trondheim Sluppen", "Bodø lufthavn", "Volvo", "https://example.invalid/1"),
        Ride("SE", "2", "Göteborg", "Stockholm", "Volvo", "https://example.invalid/2"),
        Ride("DK", "3", "Aarhus", "København", "Toyota", "https://example.invalid/3"),
    ]
    assert [r.source_id for r in matching_rides(sample, ["NO", "SE", "DK"])] == ["1", "2", "3"]
    assert [r.source_id for r in matching_rides(sample, ["NO"], "trondheim", "bodo")] == ["1"]
    assert [r.source_id for r in matching_rides(sample, ["SE"], "goteborg")] == ["2"]
    assert [r.source_id for r in matching_rides(sample, ["DK"], "", "kobenhavn")] == ["3"]

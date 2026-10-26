"""Sensor for matching Freerider offers."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_COUNTRIES, CONF_FROM, CONF_TO, DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    """Register a sensor linked to this setup."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([FreeriderOffersSensor(coordinator, entry)])


class FreeriderOffersSensor(CoordinatorEntity, SensorEntity):
    """Total matching offers across the chosen country sources."""

    _attr_name = "Hertz Freerider matching offers"
    _attr_icon = "mdi:car-search"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_offers"

    @property
    def native_value(self):
        """Never present an error as zero offers."""
        return len(self.coordinator.data) if self.coordinator.data is not None else None

    @property
    def extra_state_attributes(self):
        """Expose currently selected filters."""
        filters = {**self._entry.data, **self._entry.options}
        return {
            "countries": filters.get(CONF_COUNTRIES, []),
            "from": filters.get(CONF_FROM, ""),
            "to": filters.get(CONF_TO, ""),
            "source_status": "adapter_not_implemented",
        }

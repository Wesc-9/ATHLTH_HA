"""Multi-country and route-filter setup through Home Assistant UI."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries

from .const import (
    CONF_COUNTRIES,
    CONF_FROM,
    CONF_TO,
    COUNTRIES,
    DEFAULT_COUNTRIES,
    DOMAIN,
)

def schema(values: dict | None = None) -> vol.Schema:
    """Build a simple, editable configuration form."""
    values = values or {}
    return vol.Schema({
        vol.Required(CONF_COUNTRIES, default=values.get(CONF_COUNTRIES, DEFAULT_COUNTRIES)):
            vol.All(vol.Coerce(list), [vol.In(list(COUNTRIES))], vol.Length(min=1)),
        vol.Optional(CONF_FROM, default=values.get(CONF_FROM, "")): str,
        vol.Optional(CONF_TO, default=values.get(CONF_TO, "")): str,
    })


class HertzFreeriderConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Interactive configuration, no credentials collected."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Ask which country feeds and stations to monitor."""
        if user_input is not None:
            await self.async_set_unique_id("freerider_sources")
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="Hertz Freerider", data=user_input)
        return self.async_show_form(step_id="user", data_schema=schema())

    @staticmethod
    def async_get_options_flow(config_entry):
        """Return editable origin/destination/region choices."""
        return HertzFreeriderOptionsFlow(config_entry)


class HertzFreeriderOptionsFlow(config_entries.OptionsFlow):
    """Edit selection directly from Devices & services."""

    def __init__(self, config_entry):
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        """Save changed selection."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=schema({**self._entry.data, **self._entry.options}),
        )

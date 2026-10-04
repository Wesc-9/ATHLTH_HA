"""Config flow for ATHLTH."""

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN


class ATHLTHConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle ATHLTH setup."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Create the single ATHLTH config entry."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="ATHLTH", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )

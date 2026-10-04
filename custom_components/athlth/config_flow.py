"""Config and options flows for ATHLTH."""

from typing import Any

import probatio

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigEntryState,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers.network import NoURLAvailableError, get_url

from .const import (
    DATA_RUNTIMES,
    DOMAIN,
    PAIRING_CODE_ATTEMPTS,
    PAIRING_CODE_TTL_SECONDS,
)
from .runtime import ATHLTHRuntimeData


class ATHLTHConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle ATHLTH setup."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> OptionsFlow:
        """Create the ATHLTH pairing-code options flow."""
        return ATHLTHOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Create the single ATHLTH config entry."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="ATHLTH", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=probatio.Schema({}),
        )


class ATHLTHOptionsFlow(OptionsFlow):
    """Show a short-lived local pairing code for the ATHLTH app."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Issue a one-time code without persisting it in Home Assistant."""
        if user_input is not None:
            return self.async_create_entry(data={})

        runtimes: dict[str, ATHLTHRuntimeData] = (
            self.hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
        )
        runtime = runtimes.get(self.config_entry.entry_id)

        if runtime is None:
            # A config entry can briefly exist before its runtime is ready,
            # and older failed setups can leave a loaded-looking entry with
            # no runtime. Recover once here so the user does not get stuck
            # behind a dead-end "not loaded" dialog.
            if self.config_entry.state is ConfigEntryState.LOADED:
                await self.hass.config_entries.async_reload(
                    self.config_entry.entry_id
                )
            elif self.config_entry.state is ConfigEntryState.SETUP_IN_PROGRESS:
                await self.hass.async_block_till_done()
            else:
                await self.hass.config_entries.async_setup(
                    self.config_entry.entry_id
                )

            runtimes = (
                self.hass.data.get(DOMAIN, {}).get(DATA_RUNTIMES, {})
            )
            runtime = runtimes.get(self.config_entry.entry_id)

        if runtime is None:
            return self.async_abort(reason="not_loaded")

        code, _ = runtime.issue_pairing_code(
            ttl_seconds=PAIRING_CODE_TTL_SECONDS,
            attempts=PAIRING_CODE_ATTEMPTS,
        )

        try:
            local_url = get_url(
                self.hass,
                allow_internal=True,
                allow_external=False,
                allow_cloud=False,
                allow_ip=True,
                prefer_external=False,
            )
        except NoURLAvailableError:
            local_url = (
                self.hass.config.internal_url
                or "http://homeassistant.local:8123"
            )

        return self.async_show_form(
            step_id="init",
            data_schema=probatio.Schema({}),
            description_placeholders={
                "pairing_code": f"{code[:3]} {code[3:]}",
                "address": local_url,
                "expires_minutes": str(PAIRING_CODE_TTL_SECONDS // 60),
            },
        )

"""Tests for the ATHLTH config flow."""

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.athlth.const import DOMAIN


async def test_user_flow_creates_entry(hass):
    """ATHLTH can be added entirely through the UI."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_USER},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {},
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "ATHLTH"
    assert result["data"] == {}


async def test_user_flow_allows_only_one_entry(hass):
    """Only one ATHLTH bridge is configured per Home Assistant instance."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=DOMAIN,
        data={},
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_USER},
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_config_entry_sets_up_runtime(hass):
    """A freshly created ATHLTH entry reaches the loaded runtime state."""
    from custom_components.athlth.const import DATA_RUNTIMES

    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=DOMAIN,
        data={},
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.entry_id in hass.data[DOMAIN][DATA_RUNTIMES]

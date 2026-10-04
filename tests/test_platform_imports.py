"""Import smoke tests for ATHLTH entity platforms."""


def test_entity_platform_modules_import():
    """All public ATHLTH platforms import on supported Home Assistant."""
    from custom_components.athlth import binary_sensor  # noqa: F401
    from custom_components.athlth import button  # noqa: F401
    from custom_components.athlth import calendar  # noqa: F401
    from custom_components.athlth import event  # noqa: F401
    from custom_components.athlth import notify  # noqa: F401
    from custom_components.athlth import sensor  # noqa: F401

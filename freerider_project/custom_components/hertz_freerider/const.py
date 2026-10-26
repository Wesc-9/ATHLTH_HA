"""Constants for Freerider source adapters and user route filters."""

DOMAIN = "hertz_freerider"
COUNTRIES = {
    "NO": "Norway",
    "SE": "Sweden",
    "DK": "Denmark",
}
SOURCE_PAGES = {
    "NO": "https://hertzfreerider.no/",
    "SE": "https://hertzfreerider.se/",
    "DK": "https://hertzfreerider.nu/",
}
CONF_COUNTRIES = "countries"
CONF_FROM = "origin"
CONF_TO = "destination"
DEFAULT_COUNTRIES = ["NO"]
POLL_INTERVAL_MINUTES = 15

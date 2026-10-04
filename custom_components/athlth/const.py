"""Constants for the ATHLTH integration."""

DOMAIN = "athlth"
NAME = "ATHLTH"

CONF_WEBHOOK_ID = "webhook_id"
CONF_SHARED_SECRET = "shared_secret"

DATA_API_REGISTERED = "api_registered"
DATA_RUNTIMES = "runtimes"

PAIR_API_PATH = "/api/athlth/pair"

HEADER_TIMESTAMP = "X-ATHLTH-Timestamp"
HEADER_NONCE = "X-ATHLTH-Nonce"
HEADER_SIGNATURE = "X-ATHLTH-Signature"

SIGNATURE_PREFIX = "sha256="
MAX_CLOCK_SKEW_SECONDS = 300
NONCE_TTL_SECONDS = 600

SUPPORTED_PROTOCOL_VERSION = 1


def signal_update(entry_id: str) -> str:
    """Return the dispatcher signal used to refresh ATHLTH entities."""
    return f"{DOMAIN}_{entry_id}_update"

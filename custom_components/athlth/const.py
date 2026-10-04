"""Constants for the ATHLTH integration."""

DOMAIN = "athlth"
NAME = "ATHLTH"

CONF_WEBHOOK_ID = "webhook_id"
CONF_SHARED_SECRET = "shared_secret"
CONF_CLOUDHOOK_URL = "cloudhook_url"

DATA_API_REGISTERED = "api_registered"
DATA_RUNTIMES = "runtimes"

PAIR_API_PATH = "/api/athlth/pair"

HEADER_TIMESTAMP = "X-ATHLTH-Timestamp"
HEADER_NONCE = "X-ATHLTH-Nonce"
HEADER_SIGNATURE = "X-ATHLTH-Signature"

SIGNATURE_PREFIX = "sha256="
MAX_CLOCK_SKEW_SECONDS = 300
NONCE_TTL_SECONDS = 600
DELIVERY_ID_TTL_SECONDS = 7 * 24 * 60 * 60
MAX_DELIVERY_ID_LENGTH = 64
MAX_PAYLOAD_BYTES = 64 * 1024
MAX_NONCE_LENGTH = 128

SUPPORTED_PROTOCOL_VERSION = 1
SUPPORTED_SIGNATURE_ALGORITHM = "HMAC-SHA256"

SUPPORTED_EVENTS = frozenset(
    {
        "workout_started",
        "workout_updated",
        "workout_finished",
        "workout_cancelled",
        "recovery_updated",
        "training_load_updated",
        "weekly_progress_updated",
        "next_workout_updated",
        "sync_snapshot",
        "unpair",
    }
)

RESTORABLE_STATE_KEYS = frozenset(
    {
        "last_workout",
        "recovery_score",
        "training_load",
        "weekly_progress",
        "next_workout",
        "workout_active",
        "active_workout",
    }
)


def signal_update(entry_id: str) -> str:
    """Return the dispatcher signal used to refresh ATHLTH entities."""
    return f"{DOMAIN}_{entry_id}_update"

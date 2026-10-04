"""Constants for the ATHLTH integration."""

DOMAIN = "athlth"
NAME = "ATHLTH"

CONF_WEBHOOK_ID = "webhook_id"
CONF_SHARED_SECRET = "shared_secret"
CONF_CLOUDHOOK_URL = "cloudhook_url"
CONF_PRIMARY_CLIENT_ID = "primary_client_id"
CONF_PRIMARY_CLIENT_NAME = "primary_client_name"

DATA_API_REGISTERED = "api_registered"
DATA_RUNTIMES = "runtimes"

PAIR_API_PATH = "/api/athlth/pair"

HEADER_TIMESTAMP = "X-ATHLTH-Timestamp"
HEADER_CLIENT_ID = "X-ATHLTH-Client-ID"
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
        "command_ack",
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
        "next_workout_time",
        "sleep_duration_minutes",
        "hrv_milliseconds",
        "resting_heart_rate",
        "respiratory_rate",
        "weekly_training_minutes",
        "weekly_distance_km",
        "workout_active",
        "active_workout",
        "active_workout_type",
        "active_workout_started_at",
        "active_workout_device",
        "last_workout_type",
        "last_workout_duration_seconds",
        "last_workout_distance_meters",
        "last_workout_ended_at",
        "last_workout_device",
        "recovery_state",
        "active_goal",
        "goal_progress",
        "goal_days_remaining",
        "training_streak",
        "weekly_workout_count",
        "calendar_events",
        "pending_delivery_count",
    }
)


def signal_update(entry_id: str) -> str:
    """Return the dispatcher signal used to refresh ATHLTH entities."""
    return f"{DOMAIN}_{entry_id}_update"


def signal_client_added(entry_id: str) -> str:
    """Return the dispatcher signal used when a new ATHLTH client is paired."""
    return f"{DOMAIN}_{entry_id}_client_added"


USER_EVENT_TYPES = (
    "workout_started",
    "workout_updated",
    "workout_finished",
    "workout_cancelled",
    "recovery_updated",
    "training_load_updated",
    "weekly_progress_updated",
    "next_workout_updated",
)


def signal_event(entry_id: str) -> str:
    """Return the dispatcher signal used for ATHLTH event entities."""
    return f"{DOMAIN}_{entry_id}_event"

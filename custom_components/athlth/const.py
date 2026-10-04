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
PAIR_LOCAL_API_PATH = "/api/athlth/pair/local"
PAIRING_CODE_TTL_SECONDS = 300
PAIRING_CODE_ATTEMPTS = 5

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

WORKOUT_PHASES = frozenset(
    {
        "preparing",
        "warmup",
        "active",
        "rest",
        "cooldown",
        "paused",
        "finished",
    }
)

SUPPORTED_EVENTS = frozenset(
    {
        "workout_started",
        "workout_updated",
        "workout_phase_updated",
        "workout_finished",
        "workout_cancelled",
        "strength_set_updated",
        "strength_set_completed",
        "personal_record",
        "achievement_unlocked",
        "goal_completed",
        "challenge_completed",
        "recovery_updated",
        "training_load_updated",
        "weekly_progress_updated",
        "next_workout_updated",
        "sync_snapshot",
        "command_ack",
        "unpair",
    }
)

LIVE_STATE_KEYS = frozenset(
    {
        "workout_phase",
        "active_workout_elapsed_seconds",
        "active_workout_distance_meters",
        "active_workout_pace_seconds_per_km",
        "active_workout_speed_kmh",
        "active_workout_heart_rate_bpm",
        "active_workout_heart_rate_zone",
        "active_workout_environment",
        "treadmill_incline_percent",
        "current_exercise",
        "current_exercise_index",
        "current_set",
        "current_set_index",
        "current_set_total",
        "current_reps",
        "current_weight_kg",
        "current_resistance_level",
        "current_rest_seconds",
        "current_row_distance_meters",
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
        *LIVE_STATE_KEYS,
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
    "workout_phase_updated",
    "workout_finished",
    "workout_cancelled",
    "strength_set_updated",
    "strength_set_completed",
    "personal_record",
    "achievement_unlocked",
    "goal_completed",
    "challenge_completed",
    "recovery_updated",
    "training_load_updated",
    "weekly_progress_updated",
    "next_workout_updated",
)


def signal_event(entry_id: str) -> str:
    """Return the dispatcher signal used for ATHLTH event entities."""
    return f"{DOMAIN}_{entry_id}_event"

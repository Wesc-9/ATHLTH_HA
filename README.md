# ATHLTH for Home Assistant

Official Home Assistant custom integration for **ATHLTH**.

ATHLTH connects to Home Assistant without asking users to create, paste or store a Home Assistant API key or long-lived access token.

## Install

### 1. Add ATHLTH to HACS

[![Open your Home Assistant instance and add the ATHLTH repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Wesc-9&repository=ATHLTH_HA&category=integration)

Install **ATHLTH** from HACS and restart Home Assistant. Home Assistant **2026.9.4 or newer** is required.

### 2. Add the integration

[![Open your Home Assistant instance and start setting up ATHLTH.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=athlth)

You can also open **Settings → Devices & services → Add integration** and search for **ATHLTH**.

### 3. Generate a local pairing code

Open **Settings → Devices & services → ATHLTH → Configure** in Home Assistant. Home Assistant displays a six-digit one-time pairing code and the local address it expects ATHLTH to use. The code expires after five minutes and can only be used once.

### 4. Pair from the ATHLTH app

Open **ATHLTH → Settings → Connections → Home Assistant**. Enter the six-digit code, then select the discovered Home Assistant instance. If discovery is unavailable, enter the local Home Assistant address manually. OAuth/PKCE sign-in remains available as a fallback for advanced or non-local setups.

## Security model

1. An authenticated Home Assistant administrator explicitly generates a short-lived six-digit pairing code.
2. The code is kept only in memory as a salted SHA-256 digest, expires after five minutes and is invalidated after successful use or five failed attempts.
3. The unauthenticated code-exchange endpoint accepts requests only from local/private network addresses.
4. ATHLTH exchanges the one-time code for a random per-installation client ID, webhook endpoint and long signing secret.
5. The six-digit code is never used for normal communication and is not stored in ATHLTH.
6. Each paired ATHLTH app installation has its own client ID and signing secret. Pairing another household member does not invalidate existing clients.
7. ATHLTH stores pairing material in the iOS Keychain. If workout-state sharing is enabled, the paired Apple Watch receives only the webhook pairing material it needs and stores it in the Watch Keychain.
8. OAuth with PKCE remains available as a fallback. Any temporary OAuth refresh token is revoked after pairing.
9. Normal updates use HMAC-SHA256 signed webhook requests.
10. Home Assistant rejects stale timestamps, replayed nonces, duplicate reliable deliveries, unknown events, oversized payloads and invalid signatures.
11. Re-pairing or disconnecting rotates only that client's secret and does not affect other paired ATHLTH users.

Webhook URLs and signing secrets are credentials. They are never written to logs or exposed by diagnostics. Diagnostics report only an anonymous client count, not client IDs, names, workout values or health values.

## Privacy

This public repository contains **no ATHLTH user data, Home Assistant addresses, webhook IDs, pairing secrets, access tokens, health data or private ATHLTH backend credentials**.

Health-derived data is only sent to the Home Assistant instance selected by the user and only for categories enabled in ATHLTH. The app provides individual sharing controls for workout state, completed workouts, recovery, training load, sleep, HRV, resting heart rate, respiratory rate, weekly progress, next workout, the full training calendar and active goal data. More sensitive Health metrics, the full training calendar and goal data are off until the user explicitly enables them.

Home Assistant diagnostics intentionally exclude workout values, health values, names, locations and identifiers. Sensitive config-entry values are redacted.

## Entities

ATHLTH creates one device/entity set per paired ATHLTH app installation. The first paired client keeps the simple entity IDs below; additional clients receive separate Home Assistant devices and unique entity IDs.

ATHLTH currently exposes:

- `sensor.athlth_last_workout`
- `sensor.athlth_recovery_score`
- `sensor.athlth_training_load`
- `sensor.athlth_weekly_progress`
- `sensor.athlth_next_workout`
- `sensor.athlth_next_workout_time`
- `sensor.athlth_sleep_duration`
- `sensor.athlth_hrv`
- `sensor.athlth_resting_heart_rate`
- `sensor.athlth_respiratory_rate`
- `sensor.athlth_weekly_training_minutes`
- `sensor.athlth_weekly_distance`
- `sensor.athlth_recovery_state`
- `sensor.athlth_active_goal`
- `sensor.athlth_goal_progress`
- `sensor.athlth_goal_days_remaining`
- `sensor.athlth_training_streak`
- `sensor.athlth_weekly_workout_count`
- `sensor.athlth_last_sync`
- `sensor.athlth_pending_deliveries`
- `sensor.athlth_pending_commands`
- `binary_sensor.athlth_workout_active`
- `binary_sensor.athlth_connected`
- `calendar.athlth_training`
- `event.athlth_events`
- `notify.athlth_notification`

The active-workout binary sensor also exposes workout name, type, start time and recording device when available. The last-workout sensor exposes type, duration, distance, end time and recording device. Sleep, HRV, resting heart rate, respiratory rate, recovery and training load are individually controlled from ATHLTH and health-derived sharing is off by default.

Entity values are restored after a Home Assistant restart and refreshed when ATHLTH reconnects.

## Home Assistant features

ATHLTH also provides:

- `calendar.athlth_training` with planned workouts, start/end times and workout type.
- `event.athlth_events` for workout/recovery/training events that are easier to browse and automate than raw event-bus events.
- `button.athlth_refresh_athlth_data`, `button.athlth_show_next_workout` and `button.athlth_training_reminder`.
- `notify.athlth_notification` for messages from Home Assistant to the paired ATHLTH app.
- Recovery-state, active-goal, goal-progress, days-remaining, training-streak, weekly-workout-count, last-sync and queue-health sensors.
- A native dashboard example in `examples/dashboard-card.yaml`.
- Importable automation blueprints under `blueprints/automation/athlth/`.

Home Assistant to ATHLTH commands are not remote-control credentials. They are stored in a small per-client queue and returned only as part of a later HMAC-authenticated ATHLTH webhook response. The app acknowledges command IDs after processing them. This keeps clients isolated and avoids exposing a Home Assistant API token to ATHLTH.

Because iOS controls background execution, queued commands are delivered on the next ATHLTH contact rather than at a guaranteed fixed interval. ATHLTH uses HealthKit background delivery as its primary background wake source and a short BGAppRefresh heartbeat as a fallback on iPhone. Workout and Health changes therefore update Home Assistant without requiring the user to open ATHLTH in normal operation, while iOS may still defer work or suppress background launches after a force-quit.

## Events

Home Assistant can use these events in automations:

- `athlth_workout_started`
- `athlth_workout_updated`
- `athlth_workout_finished`
- `athlth_workout_cancelled`
- `athlth_recovery_updated`
- `athlth_training_load_updated`
- `athlth_weekly_progress_updated`
- `athlth_next_workout_updated`

Example uses include changing workout-room lighting, starting ventilation, triggering music automations, or switching the home into a recovery routine.

## Webhook signing protocol

Each request includes:

- `X-ATHLTH-Client-ID`: random app-installation identifier used to select the correct per-client signing key
- `X-ATHLTH-Timestamp`: Unix timestamp in seconds
- `X-ATHLTH-Nonce`: unique random value per request
- `X-ATHLTH-Signature`: `sha256=<hex digest>`

The signature is HMAC-SHA256 over:

```text
<timestamp>.<nonce>.<raw request body>
```

Home Assistant accepts only documented ATHLTH events and payloads up to 64 KiB.

## Compatibility

- Home Assistant: **2026.9.4 or newer**
- Integration protocol: **1**
- Signature algorithm: **HMAC-SHA256**
- iPhone background updates: HealthKit background delivery + BGAppRefresh fallback; execution timing remains controlled by iOS

One Home Assistant instance can pair multiple ATHLTH app installations independently. Each client has its own signing secret and entity set.

When an Apple Watch is recording without a reachable iPhone, it can send only workout start/stop state directly to Home Assistant. Continuous heart rate, GPS and other live health telemetry are intentionally not sent by the Watch integration. The iPhone remains authoritative for the completed workout details when it reconnects.

## Development

The Home Assistant component lives entirely under `custom_components/athlth`. No source code, configuration files or credentials from the private ATHLTH application repository are required to install this integration.

Validation runs with HACS, Home Assistant hassfest, and the automated test suite against both the current stable Home Assistant release and the upcoming beta. Security-sensitive changes should include tests.

## Support

Use GitHub Issues for reproducible integration problems. **Never paste webhook URLs, webhook IDs, pairing secrets, access tokens, Home Assistant external URLs, health exports or diagnostics containing personal information into a public issue.**

See [SECURITY.md](SECURITY.md) for security-reporting guidance.


## Live training and automations (0.3.0)

ATHLTH 0.3 adds an opt-in live-training layer intended for home-gym automations and dashboards. When enabled in the ATHLTH app, Home Assistant can receive workout phase, elapsed time, distance, pace/speed, heart-rate zone, treadmill environment/incline, and strength set context such as exercise, set, reps, weight, rowing resistance and rowing distance. GPS coordinates are deliberately not part of this protocol.

New user events include `workout_phase_updated`, `strength_set_updated`, `strength_set_completed`, `personal_record`, `achievement_unlocked`, `goal_completed` and `challenge_completed`. These are exposed through `event.athlth_events` as well as the local Home Assistant event bus.

Home Assistant also registers safe ATHLTH actions: `athlth.sync_now`, `athlth.show_next_workout`, `athlth.send_notification`, `athlth.open_planned_workout`, `athlth.schedule_extra_workout` and `athlth.move_planned_workout`. Commands are queued per paired client and returned only on a later HMAC-authenticated ATHLTH contact. Scheduling from Home Assistant creates a standalone extra workout and intentionally does not alter the active ATHLTH training plan.

A `binary_sensor.athlth_connection_healthy` entity summarizes stale synchronization and backed-up command/delivery queues. Additional ready-to-import blueprints cover home-gym mode, treadmill mode, workout completion, recovery evenings and PR celebrations.

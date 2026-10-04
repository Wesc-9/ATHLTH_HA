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

### 3. Pair from the ATHLTH app

Open **ATHLTH → Settings → Connections → Home Assistant**. ATHLTH discovers local Home Assistant instances automatically, or you can enter an address manually.

## Security model

1. The user explicitly signs in to their own Home Assistant instance during pairing.
2. ATHLTH uses OAuth with PKCE for the pairing step.
3. The authenticated app calls `POST /api/athlth/pair`.
4. Home Assistant returns a webhook endpoint plus a random signing secret for that ATHLTH app installation.
5. Each paired ATHLTH app installation has its own client ID and signing secret. Pairing another household member does not invalidate existing clients.
6. ATHLTH stores pairing material in the iOS Keychain. If workout-state sharing is enabled, the paired Apple Watch receives only the webhook pairing material it needs and stores it in the Watch Keychain.
7. The temporary Home Assistant OAuth session is revoked after pairing.
8. Normal updates use HMAC-SHA256 signed webhook requests.
9. Home Assistant rejects stale timestamps, replayed nonces, duplicate reliable deliveries, unknown events, oversized payloads and invalid signatures.
10. Re-pairing or disconnecting rotates only that client's secret and does not affect other paired ATHLTH users.

Webhook URLs and signing secrets are credentials. They are never written to logs or exposed by diagnostics. Diagnostics report only an anonymous client count, not client IDs, names, workout values or health values.

## Privacy

This public repository contains **no ATHLTH user data, Home Assistant addresses, webhook IDs, pairing secrets, access tokens, health data or private ATHLTH backend credentials**.

Health-derived data is only sent to the Home Assistant instance selected by the user and only for categories enabled in ATHLTH. The app provides individual sharing controls for workout state, completed workouts, recovery, training load, weekly progress and next workout.

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
- `binary_sensor.athlth_workout_active`

The active-workout binary sensor also exposes workout name, type, start time and recording device when available. The last-workout sensor exposes type, duration, distance, end time and recording device. Sleep, HRV, resting heart rate, respiratory rate, recovery and training load are individually controlled from ATHLTH and health-derived sharing is off by default.

Entity values are restored after a Home Assistant restart and refreshed when ATHLTH reconnects.

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

One Home Assistant instance can pair multiple ATHLTH app installations independently. Each client has its own signing secret and entity set.

When an Apple Watch is recording without a reachable iPhone, it can send only workout start/stop state directly to Home Assistant. Continuous heart rate, GPS and other live health telemetry are intentionally not sent by the Watch integration. The iPhone remains authoritative for the completed workout details when it reconnects.

## Development

The Home Assistant component lives entirely under `custom_components/athlth`. No source code, configuration files or credentials from the private ATHLTH application repository are required to install this integration.

Validation runs with HACS, Home Assistant hassfest, and the automated test suite against both the current stable Home Assistant release and the upcoming beta. Security-sensitive changes should include tests.

## Support

Use GitHub Issues for reproducible integration problems. **Never paste webhook URLs, webhook IDs, pairing secrets, access tokens, Home Assistant external URLs, health exports or diagnostics containing personal information into a public issue.**

See [SECURITY.md](SECURITY.md) for security-reporting guidance.

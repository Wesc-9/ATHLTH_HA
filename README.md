# ATHLTH for Home Assistant

Official Home Assistant custom integration for **ATHLTH**.

ATHLTH connects to Home Assistant without asking users to create, paste or store a Home Assistant API key or long-lived access token.

## Install

### 1. Add ATHLTH to HACS

[![Open your Home Assistant instance and add the ATHLTH repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Wesc-9&repository=ATHLTH_HA&category=integration)

Install **ATHLTH** from HACS and restart Home Assistant.

### 2. Add the integration

[![Open your Home Assistant instance and start setting up ATHLTH.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=athlth)

You can also open **Settings → Devices & services → Add integration** and search for **ATHLTH**.

### 3. Pair from the ATHLTH app

Open **ATHLTH → Settings → Connections → Home Assistant**. ATHLTH discovers local Home Assistant instances automatically, or you can enter an address manually.

## Security model

1. The user explicitly signs in to their own Home Assistant instance during pairing.
2. ATHLTH uses OAuth with PKCE for the pairing step.
3. The authenticated app calls `POST /api/athlth/pair`.
4. Home Assistant returns a random per-installation webhook ID and signing secret.
5. ATHLTH stores only the pairing material in the iOS Keychain.
6. The temporary Home Assistant OAuth session is revoked after pairing.
7. Normal updates use HMAC-SHA256 signed webhook requests.
8. Home Assistant rejects stale timestamps, replayed nonces, unknown events, oversized payloads and invalid signatures.
9. Re-pairing or disconnecting rotates the secret and invalidates the old pairing.

The webhook ID and signing secret are credentials. They are never written to logs or exposed by diagnostics.

## Privacy

This public repository contains **no ATHLTH user data, Home Assistant addresses, webhook IDs, pairing secrets, access tokens, health data or private ATHLTH backend credentials**.

Health-derived data is only sent to the Home Assistant instance selected by the user and only for categories enabled in ATHLTH. The app provides individual sharing controls for workout state, completed workouts, recovery, training load, weekly progress and next workout.

Home Assistant diagnostics intentionally exclude workout values, health values, names, locations and identifiers. Sensitive config-entry values are redacted.

## Entities

ATHLTH currently exposes:

- `sensor.athlth_last_workout`
- `sensor.athlth_recovery_score`
- `sensor.athlth_training_load`
- `sensor.athlth_weekly_progress`
- `sensor.athlth_next_workout`
- `binary_sensor.athlth_workout_active`

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

- `X-ATHLTH-Timestamp`: Unix timestamp in seconds
- `X-ATHLTH-Nonce`: unique random value per request
- `X-ATHLTH-Signature`: `sha256=<hex digest>`

The signature is HMAC-SHA256 over:

```text
<timestamp>.<nonce>.<raw request body>
```

Home Assistant accepts only documented ATHLTH events and payloads up to 64 KiB.

## Compatibility

- Home Assistant: **2026.10.0b0 or newer**
- Integration protocol: **1**
- Signature algorithm: **HMAC-SHA256**

The first public release supports one ATHLTH app pairing per Home Assistant instance. Pairing a new ATHLTH app intentionally invalidates the previous pairing secret.

## Development

The Home Assistant component lives entirely under `custom_components/athlth`. No source code, configuration files or credentials from the private ATHLTH application repository are required to install this integration.

Validation runs with both HACS and Home Assistant hassfest. Security-sensitive changes should include tests.

## Support

Use GitHub Issues for reproducible integration problems. **Never paste webhook URLs, webhook IDs, pairing secrets, access tokens, Home Assistant external URLs, health exports or diagnostics containing personal information into a public issue.**

See [SECURITY.md](SECURITY.md) for security-reporting guidance.

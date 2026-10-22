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

## Connect through Tailscale outside the home

ATHLTH supports **two Home Assistant connection routes**: your usual local address and an optional VPN/external address. On a private, authenticated Tailscale VPN, the iPhone app supports **both** direct `http://100.x.x.x:8123` IP addresses **and** `https://<device>.<tailnet>.ts.net` URLs through Tailscale Serve. HTTPS is optional for the private Tailscale route, not a requirement. The app prefers local access on Wi-Fi and the configured VPN/external route elsewhere, with automatic fallback.

### Option A — Direct Tailscale IP (simplest)

1. Install/connect Tailscale on your iPhone. Verify that the Home Assistant page opens in Safari at the **actual Tailscale node IP**, such as `http://100.x.x.x:8123`. Do not substitute the example address for your real one. The Home Assistant host must be part of your tailnet or reachable through an appropriately configured subnet router.
2. To pair for the first time over VPN, create the six-digit code under **Home Assistant → Settings → Devices & services → ATHLTH → Configure**, then enter the Tailscale IP in **ATHLTH → Settings → Connections → Home Assistant → Enter address manually** and choose **Pair with code**. Alternatively, pair on home Wi-Fi first.
3. If already paired locally, open **ATHLTH → Home Assistant → Local + VPN connection**, enter the same Tailscale IP under **VPN / external address**, tap **Save route**, then **Test connection**. Keep both addresses configured if you use both. Updating the route does not replace the existing iOS Keychain pairing secret.
4. Test again on cellular with Tailscale connected. If Safari cannot reach the Home Assistant page over the same IP and VPN, check your Tailscale connection, ACLs/grants and routing before troubleshooting ATHLTH.

### Option B — Tailscale Serve with HTTPS (optional)

If you prefer end-to-end HTTPS for the Home Assistant URL, use [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve) **inside your private tailnet**. On a node where Home Assistant is accessible at `127.0.0.1:8123`, one example command is `tailscale serve --bg --https=443 127.0.0.1:8123`. Run `tailscale serve status` to find the actual `https://<device>.<tailnet>.ts.net` URL. If Tailscale and Home Assistant run in different containers or on different hosts, the proxy target and Home Assistant trusted-proxy settings may need adjustment. Enter that HTTPS URL in the same ATHLTH address fields. **Tailscale Funnel is not needed** and should not be enabled just to connect ATHLTH.

### Security notes

- Direct HTTP is transported inside Tailscale's encrypted tunnel **only when the devices are actually connected through that VPN**. The `100.64.0.0/10` shared IPv4 range alone does **not** prove Tailscale membership. Keep Home Assistant port 8123 private, protect tailnet access with Tailscale grants/ACLs and device authentication, and do not forward port 8123 publicly.
- In updated ATHLTH iOS builds, App Transport Security has a narrowly scoped HTTP exception for `100.64.0.0/10`; other public HTTP addresses are **not** globally permitted. Older installed ATHLTH builds may still block direct Tailscale HTTP until updated. HTTPS remains available and is a reasonable additional security layer.
- Code pairing from a Tailscale address is supported in addition to ordinary private/local addresses, but an administrator must generate a short-lived six-digit code with limited attempts. Normal messages are signed after pairing. Both direct Tailscale HTTP and Tailscale Serve HTTPS are valid pairing routes.

## Security model

1. An authenticated Home Assistant administrator explicitly generates a short-lived six-digit pairing code.
2. The code is kept only in memory as a salted SHA-256 digest, expires after five minutes and is invalidated after successful use or five failed attempts.
3. The unauthenticated code-exchange endpoint accepts requests from local/private addresses and Tailscale's shared IPv4 range, with a short-lived one-time code and rate limiting; IP-range membership is not proof of VPN authentication.
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


## Premium ATHLTH dashboard and modular cards (v0.4.0)

The premium Lovelace frontend uses the original ATHLTH pulse-A brand mark,
warm-gold accents and a responsive layout. It is bundled within the HACS
integration, with no external CDN and no fake workout data.

For a complete dashboard see [examples/premium-dashboard.yaml](examples/premium-dashboard.yaml).

### New dashboard layout: three cards across

The combined `custom:athlth-dashboard-card` now uses an ATHLTH-branded
dashboard header with a **featured last completed workout**. When the latest
activity is an outdoor workout with a matching, received route image, the card
displays the camera image and actual shared metrics (distance, duration, pace,
heart rate and any available elevation/route-match data). Indoor, treadmill and
strength workouts display their own visual without a fake GPS map.

To give the dashboard room for **three columns on a wide desktop**, create a
**Panel** dashboard view with just the combined ATHLTH dashboard card in it.
The included `examples/premium-dashboard.yaml` already sets `panel: true`.
On smaller view widths, the card automatically uses two columns or one on mobile.
An ordinary masonry dashboard constrains cards to narrow columns, which may
prevent the three-column layout even on a large desktop monitor.

The latest-workout route is displayed only when its completion timestamp
matches the completed outdoor workout. Home Assistant's signed camera image
URL is used where provided; the frontend never invents routes or coordinates.
The map requires ATHLTH to share the completed route and a rendered image.
If that data is missing, the card explains why the map cannot be shown.

Updating these files in GitHub does **not** automatically update a running
Home Assistant instance: install/update the integration files, restart Home
Assistant and reload the dashboard. A new HACS release is separate and must
be explicitly published.
Each of the following can also be used as a standalone Lovelace custom card:

| Card type | Function |
| --- | --- |
| custom:athlth-dashboard-card | Combined ATHLTH dashboard, member selector |
| custom:athlth-week-card | Weekly workout count, duration, distance, plan progress |
| custom:athlth-today-card | Today's next planned workout |
| custom:athlth-next-card | Next workout |
| custom:athlth-last-card | Last completed workout, matching outdoor map if available |
| custom:athlth-plan-card | Plan-oriented goal and next workout |
| custom:athlth-family-card | Per-installation voluntary family summary |
| custom:athlth-recovery-card | Shared recovery and health indicators |
| custom:athlth-active-card | Currently active workout |
| custom:athlth-calendar-card | Seven-day planned workout calendar |
| custom:athlth-goals-card | Personal training goal and progress |
| custom:athlth-strength-card | Live strength sets, reps, weight |

Single-user config: choose type custom:athlth-dashboard-card and optionally
entity sensor.athlth_last_workout.

Family: set members to a list of objects with name and entity keys. The entity
must be the exact last-workout sensor of each paired ATHLTH device. For example,
the first member can use sensor.athlth_last_workout and another member the
last-workout sensor reported by Home Assistant under Devices & services.
Do not guess the other member's entity ID. A member may also provide entities
mapping keys (weekly_progress, weekly_workout_count, recovery_score, etc.)
to exact sensor IDs if entity names were customized.

**Data accuracy:** No fabricated numbers, map routes or workout plan details are
generated. Treadmill and indoor activities never show a GPS route; outdoor
route images are only displayed when the completed workout and map timestamps
match. Cards use the metrics explicitly shared by the ATHLTH app, and health
data remain off unless each person enables their own sharing permissions.

**Important limits:** Home Assistant currently pairs app installations
independently, not unique ATHLTH accounts. Automatic deduplication across
devices requires an authenticated stable account identity protocol in the app.
Complete training-plan structure, exercise/set history, interval progression
and long-term workout history also require extra app/protocol changes.
This frontend does not claim these exports already exist. Home Assistant
dashboard visibility is not an access-control boundary for sensitive health data.

Resources register automatically when the integration loads. If a custom card
is not available, refresh Home Assistant; manual dashboard resource:
 /athlth/frontend/athlth-cards.js (JavaScript module).

HACS v0.4.0 includes the dashboard and modular cards. Install or update
through HACS, restart Home Assistant, then reload the dashboard. A release
passing automated tests has **not** yet been tested end-to-end on a real
iPhone, Apple Watch and Home Assistant installation; see the manual checklist.

**Recent history scope:** The received-history sensor stores only the ten latest
successfully received and completed workout events per paired installation.
It is not a historical backfill and does not replace the app's workout archive.
History is erased from active entity storage on sharing revoke or unpair. If
Recorder has already stored older states, users may need to purge Recorder
history separately under Home Assistant controls.

**Training plan fields:** When the ATHLTH iPhone app version supports it and
the user opts into training-calendar sharing, the integration accepts a
`training_plan` snapshot (id, title, current week, total weeks, optional
start time) plus optional per-calendar-entry `status` (planned/completed/
skipped) and `plan_id`. Older app versions remain compatible and show
only scheduled sessions. No plan data is sent when calendar sharing is off.

### Online and currently training statuses

ATHLTH status is now exposed as a **per-paired-installation**
`sensor.*_presence`: `online`, `training`, `offline`,
`not_shared` or `unknown`. The **Status** modular card and the family
and dashboard cards show a green Online indicator, warm gold **Trener nå**
indicator, or neutral offline/unknown/private indicators. The associated
iPhone app must enable **Online-status** in Home Assistant sharing (off
by default). "Online" means *this iPhone app is foregrounded and recently
synced*, not social-network presence. Training reflects an actually reported
active workout, including an Apple Watch session with the phone backgrounded.

Statuses automatically expire after 4 minutes without a signed update,
showing **Ukjent** rather than a false "Online" or "Trener nå". Foreground
updates are ephemeral and never queued for later replay. Pairing/"Connected"
alone cannot make someone appear online. Users may disable online sharing
independently of workout sharing. The Home Assistant app's authorization
and its broader privacy model still govern access to a shared dashboard.

### Production-readiness checklist (before public release)

The release's automated tests are not proof that the cards have loaded
successfully in a real Home Assistant dashboard. Follow
[docs/LIVE_HOME_ASSISTANT_CHECKLIST.md](docs/LIVE_HOME_ASSISTANT_CHECKLIST.md)
for a manual end-to-end walkthrough: installation, Lovelace resource loading,
actual iPhone and Apple Watch training status, multiple family members, and
consent revocation.

**HACS prerequisites:** Repository topics `hacs`, `home-assistant` and
`training` are configured. Release automation must pass actual HACS
validation, Hassfest, privacy, frontend and HA tests; no HACS check is skipped.

**First-load troubleshooting:** The integration serves its frontend script at
`/athlth/frontend/athlth-cards.js` and registers it automatically with HA.
Home Assistant frontend module loading can race custom-card creation on a
fresh page. If a card is unavailable on the first load, check **Settings →
Dashboards → Resources** and add the same URL as **JavaScript module**
(only if not already registered), then refresh. Do not add duplicate
resource entries. For YAML-managed Lovelace, put the resource in YAML instead.

**Workout-active sensor safety:** `binary_sensor.*_workout_active` becomes
`unavailable` if the last authenticated message is older than four minutes
(or no explicit recording state has been received). This prevents a previous
true value restored after a HA restart from remaining indefinitely active.
It must not be treated as false/off when unavailable. Conversely,
`binary_sensor.*_connected` indicates a valid pairing credential, not
that the athlete is online. Use `sensor.*_presence` for privacy-aware
`online`, `training`, `offline`, `unknown`, and `not_shared`.

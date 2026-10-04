# ATHLTH for Home Assistant

Official Home Assistant custom integration for **ATHLTH**.

This repository contains the Home Assistant side of the ATHLTH integration and is designed for installation through HACS.

## Architecture

ATHLTH does not require users to create or paste Home Assistant API keys.

1. The user installs and adds the ATHLTH integration in Home Assistant.
2. The ATHLTH iOS app signs in to Home Assistant only during pairing.
3. The authenticated app calls `POST /api/athlth/pair`.
4. Home Assistant returns a per-installation webhook ID and shared signing secret.
5. ATHLTH stores the pairing material in the iOS Keychain and can discard the Home Assistant OAuth token after pairing.
6. Normal traffic uses `/api/webhook/<webhook_id>` with HMAC-SHA256 request signing.

Webhook IDs and signing secrets must never be logged or included in analytics.

## Initial entities

- Last workout
- Recovery score
- Training load
- Weekly progress
- Next workout
- Workout active

## Webhook signing protocol

Each POST request includes:

- `X-ATHLTH-Timestamp`: Unix timestamp in seconds
- `X-ATHLTH-Nonce`: unique random value per request
- `X-ATHLTH-Signature`: `sha256=<hex digest>`

The signature is HMAC-SHA256 over:

```text
<timestamp>.<nonce>.<raw request body>
```

using the shared secret returned during pairing. Home Assistant rejects stale timestamps and reused nonces.

## HACS

The integration lives under `custom_components/athlth`, the standard layout for a Home Assistant custom integration.

During development this repository can remain private. Before broad distribution through HACS it should be public and use semantic version releases.

## Status

Current development version: **0.1.0**

The first milestone is the secure pairing/webhook foundation. The ATHLTH iOS client is implemented separately in the main ATHLTH repository.

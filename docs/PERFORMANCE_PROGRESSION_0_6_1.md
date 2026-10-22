# ATHLTH Performance Progression — 0.6.1 implementation and next contracts

## Priority outcome

The iPad kiosk should answer **what actually improved**, not just
how much time was spent training. Build comparisons only from a real
completed source record with explicit provenance.

### Implemented: finished strength efforts

- Source: per-account `StrengthWorkoutStore.workoutHistory` in ATHLTH;
  a workout is eligible only when `endedAt` is set.
- Only `StrengthSetLog.countsTowardTrainingLoad`, which requires an
  actual `completedAt` and excludes warm-up sets.
- Compare the same exercise name **and exact repetition count**; a
  5-repetition squat never gets compared with an 8-repetition squat.
- Split/dropsets use their actual `effortSegments`. An effort of
  8 × 10 kg and 2 × 8 kg is not treated as a fictional 10 × 10 kg set.
- When a single completed workout has multiple sets of the same exercise
  and repetition count, export its heaviest matching working effort.
- The payload contains: a hashed point ID, exercise title, repetition
  count, weight in kg, completed workout end date, and
  `source=completed_strength_set`. **No** Health samples, GPS route,
  workout title or personally identifiable workout ID.
- Window and volume: completed workouts from the last 90 days, at most
  60 best-set records, maintained per separately paired ATHLTH app.
- Sender and receiver negotiate `strength_progress_v1`. Older HA
  installations never receive the new event.
- A separate user-controlled **Styrkeprogresjon · fullførte sett**
  switch in the app defaults to OFF. Both it and `Fullførte økter`
  must be ON to export. Revocation sends a signed `clear` event
  removing current integration data.
- HA sensor: `sensor.athlth_strength_progress`, with a bounded
  `records` attribute and a count as its state. The chart is based
  only on those records. A second athlete's record is never mixed in.
- Chart shows the selected exact exercise/repetition group, latest
  up-to-ten recorded best efforts, and best weight **in the shared
  sample**; it does NOT claim an all-time PR.
- Weight is user-logged in ATHLTH (completed set evidence), **not
  independently verified by a calibrated measuring device**.

This is a supplement to, not a replacement for, existing ATHLTH
running/strength personal record snapshots and milestone notifications.

## Why a 4×4 running record is not shipped in this release

ATHLTH already stores structured workout targets and running activity
summaries, but a generic completed-run distance, average pace or
target treadmill speed is **not enough evidence** of a complete 4×4
intervention. A training template can express four planned efforts
without proving that all four were completed at those speeds.

Minimum future `completed_interval_session` contract:

1. Stable `session_id`, planned run type and template/plan identity
   with a normalized, versioned **four-by-four** session definition;
   store edits made before starting.
2. Each working interval contains sequence index 1–4, actual start/end,
   confirmed completion, measured work duration (around four minutes),
   actual valid pace/speed metrics if present, and whether the data was
   Watch-measured, externally-sourced treadmill, manual entry or estimated.
3. Warm-up, rest intervals, cooldown, paused time and GPS deviations
   never contribute to the four working-interval performance metric.
4. All **four** work intervals must be finished. A workout closed after
   two or three efforts remains a partial result, never a completed
   `4×4` personal record.
5. Use speed **per work interval**, not merely workout-average or target
   speed. If only target speed is known, label target and DO NOT award
   an achieved-pace PR.
6. Handle treadmill and outdoor runs distinctly: fixed treadmill speed
   may be manually entered and cannot be called GPS-verified; incline
   can be stored per-interval with source evidence.
7. Deduplicate mirrored iPhone/Watch sessions by stable session identity.
   A hybrid strength-to-treadmill workout records one parent session with
   distinct segments rather than two duplicate finished workouts.
8. Only emit an all-time record after comparing complete, comparable
   4×4 sessions with the same metric source class and schema.
9. Include opt-in controls, a delete/revoke path, and clear data retention
   limits before exporting interval histories to a shared HA dashboard.

### Suggested future dashboard views

- **Fastest complete 4×4**: work-interval average speed, peak completed
  sustained working speed if measured, duration, date, and a badge
  explaining the speed source.
- **Trend of 4×4 sessions**: compare completed sessions and overlay the
  four effort speed values separately; never combine targets and achieved
  pace.
- **Treadmill progression**: per-completed-interval actual recorded speed
  and incline, with separate treatment for estimated distance.
- **Strength over time**: exercise/repetition-specific completed set
  history, weight change, and eventually verified set volume; distinguish
  edited post-workout entries in later protocol versions.

### Acceptance checks before claim of completion

- Complete 4×4 with exactly four finished work intervals.
- Stop/skip during the fourth effort: no full-session PR.
- Manually enter 13 km/h treadmill target but perform 10 km/h:
  no 13 km/h achievement.
- Alter interval length or remove a rest period: comparable semantics
  still need explicit identification, not a title substring check.
- Restart the app, disconnect Watch, or receive a mirrored workout twice:
  same event has only one identity.
- Disable Home Assistant interval sharing: all current interval data
  disappears; consider historical HA Recorder separately.

## What a real test still requires

- ATHLTH iPhone source must compile successfully and be available
  in a compatible installed app before strength progression populates HA.
- Verify a real strength session completed on iPhone and Watch; test
  multiple working sets, modified sets, split sets, warm-ups, rest-only
  sections, and workout cancellation.
- On iPad HA app, check left sidebar, three-column availability based on
  actual card width, chart button navigation, scroll stability and
  permission revocation.
- Inspect Recorder retention and any housemate access to shared metrics.

This document is an architectural boundary: features that do not have
the required real training evidence MUST show unavailable and must
never fabricate an athlete performance.

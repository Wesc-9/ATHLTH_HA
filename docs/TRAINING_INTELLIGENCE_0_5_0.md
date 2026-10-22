# ATHLTH Training Intelligence — dashboard architecture and review (0.5.0)

## Product intent

This is a training **decision-support surface**, not a clone of a generic
Home Assistant entity dashboard. Three-column desktop, two-column tablet
and one-column mobile layouts preserve the same editorial reading order.
ATHLTH identity appears at the page level, not as a repeated logo on cards.
Values are shown only when the user has shared them.

The sections answer five practical questions:

1. **Now / next** — What was my last completed session and what is planned
   tomorrow? The latest outdoor route belongs to the matching finished
   workout only; treadmill and strength never show GPS maps.
2. **Training foundation** — How much did I do this week, how far am I through
   my plan and how has my recent session time varied?
3. **Training patterns** — How do planned versus completed days, workout
   categories and voluntarily shared recovery relate?
4. **Results / achievements** — Which sessions were most recently completed?
   Which actual running and strength PRs are shared from ATHLTH?
5. **Understand progress** — Which measurements exist, and which conclusions
   cannot be justified by the available data?

## Implemented in 0.5.0

### Athlete identity
- Opt-in display name and public Supabase profile-avatar URL.
- No static personal photo or identifying name is bundled with this repository.
- Strict HTTPS public-profile-avatar allowlist on the signed webhook and
  frontend URL render path.
- Opt-out clears current profile entities; Home Assistant Recorder history is
  controlled separately by the user.
- Each paired ATHLTH installation has its own identity entity and values.

### Completed sessions
- Existing bounded completed-session history (ten successfully received
  completed events per installation) is presented as a chronological list.
- Available name, category, completion date, duration, distance, heart rate and
  recording device are shown; absent metrics are not replaced with invented
  zeros. The last finished session remains featured separately with a
  compatible route image where the map's completion time matches.
- A real workout can be recorded on iPhone or Apple Watch; available shared
  metrics vary by source and by the ATHLTH app's recording pipeline.
- De-duplicate stored event IDs; never mix installations.

### Personal records
- The iPhone app already exposes personal running and strength records.
- With **PR-er og milepæler** enabled, the app shares up to six existing running
  and six existing strength records, newest per category, as a bounded snapshot.
- Home Assistant also retains up to ten newly received PR events for clients
  that have not yet sent a snapshot; this is labelled as event history.
- Each record has a short ID, title, formatted actual value, category and date.
- Historical PR backfill is not equivalent to a full exercise history, and
  metric values are not re-derived in the Home Assistant frontend.
- Disable PR/milestone sharing to clear current record snapshots and
  event-derived PR entities.

### Honest data coverage
- A visible coverage summary distinguishes connected categories from absent
  or disabled sharing, including recovery, plan, workout feed and records.
- Seven-day bar charts and training-type rings are based on received sessions,
  not the full archive. A card label says so.
- A missing calendar or Health metric remains missing and is not interpreted as
  a rest day, low readiness or a workout failure.

### Backward compatibility
- HA signed webhook responses include feature
  `profile_performance_snapshot_v1`.
- The iPhone integration emits the new payload keys only after seeing this
  explicit support; older 0.4.x Home Assistant installs continue receiving
  older snapshots.
- Existing webhook protocol version remains 1; features are optional.
- No app secrets, OAuth tokens or profile avatar bytes are bundled in GitHub.

## What should be built next and why

| Priority | Capability | Value | Missing dependency |
| --- | --- | --- | --- |
| P0 | Full 30/90-day exercise and workout history sync with cursor | Honest long-term charts and weekly comparisons | New paginated, consent-controlled ATHLTH export; bounded HA storage |
| P0 | Recorded-vs-entered data provenance | Avoid treating manual pace, incline or estimated treadmill distance as measured | Explicit provenance per metric in ATHLTH mobile exporter and HA schema |
| P1 | Running intervals and 4×4 personal bests | Benchmark pace and complete intervals, not fastest accidental split | Structured completed interval records and quality rules |
| P1 | Strength progression by exercise and reps | Show actual weight progression and rep PRs | Structured exercise-identity IDs and weight/unit normalization |
| P1 | Training-load vs recovery trend | Support day-to-day decisions without medical claims | Historical time series with timestamps, source quality and sharing consent |
| P2 | Planned vs completed training adherence over time | Help maintain a sustainable training rhythm | Stable session IDs linking plan and activity completion |
| P2 | Route overview for last 5 outdoor sessions | Spatial context and selectable route cards | Privacy-conscious historical route thumbnails, storage retention |
| P2 | Personal goal projection | Explain pace toward goals | Goal target definition, units, schedule and trustworthy baseline |
| P3 | Friends/challenges comparison | Optional motivation | Per-person consent, authenticated identities and visibility enforcement |

**Avoid premature extras:** do not add leaderboards, training advice derived
from incomplete Apple Health data or remote GPS replay that can reveal
precise locations to a shared home dashboard.

## Deployment checklist

1. Install the new integration code (0.5.0) in a **test** Home Assistant and
   restart it. A Git commit and a bumped manifest are not a published HACS
   release.
2. Use `examples/premium-dashboard.yaml`: the main panel view must be
   full-width for the three-column arrangement.
3. Update the ATHLTH iPhone app from the corresponding source separately.
4. In ATHLTH > Home Assistant, enable **Utøverprofil** only if the user wants
   their public name/avatar in this home. Enable **PR-er og milepæler** to
   share the existing PR snapshot.
5. With real sessions, verify fresh completion list, last outdoor map,
   treadmill without GPS, tomorrow's calendar, records and source labels.
6. Disable both new sharing categories. Check removal from current entities
   and after a Home Assistant restart. If necessary purge older HA Recorder
   history independently.
7. Test full dashboard on desktop, tablet and phone, and as a multi-user
   dashboard with separate opt-in consents.
8. Only publish a HACS release after green CI and manual iPhone/Watch/HA
   smoke testing. No TestFlight action should be triggered implicitly.

## Privacy warning

Home Assistant dashboards and Recorder can expose shared location, health,
training and profile data to other users of the same instance. ATHLTH uses
explicit category sharing, but HA permissions and Recorder history are separate
concerns. The new profile switch defaults to **off**.

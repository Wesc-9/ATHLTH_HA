# ATHLTH for Home Assistant — iPad kiosk and full usage-needs analysis

**Scope:** Training Intelligence dashboard, Home Assistant iPad companion app,
one or more voluntarily paired ATHLTH installations. The physical iPad and
live Home Assistant UI have **not** been inspected, so this is a code-level
product review, not a claim of observed real-device behavior.

## Product decision

Use a separate **ATHLTH iPad** dashboard with a **native Home Assistant
Sections view**, `max_columns: 3`, seven section groups and 20 independent
ATHLTH Lovelace cards. This solves the recurring one-column appearance
**structurally**, rather than hoping a single combined Panel card reaches
a particular CSS width. Home Assistant owns the responsive arrangement.
The legacy combined card remains in the second **Samlet** Panel view.

**Keep Home Assistant's left sidebar and header available.** Do not hide
the native navigation or account controls. No external kiosk plugin is
needed for this native multi-section layout.

The exact number of simultaneously visible sections depends on *actual*
available iPad content width after subtracting the HA sidebar. With a
visible sidebar, three sections may require a large landscape window;
two columns may be the appropriate layout on an ordinary iPad. The
integration must not claim that three columns are possible in portrait
or narrow Split View without enough pixels.

A third-party Kiosk Mode plugin is **not needed** for this presentation.
If that plugin is independently installed, do **not** enable its `kiosk` or
`hide_sidebar` settings. On narrow iPad window sizes, Home Assistant may
collapse its native sidebar; the ATHLTH card cannot force the HA app's
drawer open. Preserve its menu control to allow reopening the sidebar.

### Questions the user should be able to answer

| Moment | User question | At-a-glance answer |
| --- | --- | --- |
| Morning / quick glance | What's planned, am I progressing, what was my last session? | Next session, weekly totals, progress, last completed workout |
| Immediately before training | Which session and what is its scheduled time? | Tomorrow / planned workout card and training calendar |
| Immediately after training | Did my completed run or strength session arrive? | Featured last activity + recent feed; matching outdoor route image |
| End of the week | Did I actually follow the plan? | Week progress, weekly calendar and 7-day duration trend |
| Reviewing progress | What actually improved? | Recorded PRs and achievements, no fabricated metrics |
| Sharing with family | Whose data am I looking at? | Per-member switcher + optional member identity; isolated entities |
| Sync or privacy problem | Why is data absent or outdated? | Coverage section, last sync and explicit unshared-data placeholders |

## Critical issues found in code

### P0 — Lost scroll position after HA entity updates (implemented)

**Cause:** the custom card previously executed
`shadowRoot.innerHTML = completeDashboardMarkup` on every `hass` assignment.
This destroyed and recreated all elements. The app could reset the scroll
position while the user read or scrolled the dashboard; unrelated HA entities
could trigger the same behavior.

**Change:** unchanged markup is skipped, and modified markup is reconciled
in place. Stable DOM nodes and scroll ancestry are retained instead of
replacing the entire dashboard. This also avoids needless route-image reloads
when their attributes remain unchanged. Unit tests cover unchanged unrelated
entities and updated ATHLTH values. Real iPad verification is still required.

### P0 — One narrow column despite an iPad screen (implemented)

**Cause:** the combined dashboard was installed inside a standard Home
Assistant Masonry card column. The dashboard grid responds to the **card's
allocated width**, not the physical iPad's nominal screen dimensions.

**Change:** the primary overview is now `type: sections` with
seven **real HA sections**, each containing multiple *separate* modular
ATHLTH cards. The view sets `max_columns: 3`; HA chooses 1–3 visible
section columns based on available content width. Each individual
custom card uses `grid_options: {columns: 12, rows: auto}` within its
section. The previous combined `panel` remains only as the optional
**Samlet** fallback. A sidebar-constrained window can physically fit
fewer columns, regardless of max_columns.

### P0 — Keep left navigation and a safe way out (implemented)

**Decision:** preserve Home Assistant's native left sidebar, the top
menu button and a normal non-kiosk dashboard. Never apply `hide_sidebar:
true` or `kiosk: true` to the unrelated third-party Kiosk Mode plugin.
The ATHLTH `kiosk: true` option is an internal card styling switch.

**Operations:** create a new HA dashboard or edit a user-managed one,
select *Show in sidebar* through HA's dashboard settings, and paste the
versioned **Sections** YAML into the raw dashboard editor. Changes made
on GitHub do **not** modify an existing locally saved HA dashboard.

## Overview hierarchy and interface recommendations

The user must understand the last training session in seconds, then explore
more detail without drowning in dozens of similarly weighted tiles.

1. **First screen:** premium but economical ATHLTH profile hero; next planned
   session; weekly total, duration, plan progress and last shared recovery;
   featured recent workout; tomorrow's training.
2. **Second band:** training time distribution, completed/planned calendar,
   workout streak and training plan. Use the existing charts with explicit
   scope: only workouts actually received by Home Assistant.
3. **Third band:** running/strength distribution and readiness, but do not
   infer health diagnoses or general training prescriptions from single
   values. If a sensor is absent, say data is not shared.
4. **Fourth band:** chronological sessions and verified PR tiles, with source
   markers. Distinguish indoor exercise from outdoor route capture.
5. **Fifth band:** interpretation, goals and data coverage, including last
   sync, limitations and next data dependencies.
6. **Secondary detail view:** focused modular session, feed, achievements,
   week and data cards, leaving the main kiosk view easy to scan.

Implemented here: a real native Sections homepage and an optional legacy
combined dashboard with in-card navigation. The card's `kiosk: true`
attribute does not activate any Home Assistant shell-hiding kiosk plugin.
Both example dashboards now default to native Sections.

## Missing use cases — evaluated and prioritized

| Priority | Need | Why it matters | Necessary data / implementation |
| --- | --- | --- | --- |
| P0 | Real-device scroll and rotation acceptance tests | iPadOS native app may use different scroll ancestors than desktop browsers | iPad landscape, portrait, Stage Manager, Split View, 2-min live update during scroll |
| P0 | Consistent source and sync indication | Detect wrong readings after an app disconnects | Last sync timestamp, actual input source, graceful offline UI |
| P1 | 30/90-day history and baseline comparisons | Ten sessions are not a training trend | Paginated consented ATHLTH sync and bounded Home Assistant storage |
| P1 | Accurate plan adherence | Useful percent requires planned-session identity and completed-session match | Session ID, date, skipped / rescheduled status |
| P1 | Interval and 4×4 progression | Actual pace per completed interval is more meaningful than one peak | Verified interval segments and source-tagged treadmill speed |
| P1 | Strength exercise progress | Helps choose progression, load and exercise continuity | Stable exercise IDs, completed sets, rep/weight PR, units |
| P1 | Better metric provenance | Prevent manual/estimated values masquerading as GPS/Watch measurements | Per-metric source: measured, manual, estimated |
| P1 | Workout detail drilldown | Tap recent workout to see metrics without navigating outside HA | A safe session-identity/detail protocol and optionally historical route image |
| P2 | 4-week training rhythm | Week chart alone hides behavior trends | More complete calendar history with statuses |
| P2 | Recovery and training-load relationship | Real patterns are more valuable than an isolated score | Opted-in timestamped recovery and load series, limitations |
| P2 | Household per-person controls | Shared iPads often have multiple viewers | Paired-installation isolation and clear consent/role notices |
| P2 | Training plan and next session quick actions | iPad can be a launchpad, not just a read-only wall | Explicit commands permitted through the paired app, never unconfirmed session starts |
| P3 | Route gallery for five recent outdoor workouts | Useful spatial memory | Privacy-protected route thumbnails and retention settings |
| P3 | Challenges and friend milestones | Motivation, not a baseline prerequisite | Authenticated user-facing visibility rules and consent |

**Do not ship without evidence:** unverified fitness scores, estimated 4×4 PRs
from unrelated pace samples, AI medical advice, synthetic route maps, claims
that a data gap is a missed workout, or forced family leaderboards.

## iPad behavior acceptance checklist

1. In the HA iPad app, open *ATHLTH Kiosk* from the **visible left sidebar**.
2. Confirm the first view has seven native HA Sections and not one
   `custom:athlth-dashboard-card`. The HA menu remains available.
   Check how many section columns physically fit with the sidebar
   visible; narrow iPad screens can correctly show only one column.
3. Scroll midway through the session feed, generate a real HA sensor update
   or update an unrelated light sensor, and check the position remains stable.
4. Confirm the six-plus named section headings are distinct and cards
   can be rearranged individually in HA's Sections editor. Check that
   the optional `Samlet` tab still opens the combined dashboard.
5. Repeat with a newly completed run, a treadmill workout with **no** route
   and a strength session. The last outdoor route image must not carry over.
6. Rotate iPad; then use Split View / Stage Manager and close/open the sidebar.
   Verify no horizontal overflow, unreadable metrics or hidden menu controls.
7. Repeat while offline, reconnected and when ATHLTH permissions for recovery,
   profile or PR events are disabled. Confirm accurate empty states and
   no stale private data in *current* dashboard entities.
8. On the detail view, navigate to other HA dashboards using the left
   sidebar, and back to ATHLTH. No trapping in fullscreen is permitted.
9. Test VoiceOver reading order, readable labels, visible focus and large
   tap targets; kiosk navigation must remain keyboard-accessible.
10. Check Home Assistant Recorder settings separately for the retention of
    previously shared health, location and profile data.

## Versioned assets

- [Kiosk YAML example](../examples/ipad-kiosk-dashboard.yaml)
- [Standard panel YAML](../examples/premium-dashboard.yaml)
- [Training Intelligence analysis](TRAINING_INTELLIGENCE_0_5_0.md)
- [Home Assistant integration](../custom_components/athlth/manifest.json)

**Deployment status:** GitHub source and example are versioned. Publishing
an HACS release is distinct from editing the iPad's Home Assistant UI. A
locally installed Home Assistant dashboard must be created/configured through
the user's own Home Assistant instance.

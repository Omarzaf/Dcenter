# Changelog

All notable changes to **CORE: Field Operations** (formerly DATACENTER: CORE BUILD).

## [6.0.0] - Complete six-chapter campaign - 2026-09-12

- Completed The promise, The weak link, The shipment, The long week, and The
  handover, connected to the original First Light mission and its decisions.
- Added four recurring guides, 32 accepted decision stages, chapter reviews,
  source-linked lessons, and a complete operating record with distinct outcomes.
- Modeled parallel construction gates, supplier qualification, delayed new
  hardware, shared physical routes, finite stored energy, water-limited operation,
  workload prioritization, and tested recovery including temporary connectivity.
- Added a conditional what-if planner, confirmed chapter replay, and portable
  campaign saves validated by canonical journal replay.
- Connected the 3D campus to construction phases, installed cooling/battery/power
  choices, network route diversity and outages. Retained camera/day/night controls.
- Added complete desktop/phone journeys, crisis branches, save/replay, planner,
  keyboard, storage-denial, and graphics recovery checks. Practitioner review and
  physical-device coverage remain outstanding validation work.
- Added reproducible Vercel builds, a public version/commit marker, and GitHub
  Actions verification on Node 22 for pull requests and the main branch.

## [Unreleased] - Immersive facility presentation - 2026-09-12

- Perspective camera, cinematic arrival, smooth focus transitions, three viewpoints,
  pointer orbit/pan/zoom, and keyboard-accessible view controls.
- Four-minute visual day/night cycle with fixed presets, sun and moon lighting,
  sky and fog changes, moving shadows, and warm practical facility lights.
- Industrial materials, drainage, service-yard finishes, pipe supports, distant
  buildings, and a cooler interface palette with warm control accents.
- Separate validated presentation preferences, pause/reduced-motion support,
  pointer cleanup, focus restoration, and preserved browser zoom.
- Existing mission rules, learning content, and saved progress remain compatible.

## [5.0.0] - First Light, first playable chapter - 2026-09-12

- Replaced the default entry with a full-window PlayCanvas facility and an authored
  first mission, with Mara's contextual Ink dialogue and source-linked lessons.
- Added three rack bays, distinct utility route costs, dependency checks, a safe
  commissioning failure, correction and retest, explicit activation, reflection,
  and a recorded preparation for hypothetical shipment uncertainty.
- Added a field notebook, versioned combined saves, progress import/export,
  canonical mission/dialogue validation, keyboard controls, responsive panels,
  reduced motion, graphics recovery, and semantic gameplay if the renderer fails.
- Added model, story, persistence, desktop/mobile journey, keyboard, file round-trip,
  and graphics lifecycle checks. Static geometry is batched; static scenes render
  on demand and active equipment animation is capped at 30 rendered frames/second.
- Switched to a static build with separate hashed chunks and included dependency
  notices. Kept the strategy prototype and Floor lab under `/?mode=legacy`.
- This is Phase 1 of the redesign. Chapters 2–6, deeper simulation, audio, practitioner
  review, and public release remain future milestones.

## [4.0.0] - CORE strategy campaign - 2026-09-12

- Added a 12-quarter strategy campaign with three fictional regions, three
  scenario mixes, deterministic geopolitical incidents, six construction assets,
  six resilience investments, explicit choices, budgets, and service requirements.
- Added a scenario stress-test table, checkpoint branches, comparison, decision
  journal, export, source-linked field guide, and validated local saves.
- Rebuilt the primary interface around an authored isometric campus, with large
  touch targets, keyboard navigation, mobile navigation, and reduced motion.
- Retained the original game as Floor lab and fixed keyboard interception,
  dialog focus and pause handling, touch cancellation, lesson overwrites,
  silent progress persistence, malformed storage, and idle score farming.
- Corrected misleading engineering claims, Tier uptime percentages, throttling
  duration accounting, and the distinction between model stress and temperatures.
- Added strict build typechecking, native regression tests, production browser
  checks, pnpm lockfile, and reproducible verification commands.
- Removed runtime font downloads and the viewport zoom restriction.

Historical entries below describe previous versions and may contain claims
that were corrected in 4.0.0; they are not current engineering guidance.

## [3.0.0] - Teaching layer

Turns the simulation into a teaching instrument. The guiding principle is that
the lesson should live in the system rather than in tooltips: the player learns
by watching their own floor behave, and the text names what they just saw.

### Added

- **PUE as a live metric.** Total facility draw divided by IT draw, shown in
  telemetry with the real quality bands marked on the track (1.2 hyperscale,
  1.5 industry average). Racks and switches count as IT; cooling and
  distribution are overhead.
- **Cooling effectiveness now depends on placement.** A coolant array earns
  full capacity only when it is actually serving racks. Conditioning empty
  floor is bypass air, and the PUE readout reflects it. Identical rack counts
  score 1.26 or 1.53 depending purely on layout.
- **Eighteen-concept curriculum** across power, thermal, network, operations
  and efficiency. Every figure quoted is a published industry value rather
  than a game-balance number: ASHRAE's 18-27 °C recommended envelope, Uptime
  Institute Tier availabilities, the ~25 kW/rack air-cooling ceiling, typical
  10-20 °C server delta-T.
- **Just-in-time concept cards.** The first time a floor demonstrates a
  concept the run pauses and explains it, tying the mechanic to the real
  discipline. Most carry a multiple-choice check with an explanation of the
  answer, so the interaction is retrieval practice rather than presentation.
- **Operations codex.** Browsable reference filtered by discipline. Entries
  unlock by being demonstrated in play, so it doubles as a record of what the
  student has encountered. Reachable from the header and the start screen.
- **Engineering debrief on game over.** Average PUE, peak core temperature,
  seconds lost to throttling, and whether distribution ran at N or N+1, plus
  a letter grade and written assessment of what the run demonstrated.
- **Learn mode** setting. When disabled, concepts unlock silently to the codex
  without interrupting. Codex progress persists, so cards never repeat.

### Changed

- Coolant array draw reduced from 4 to 3 and base vent raised from 3.4 to 5,
  retuned so competent play lands near the real industry average and
  deliberate optimisation reaches the efficient band.
- The start screen states the educational intent directly.

## [2.2.0] - Usability pass

### Added

- **Objective band** - a read-only strip along the bottom edge of the board
  tracking four first-run goals (link a POD, deploy coolant, deploy a PDU,
  reach three PODs). It brackets the board against the phase band at the top.
- **Run summary on pause** - the pause surface now reports score, data, core
  temperature, bus load, PODs, and uptime instead of offering only two buttons.
- **New-record callout** on the incident report when a run beats the stored
  best, plus a list of directives completed during the run.
- **Keyboard save path** - the initials field auto-focuses on game over and
  submits on Enter via a real form.
- **Modal semantics** for the settings drawer: `role="dialog"`,
  `aria-modal`, Escape to close, backdrop click to close, and focus moved to
  the close button on open.
- **Assistive announcements** - an `aria-live` region reports thermal-critical
  and PDU-offline state changes without adding visual clutter.
- Visible threshold tick on the temperature meter at the 82% amber/red
  boundary.

### Changed

- **Unified the canvas and DOM palettes.** The board's unit colors, cursor,
  events, and screen-flash colors still used the original neon set while the
  interface had been retuned to the restrained palette, so the two read as
  different applications. Both now share one set of values.
- Raised the smallest label size from 7px and 8px to a 9px floor.
- Header controls expose `aria-pressed` for mute and `aria-expanded` /
  `aria-haspopup` for settings; the board is labelled for screen readers.
- Removed the duplicate score block from the mobile deck - the header already
  carries the live score - which returns roughly 64px of height to the board
  on phones.
- Replaced the free-floating hint line with the objective band and moved the
  device-appropriate control reminder into it.
- Removed a dead no-op assignment in the phase-shift handler.

### Fixed

- The motion slider rendered without a visible thumb because it used
  `appearance-none` with no custom thumb styling. It now has a styled track
  and thumb for both WebKit and Firefox.
- The mobile temperature and bus-load meters used the old neon colors while
  the desktop telemetry panel used the new palette.

## [2.1.0] - Interface refinement

### Changed

- Rebuilt the shell as a continuous operations console with integrated left
  and right instrument rails.
- Replaced repeated rounded cards, glow treatments, and chip-like controls
  with flat rules, measurement marks, and restrained state color.
- Redesigned the start screen around one strong typographic composition,
  a three-step first-shift protocol, and a quiet records table.
- Redesigned pause and game-over states as operational reports rather than
  centered modal cards.
- Simplified telemetry into continuous meters and aligned instrument rows.
- Converted settings to an edge-mounted console drawer with clear thermal
  palette previews.
- Added a compact landscape layout that preserves board space on short mobile
  screens.
- Kept touch interaction direct: tap the floor to deploy and hold to scrap.

### Removed

- The on-screen D-pad. Touch players navigate by tapping the floor directly,
  which was already the primary gesture, so the extra control cluster only
  consumed board space on small screens.

### Fixed

- Settings now load even when the stored audio value is absent.
- Header mute now persists through the same settings path as the drawer.
- VETERAN unlock now required three completed phase shifts.

## [2.0.0] - Improved

### Added

- **Shifts** - the facility now cycles through _Day -> Evening -> Night ->
  Graveyard_ shifts as phases advance, with a distinct color tint per shift.
- **Achievements** - seven unlockable badges (FIRST POD, FLEET, HYPERSCALE,
  PRECISION OPS, REDLINE, VETERAN, LINK CHAIN) with a slide-in toast and
  +250 score reward each.
- **Two new random events** - `ROGUE REBOOT` scrambles your queue for 8s;
  `HUMIDITY SURGE` multiplies heat generation ×1.5 for 8s. A rare
  `CLIENT WIND` event drops a +400 score windfall.
- **Tutorial overlay** - context-sensitive hint that updates by phase:
  build a POD, then add cooling, then HVAC when overheating.
- **Settings panel** - gear icon in the header exposes audio mute, motion
  intensity slider, and a palette switcher (Classic / Deuteranopia /
  Tritanopia). Settings persist via `localStorage`.
- On-screen D-pad for touch devices, plus explicit deploy/scrap hint.
- Status badges - `QUEUED SCRAMBLED` and `HUMIDITY` show in the
  telemetry panel with countdown timers.
- Phase progress bar in the canvas overlay.
- README, CHANGELOG, and .gitignore.

### Changed

- Heat ramp respects the active palette (color-blind friendly).
- Renderer applies the `shake` setting to the screen-shake intensity.
- Engine emits the new `settings`, `achievements`, `shift`, `scrambled`,
  `humid` snapshot fields.
- `select()` now passes the selected index through the deploy bar without
  re-focusing the button.
- Mobile `pointerup` ignores synthetic pointer events so the long-press
  scrap gesture doesn't accidentally fire on a tap.

### Fixed

- Keyboard input is ignored when the user is typing in the operator
  initials input on the game-over screen.
- The heat ramp top stop was unreachable in practice - clamped.
- Cursor no longer moves while a long-press is mid-progress.

## [1.0.0] - Initial

- 8×8 server-room floor, four unit types (CPU / HVAC / PDU / FIBER).
- 3+ adjacent racks link into a POD; POD output scales by size and
  is multiplied ×1.8 by adjacent FIBER.
- Bus power budget with brownout if demand exceeds capacity.
- Core temperature rises with heat generation; HUD meltdown at 100°.
- Phases escalate ambient temperature every 26 seconds.
- Pause, instant restart, and game-over screens with initials.
- Local top-8 high-score table.
- Procedural WebAudio SFX + haptic feedback.

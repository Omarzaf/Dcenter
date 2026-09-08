# Changelog

All notable changes to **DATACENTER: CORE BUILD**.

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

### Fixed
- Settings now load even when the stored audio value is absent.
- Header mute now persists through the same settings path as the drawer.
- VETERAN unlock now requires three completed phase shifts.

## [2.0.0] - Improved

### Added
- **Shifts** - the facility now cycles through *Day -> Evening -> Night ->
  Graveyard* shifts as phases advance, with a distinct color tint per shift.
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
- Direct tap-to-deploy and hold-to-scrap guidance for touch devices.
- **Tutorial overlay** on the canvas when the player is stuck.
- **Status badges** - `QUEUED SCRAMBLED` and `HUMIDITY` show in the
  telemetry panel with countdown timers.
- **Phase progress bar** in the canvas overlay.
- **README.md** and **.gitignore**.

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

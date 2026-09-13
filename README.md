# CORE: Field Operations

A full-window data-center story. You arrive at the fictional Meridian campus as
its new project lead. Mara, the facilities lead, helps you receive the first rack,
choose its bay, connect its utilities, test it, diagnose a control fault, and bring
the first customer service online. An uncertain equipment shipment introduces the
next planning decision.

**All six story chapters are playable.** Continue from the First Light debrief
into one evolving campus, guided by Mara, Ishan, Leila, and Rafi. The earlier
12-quarter strategy game and Floor lab remain available at `/?mode=legacy`.

| Chapter | Your decisions | What carries forward |
| --- | --- | --- |
| 01 · First light | Receive, connect, test, correct, and activate the first rack | Bay, remaining credits, expansion preparation |
| 02 · The promise | Choose scope, survey a site, design cooling, qualify supply, build the shell | Permits, equipment and grid dates, opening promise |
| 03 · The weak link | Inspect shared corridors, prepare alternatives, exercise maintenance | Independent routes, tested readiness, finite battery |
| 04 · The shipment | Respond to fictional trade restrictions and a separate transformer delay | Revised commitments, delivery, installation, commissioning, explicit opening |
| 05 · The long week | Operate three two-hour heat exercises under power and water limits | Critical service, deferred work, consumed water and stored energy |
| 06 · The handover | Respond to an uncertain cable incident, recover and test connectivity | A continuity plan and a causal record of your outcome |

The **What if?** planner varies explicit hardware/grid delays, deliverable power,
water allocation, and corridor availability without changing the live timeline.
Chapter replay restores the same earlier choices and replaces subsequent
decisions after confirmation. Export first to preserve both outcomes.

## Play locally

Use Node **22 LTS, 22.18 or newer**, and **pnpm**.

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Open Vite's printed URL. No account, server API, external fonts, or AI service is
required. The first chapter uses PlayCanvas **2.22.2** for the facility and inkjs
**2.4.0** for authored, branching guidance. The environment and portrait are
original project assets.

## Your first assignment

1. Enter the facility and meet Mara. Inspect the delivered rack.
2. Choose among three bays. Their utility route lengths and costs differ.
3. Connect power, cooling, and fiber. The rack remains offline.
4. Run the commissioning exercise. The cooling control fails to respond; the
   test stops, its load is removed, and the customer remains disconnected.
5. Enable automatic control, repeat the test, and explicitly activate service.
6. Explain the cause, then record a preparation for hypothetical shipment
   uncertainty: study a phased opening, reserve an alternate slot, or request an
   early opening subject to feasibility. Read the debrief and unlocked lessons.

The opening is paced by the player. There is no failure timer or forced dialogue.
The two commissioning demonstrations pause while a dialog is open or the tab is
hidden. Select **Continue to Chapter 02** after the debrief to develop the next
hall. Its visible shell, delivered crates, fitted equipment, and online state
follow separate decisions.

## Controls and progress

- Select equipment markers, or use the assignment's **Find** controls. Each route
  offers the same essential actions; a graphics failure keeps those actions usable.
- Compare Bay A, B, and C directly in the inspection panel before installation.
- Open **Explore** (camera icon) for Campus, Data hall, and Cooling yard viewpoints.
  Drag the scene to orbit, scroll to zoom, and Shift + drag to pan. The same actions
  have keyboard-accessible buttons in Explore. Escape closes Explore or inspection,
  then opens the pause menu.
- Choose a four-minute **Day cycle**, fixed **Day**, or fixed **Night**. The scene
  clock controls atmosphere only; mission work minutes advance through decisions.
  Pause/hidden tabs freeze the environment. Reduced motion disables automatic
  camera drift and the cycle while retaining immediate manual view/light changes.
- View, lighting, and motion preferences use `core.firstlight.presentation.v1`;
  these are independent of mission saves and survive a reload.
- Ask the chapter's guide why a decision matters; minimize guidance when needed.
- Open the field notebook for the mission record, lessons, sources, and assumptions.
- The pause menu includes reduced motion, fullscreen, progress export/import, and
  restart. Starting over requires its own confirmation.
- Progress is saved locally under `core.firstlight.v1`. Export JSON to keep a copy
  or move it between browsers. Import validates both mission history and authored
  dialogue. Invalid dialogue can recover without losing a valid mission.
- Chapters 2–6 use `core.campaign.v1`, including the validated First Light origin.
  Full-campaign imports replay the decision journal to verify costs, dependencies,
  resource use, and progression. Corrupted or modified saves are rejected.
  Future changes to canonical rules or journal prose need a save migration.
- Legacy `core.strategy.v1` and `dcb.*.v1` data remain separate. Clearing browser
  storage loses local progress. If storage is denied, play and export still work.

## Learning boundaries

This is an authored educational exercise, not facility design software or a
geopolitical forecast. Equipment values, route costs, time compression, location,
customer, and shipment complication are fictional game assumptions. Credits are
not a construction quotation. Hall A and its utilities predate the first mission;
Hall B is developed during the campaign.

Lessons link to U.S. Department of Energy and International Energy Agency material
on commissioning, connected infrastructure, cooling, power versus energy, and
procurement constraints. The sources ground those mechanisms; they do not validate
the game's balance numbers. See the [learning and scenario notes](research/learning-and-scenario-notes.md)
and the [PlayCanvas](research/playcanvas-review.md) and [melonJS](research/melonjs-review.md)
engine reviews for the research behind the design.

The campaign models simplified permit and parallel construction gates, shared
network failure, installed battery power and energy limits, and service/water
tradeoffs. It does not model full electrical protection, fluid dynamics, battery
ageing/losses, construction pricing, or live export law. The heat resource ledger
covers six exercise hours; it is not a simulated operating week. Cable recovery
has a separate elapsed-time record. A temporary tested critical-service
connection leaves the primary corridor outage unresolved. Practitioner review
and testing on physical mobile devices remain outstanding validation work.

## Verify and build

```sh
pnpm build                           # compile Ink, typecheck, bundle
pnpm test                            # native model/narrative/legacy regressions
pnpm exec playwright install chromium # browser runtime, once
pnpm test:e2e                        # production build, desktop + phone emulation
pnpm preview --host 127.0.0.1 --port 4177
```

`pnpm verify` runs build, native tests, and browser tests in order. Browser checks
own port **4180**, use full Chromium's current headless mode with one worker, and save
failure screenshots/traces under `test-results/`. The suite includes 54 native
checks and 54 Chromium browser checks across desktop and phone emulation.
GitHub Actions runs the same suite for every pull request and update to `main`.

The static build is **the whole `dist/` directory**, including hashed JavaScript,
styles, and third-party notices. Serve all of it from one HTTPS origin. Do not
publish the workspace root, research clones, local saves, or review artifacts.
The legacy game and 3D renderer load in separate chunks. A failed 3D download leaves
the mission controls available. Static scenes render only when changed; equipment
animation is capped at 30 rendered frames per second and respects reduced motion.

## Deployment

Source: [Omarzaf/Dcenter](https://github.com/Omarzaf/Dcenter).
Vercel builds the Vite app with the checked-in `vercel.json`: frozen pnpm install,
`pnpm build`, and `dist/` output. The site expects the root of an HTTPS origin.
`pnpm-lock.yaml` is the only active lockfile. No application environment variables
or backend services are required.

The build writes `/release.json` with the package version and Git commit, when
available. This lets release checks compare the deployed build with its source.
Source archives without Git metadata report a null commit. Vercel's Git builds
provide the commit automatically; CLI releases can pass `CORE_RELEASE_COMMIT` as
a build variable. Preview and production deployments are distinct release steps.
Browser saves belong to an origin: export from a local preview and import into
the hosted game to carry progress across.

## Source layout

```text
src/firstlight/
  FirstLightApp.tsx     Game shell, objectives, inspection, guidance, notebook
  FacilityScene.tsx    PlayCanvas lifecycle, projection, accessible scene markers
  facilityWorld.ts     Original geometry, equipment states, routes, camera
  model.ts             Deterministic commands, dependencies, canonical validation
  firstLight.ink       Authored chapter and contextual explanations
  story.json           Compiled Ink; regenerated during build
  narrative.ts         Canonical authored dialogue and persistent explanation memory
  persistence.ts       Combined save, bounded import, storage recovery
  campaignWorld.ts     Construction phases, installed resilience, physical routes
  content.ts           First assignment, lesson sources, complete chapter map
src/campaign/
  CampaignRouter.tsx   Resume campaign or enter First Light; portable origin
  CampaignApp.tsx      Chapters 2–6, guides, planner, record, replay, save controls
  content.ts           Authored dialogue and primary-source lessons
  model.ts             Canonical transitions, physical constraints, forecasts
  persistence.ts       Bounded imports and journal-validated saves
src/strategy/          Preserved 12-quarter geopolitical strategy prototype
src/game/              Preserved Floor lab simulation and curriculum
tests/                 Native and browser regression suites
tools/                 Story compiler, release marker, and native test runner
research/              Engine comparisons and source research
public/                Notices included in the production build
```

MIT project license: [LICENSE](LICENSE). Dependency notices:
[public/third-party-notices.txt](public/third-party-notices.txt).

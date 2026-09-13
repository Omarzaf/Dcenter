# melonJS and Phaser assessment for CORE

Research date: 12 September 2026. Scope: engine selection for an immersive, full-window, narrative-led data-center strategy game. This is an inspection and planning artifact, not a game implementation. The coordinator owns local execution evidence. No dependencies, install scripts, or engine demos were executed by this specialist.

## Decision

**melonJS is a credible choice for an authored isometric or 2.5D campus game, but I would not choose it over PlayCanvas for a game whose visual promise depends on a rich 3D campus, movable 3D equipment, cutaways, authored lights, and future model/animation expansion.** Its current 3D work is real, not a fake depth effect; the limiting factors are its narrower asset contract and newly evolving 3D behavior. For a deliberately 2D strategy game, Phaser deserves a stronger second-stage evaluation because of its scene composition, documented React bridge, and tilemap/UI ecosystem.

The user's core complaints—no story, no momentum, unclear actions, and a small game inside a website—are experience-design failures. All three engines can occupy the viewport. None supplies an accurate data-center model, a geopolitical scenario system, a lesson plan, or a compelling storyline.

Recommended selection rule:

| Intended experience | Engine choice | Reason |
| --- | --- | --- |
| A 3D campus that the player can read, build, inspect and transform | PlayCanvas, subject to the coordinator's reviewed spike | Preserve room for a stronger 3D asset pipeline and scene authoring. The richer visual promise warrants its additional complexity. |
| A carefully illustrated 2D/isometric management game, with portraits, briefing scenes and overlays | Evaluate Phaser 4.2.1 first, melonJS 20.4.0 second | Phaser explicitly supports layered concurrent scenes, Tiled isometric maps and React integration. melonJS is smaller in conceptual scope and also viable. |
| A modest 2.5D diorama using simple static/rigidly animated assets | melonJS is reasonable | Its modern cameras, meshes, Tiled loader, sprite layers and effects cover this scope. |

Do not combine multiple game renderers. Keep the simulation, campaign state, lesson content and saves independent of the chosen renderer. Use semantic HTML for the playable decision interface, styled as part of the same game environment.

## Exact repository and release state

- Local repository: `research/vendor/melonjs`.
- Inspected HEAD: `8288e9fd3fd0f7c5075d024d041a89f6323114f1`.
- HEAD commit timestamp: `2026-09-12T18:33:41+08:00`; message: `Text: fix glyph tops shorn off on Safari; save: typed keys (#1660)`.
- `packages/melonjs/package.json` says **20.5.0**, but `packages/melonjs/CHANGELOG.md:3` explicitly labels it **unreleased**. HEAD is not a release tag.
- Latest published GitHub release inspected: **20.4.0, 9 September 2026**, release commit prefix `5e05310`. [Release record](https://github.com/melonjs/melonJS/releases/tag/20.4.0).
- WebGPU arrived in 20.0.0 on 21 August 2026. Camera3d is recorded in 19.7.0 on 6 June 2026; the glTF/lighting/3D path was expanded in 19.8.0 on 26 June. These are comparatively recent capabilities within a longstanding engine.
- Both root and engine package declare **Node >=24**. The source build is not a Node 22 workflow. Browser runtime requirements are separate from build-time Node requirements.
- MIT-licensed source: `LICENSE.md`. Retain the copyright and permission notice when redistributing source. Example art is covered separately by `packages/examples/LICENSE.md`; do not assume every image in the repository shares one blanket asset license.

The shallow research clone is a reference. A production dependency should use a pinned published version and a lockfile. Any intended adoption of HEAD fixes needs an explicit reproducible version decision after testing; do not silently substitute master for stable.

## Findings grounded in local source

Paths beginning `src/` in this section are relative to `packages/melonjs/` inside the clone; example paths are relative to the clone root. Public links point to the inspected commit where useful.

### Rendering and camera capability

`src/application/application.ts` and `src/video/` implement asynchronous renderer creation. In the 20.x API, create `Application`, then await `app.init()`. The default AUTO path negotiates WebGPU, WebGL 2, then Canvas. Explicit WebGL requests can reject unavailable or software-only contexts depending on settings.

`src/camera/camera3d.ts`, `src/renderable/mesh.js`, `src/renderable/sprite3d.js`, `src/lighting/light3d.ts`, `src/level/gltf/` and the 3D examples establish actual perspective cameras, meshes, lighting, billboard sprites and glTF scene loading. There are tests for camera integration, mesh behavior, lighting, glTF instancing and animations. Calling melonJS “2D only” would be incorrect for this revision.

However, renderer fallback is not full visual parity. `src/video/canvas/canvas_renderer.js:534` implements `drawMesh` with per-triangle affine mapping and painter's sorting. The source warns that complex intersecting geometry can render incorrectly without a depth buffer; multi-material meshes use solid triangle colors rather than per-material textures. A 3D game should detect renderer capability and offer a deliberate readable fallback, not assume Canvas will preserve the same campus rendering.

### 3D asset boundaries

[`src/loader/parsers/gltf.js`](https://github.com/melonjs/melonJS/blob/8288e9fd3fd0f7c5075d024d041a89f6323114f1/packages/melonjs/src/loader/parsers/gltf.js) defines the loader as Tier 1: static mesh nodes and rigid node translation/rotation/scale animation. Vertex skinning, morph targets, full PBR maps and Draco compression are outside this documented scope. Some specific extensions are supported—the implementation handles `KHR_lights_punctual`, `KHR_materials_unlit`, `KHR_materials_emissive_strength` and `EXT_mesh_gpu_instancing`—so the header's generic “KHR extensions” exclusion is too broad to repeat literally.

This is adequate for low-poly server halls, turbines, substations, pipes and rigid doors. It is a constraint for arbitrary downloaded 3D assets, physically richer materials, animated human guides, or flexible future asset sourcing. The mentor should be an authored portrait/voice/text character initially, independent of whether 3D characters are available.

The unreleased 20.5.0 changelog includes fixes for `GLTFModel` placement and bounds, mesh sizing, container opacity and Safari text. These correspond closely to planned game interactions: positioning equipment, picking/culling, tutorial highlights and readable text. This is a reason for a focused asset and lifecycle spike before commitment, not proof that all melonJS games are unreliable.

### Isometric construction

The engine has native Tiled map support for orthogonal, isometric, staggered, hexagonal and oblique layouts. Relevant sources include `src/level/tiled/renderer/TMXIsometricRenderer.js`, `src/level/tiled/TMXLayer.js`, and the object-factory path. Authored Tiled object properties can define plot boundaries, entry points, service corridors, buildable cells and lesson triggers.

`packages/examples/src/examples/isometricRpg/` provides a practical reference. `createGame.ts` initializes the engine, preloads assets, registers an entity and changes state; `play.ts` loads a map, enables y ordering and converts pointer positions into tile coordinates. This is useful scaffolding for tile hover/selection and construction placement, not a finished construction system.

The GPU tile-layer optimization is specifically orthogonal: `TMXLayer.js:453` rejects non-orthogonal orientation from that shader path. Isometric rendering still works through the ordinary tile renderer, but the advertised dense-map shader speedup cannot be assumed for this game. Benchmark the actual map and object count.

The game must implement its own occupancy grid, placement legality, utility connection graph, cable/pipe routes, construction lead times, lifecycle costs, resource flow and operational simulation. Physics colliders do not substitute for these systems.

### Scenes, storyline and mentor

`src/state/stage.ts` and `src/state/state.ts` provide Stage lifecycle, transitions and the state manager. Application supports pause/resume and pause on focus loss. Camera fade/shake, sprites, tweens, text typewriter behavior and audio can implement story presentation.

Use a campaign director separate from engine stages. It should evaluate objective predicates and request presentation beats: opening scene → first assignment → first construction task → visible result → mentor explanation → complication → debrief. A recurring guide needs authored situational scripts, a concept registry, a “why this matters” action and an optional deeper explanation. These are custom content and product logic, not features supplied by an engine.

Avoid changing engine scenes for every tiny decision. Preserve the campus while replacing or opening overlays, so the player sees the physical consequence of a choice instead of being bounced through menus.

### Input, UI and accessibility

The engine supplies keyboard, pointer/touch and gamepad bindings. `UIBaseElement`, `UISpriteElement`, `UITextButton`, Draggable and DropTarget cover basic game controls. `UITextButton` uses bitmap text and accepts a key binding.

A source search of the UI/input implementation found no ARIA or DOM focus semantics associated with rendered controls. A keyboard binding is not equivalent to accessible focus order, spoken labels or a readable transcript. Use actual HTML buttons, dialogs and text for objectives, build menus, mentor dialogue and scenario decisions. Keep the visual treatment inside the game shell; DOM overlay does not mean a marketing page around a canvas.

The full-window design needs a parent sized to the viewport, responsive camera framing and separate HUD layout. `Application` offers fit, fill, flex and stretch scale methods and a manual `resize()`. Avoid stretch for the main campus; adapt the camera and rearrange HUD instead. Support zoomable text, captions, pause, reduced motion, keyboard placement, high-contrast selection and touch targets without pointer precision requirements.

### Integration and TypeScript

The engine is an ES module and publishes TypeScript declarations, generated from a mixed JS/TS codebase. Several settings remain permissively typed (`any` is present in `UITextButton` settings), so keep a strict application-owned adapter and explicit domain types.

The examples website uses React 19, Vite and `createExampleComponent`. Its `packages/examples/src/examples/utils.tsx` wrapper explicitly reloads the page when switching examples and documents a StrictMode teardown issue. Do not copy that wrapper as a production React lifecycle design. A single persistent engine instance inside a stable game root is the better candidate, with explicit initialization cancellation, canvas ownership and teardown tests.

Current source `app.destroy()` is terminal. Save application state outside the engine's world tree so a renderer reset or context loss does not reset the campaign. Engine localStorage support is basic persistence; versioned saves, validation, import/export, recovery and checkpoints remain application responsibilities.

### Assets and performance

Asset loading and progress events, sprite atlases, compressed texture formats, pooling and instancing can support a small web game. The README's approximately 250 KB minzipped figure is a maintainer claim, not a measurement performed here. The game's transfer budget will depend chiefly on campus art, textures, portraits, music and voice.

Use an asset-light opening, lazy-load later chapters, cap render resolution/device pixel ratio and implement quality settings. Do not preload every region or scenario before showing the player a usable first scene. Measure the same building placement/picking scene on laptop, mobile Safari and low-performance renderer fallback; neither repository star counts nor a spinning-cube demo proves the desired experience.

## Locally executable references

The coordinator can execute an adapted source sample using an isolated harness and a pinned published engine, without installing the entire examples monorepo:

1. **Minimal initialization:** `packages/examples/src/examples/helloWorld/ExampleHelloWorld.tsx`. Remove only the React example wrapper and run its async `Application`/`Text` setup. This has no external asset requirement. It verifies initialization and text rendering, not gameplay.
2. **Construction interaction reference:** `packages/examples/src/examples/isometricRpg/createGame.ts`, `play.ts`, `resources.ts` and `assets/`. The tile selection code demonstrates coordinate conversion and map rendering. Review the asset provenance before copying any art to a shipped game.
3. **3D capability reference:** `packages/examples/src/examples/gltf/ExampleGltf.tsx` with `packages/examples/public/assets/gltf/platformer-diorama.glb`. The example uses a Kenney CC0-derived scene and camera orbit controls. Root should record which engine version is actually executed. This proves an asset load and camera path, not story UX or production readiness.

Before any published game adopts melonJS, validate: resize after orientation change; correct tile picking while zoomed; keyboard and pointer alternatives; save/restore outside renderer; repeated scene transitions; interrupted initialization; device/context loss; no duplicate loops/listeners after mount cycles; and material/text rendering on Safari. A game-specific simulation test suite remains separate from renderer tests.

## Phaser as the additional repository

Phaser is the strongest additional candidate if the intended art direction is authored 2D or isometric. This assessment used its official repository and documentation; it was not cloned or executed by this specialist.

- Latest release inspected: **4.2.1, 9 July 2026**, commit prefix `41be1e4`. Phaser 4 has a newer WebGL renderer, so this is not a recommendation to copy older Phaser 3 renderer code. [Release](https://github.com/phaserjs/phaser/releases/tag/v4.2.1).
- The framework remains oriented toward 2D games, supports WebGL/Canvas, and is MIT licensed. Engine code licensing does not grant rights to all example art or brand assets. [Repository](https://github.com/phaserjs/phaser), [license](https://github.com/phaserjs/phaser/blob/v4.2.1/LICENSE.md).
- Scenes can run concurrently and be paused or slept independently. This suits a persistent campus scene, a separate HUD and a briefing/dialogue presentation scene. The campaign director should still be application-owned. [Scene documentation](https://docs.phaser.io/phaser/concepts/scenes).
- Tiled JSON maps support orthogonal, isometric, hexagonal and staggered orientations; tile data can be changed at runtime. This fits plot occupancy, campus layers and route visualization. [Tilemap API](https://docs.phaser.io/api-documentation/4.0.0/class/tilemaps-tilemap).
- The Scale Manager supports resizing the canvas to its parent and responds to resize events. This addresses viewport occupation, but does not design a legible HUD. [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager).
- Phaser can display DOM elements over a canvas, although the game still needs a deliberate focus and semantics design. A separate application overlay is also possible. [DOM element guide](https://docs.phaser.io/phaser/concepts/gameobjects/dom-element).
- Official React/Vite and TypeScript templates exist, with a bridge for game/UI communication. Those are more relevant references than a multiplayer starter. [Templates](https://docs.phaser.io/phaser/getting-started/project-templates), [React template](https://github.com/phaserjs/template-react).

Phaser offers a promising route to an illustrated, narrative strategy game without a sophisticated 3D asset pipeline. It does not make scenarios accurate or eliminate the custom work for construction, economics, story branching, contextual teaching or save validation. If PlayCanvas wins the 3D spike, retain Phaser only as a researched alternative; adding a second renderer would create unnecessary architecture.

## Review of this assessment

- Confirmed local source, version metadata, release distinction, renderer paths, glTF limitations, isometric example, lifecycle wrapper and license text.
- No actual FPS, bundle-size or device-compatibility results are claimed here; those require the coordinator's executable spike.
- The specific concern is new 3D surface area and integration constraints, not an unsupported general verdict that melonJS is unsuitable for production.
- A release decision should be made against a representative first mission with real-sized assets and readable controls, then recorded before full implementation.

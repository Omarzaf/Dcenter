# DATACENTER: CORE BUILD

An arcade server-room construction game in the browser. Bolt racks to the floor,
chain them into PODs, balance power and cooling, and survive the meltdown.

![status](https://img.shields.io/badge/status-playable-4be08a)
![stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%207%20%2B%20Tailwind%204-4aa8ff)
![size](https://img.shields.io/badge/bundle-~100kB%20gzip-ffb020)
![audio](https://img.shields.io/badge/sfx-procedural-ff5fa2)

## Play

```bash
npm install
npm run dev      # local dev with HMR
npm run build    # single-file dist/ ready to host anywhere
npm run preview  # serve the production build
```

Open `http://localhost:5173` and hit `DEPLOY TO FLOOR` (or press <kbd>Space</kbd>).

## Controls

| Action          | Keyboard                | Touch                |
| --------------- | ----------------------- | -------------------- |
| Move cursor     | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows | tap a tile |
| Deploy          | <kbd>Space</kbd> / <kbd>Enter</kbd> | tap an empty tile |
| Pick loadout    | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | tap a queue chip |
| Cycle loadout   | <kbd>Tab</kbd> / <kbd>Q</kbd> <kbd>E</kbd> | - |
| Scrap (hold)    | <kbd>X</kbd> on a unit  | long-press a unit    |
| Reboot PDU      | <kbd>F</kbd> on a flashed PDU | tap a flashed PDU |
| Pause / resume  | <kbd>P</kbd> / <kbd>Esc</kbd> | top-right ⏸ button |
| Restart         | <kbd>R</kbd>            | button on game-over  |

## Rules of the floor

- **Link** 3+ adjacent **CPU** racks to form a **POD** - bigger PODs scale
  exponentially.
- A **FIBER** switch touching a POD multiplies it ×1.8.
- An **HVAC** coolant array vents a 3×3 block - roughly one coolant offsets
  three racks.
- A **PDU** bus adds +8 capacity. Push past 100% bus load and the whole floor
  browns out (throughput collapses).
- Core temperature must stay under **100°**. Each phase climbs the ambient
  baseline.
- Periodic events:
  - **TRAFFIC SPIKE** - 2× output for 12s.
  - **COOLANT LEAK** - random 3×3 heat spike.
  - **POWER SURGE** - knocks one PDU offline until you reboot it.
  - **FIRMWARE PATCH** - +35% I/O for 10s.
  - **INTAKE CLOG** - ambient temperature rises.
  - **ROGUE REBOOT** - scramble the queue.
  - **HUMIDITY SURGE** - heat generation ×1.5 for 8s.
- Each POD link stacks a combo multiplier up to **×5**; the combo decays after
  5 seconds of no linking.

## Architecture

```
src/
├── App.tsx                 React shell, HUD, screen overlays
├── main.tsx                React 19 entry
├── index.css               Tailwind v4 theme + custom utilities
├── game/
│   ├── audio.ts            Procedural WebAudio SFX
│   ├── engine.ts           Game state, simulation, input
│   ├── render.ts           Canvas 2D renderer
│   ├── storage.ts          localStorage high scores
│   └── types.ts            Unit definitions, snapshot type
├── components/
│   ├── Hud.tsx             Deploy bar, telemetry, log feed
│   └── Screens.tsx         Start / pause / game-over screens
└── utils/cn.ts             tailwind-merge helper
```

The whole game runs in a single `<canvas>` driven by an `Engine` class. React
re-renders only the HUD on a throttled snapshot (10Hz). The simulation tick
runs at 60Hz against `requestAnimationFrame`.

## Persistence

High scores are saved to `localStorage` under the key
`dcb.highscores.v1` - top 8 only, sorted by score. Wipe it from devtools to
reset the table.

## License

MIT.

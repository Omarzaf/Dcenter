import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Cpu, Pause, Volume2, VolumeX, Radio, Settings as Gear } from "lucide-react";
import { Engine } from "./game/engine";
import { draw } from "./game/render";
import { sfx } from "./game/audio";
import {
  loadScores,
  saveScore,
  loadSettings,
  saveSettings,
  loadCodex,
  saveCodex,
  formatScore,
  formatTime,
  type ScoreEntry,
} from "./game/storage";
import { UNITS, type ConceptId, type GameState, type PublicSettings, type Snapshot } from "./game/types";
import { Codex } from "./components/Codex";
import { ConceptCard } from "./components/ConceptCard";
import {
  DeployBar,
  Legend,
  LogFeed,
  Meter,
  ObjectiveBand,
  ShiftBadge,
  Telemetry,
} from "./components/Hud";
import { GameOverScreen, PauseScreen, StartScreen } from "./components/Screens";
import { SettingsPanel } from "./components/SettingsPanel";
import { AchievementToast } from "./components/Toast";
import { cn } from "./utils/cn";

const EMPTY: Snapshot = {
  state: "idle",
  score: 0,
  data: 0,
  throughput: 0,
  coreTemp: 16,
  ambient: 16,
  load: 0,
  capacity: 16,
  demand: 0,
  combo: 0,
  comboMult: 1,
  comboLeft: 0,
  phase: 1,
  phaseLeft: 26,
  time: 0,
  queue: ["rack", "rack", "rack"],
  selected: 0,
  pods: 0,
  rackCount: 0,
  log: [],
  modifier: null,
  reboot: 0,
  best: 0,
  danger: false,
  shift: 0,
  shiftName: "DAY SHIFT",
  scrambled: 0,
  humid: 0,
  settings: { muted: false, shake: 1, palette: "classic", learnMode: true },
  newAchievement: null,
  achievements: [],
  scoredPods: 0,
  objectives: [{ label: "Link a POD", done: false }],
  pue: Infinity,
  avgPue: Infinity,
  itLoad: 0,
  overhead: 0,
  peakTemp: 16,
  throttled: 0,
  redundantPower: false,
  pendingConcept: null,
  seenConcepts: [],
  learnMode: true,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const snapRef = useRef<Snapshot>(EMPTY);

  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [state, setState] = useState<GameState>("idle");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  /* ---------------- engine boot ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const eng = new Engine(canvas);
    engineRef.current = eng;
    setState(eng.state);
    eng.onSnapshot = (s) => {
      snapRef.current = s;
      setSnap(s);
    };
    eng.onState = (s) => {
      setState(s);
      if (s === "over") setSaved(false);
    };
    eng.onConceptUnlock = saveCodex;

    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) eng.resize(r.width, r.height);
    });
    ro.observe(wrap);
    const r = wrap.getBoundingClientRect();
    eng.resize(r.width, r.height);
    eng.attach();
    eng.emit();

    setScores(loadScores());
    const persisted = loadSettings();
    eng.setSettings(persisted);
    sfx.setMuted(!!persisted.muted);
    setMuted(!!persisted.muted);
    // Codex progress survives across sessions, so cards never re-interrupt.
    for (const id of loadCodex()) eng.seenConcepts.add(id as ConceptId);
    eng.emit();
    setIsTouch(
      typeof window !== "undefined" &&
        (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window),
    );

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      draw(eng, eng.w, eng.h);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      eng.destroy();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setOverlayOpen(settingsOpen || codexOpen);
  }, [settingsOpen, codexOpen]);

  const start = useCallback(() => {
    sfx.unlock();
    engineRef.current?.start();
    canvasRef.current?.focus();
  }, []);
  const pause = useCallback(() => {
    engineRef.current?.togglePause();
    if (engineRef.current?.state === "running") canvasRef.current?.focus();
  }, []);
  const select = useCallback((i: number) => engineRef.current?.select(i), []);

  const dismissConcept = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.dismissConcept();
    saveCodex(Array.from(eng.seenConcepts));
  }, []);

  const applySettings = useCallback((next: PublicSettings) => {
    engineRef.current?.setSettings(next);
    sfx.setMuted(next.muted);
    setMuted(next.muted);
    saveSettings(next);
  }, []);

  const submit = useCallback((tag: string) => {
    const s = snapRef.current;
    const entry: ScoreEntry = {
      score: s.score,
      data: s.data,
      time: s.time,
      phase: s.phase,
      pods: s.pods,
      tag: (tag || "OPS").slice(0, 3).toUpperCase(),
      date: Date.now(),
    };
    setScores(saveScore(entry));
    setSaved(true);
    sfx.reboot();
  }, []);

  const toggleMute = useCallback(() => {
    const next = { ...snapRef.current.settings, muted: !muted };
    applySettings(next);
  }, [applySettings, muted]);

  const running = state === "running";
  const heatPct = Math.min(1, snap.coreTemp / 100);
  // Must stay in sync with the restrained palette used by Telemetry.
  const heatColor = heatPct > 0.82 ? "#d9544f" : heatPct > 0.6 ? "#d6a243" : "#78c8c0";
  const bestScore = scores[0]?.score ?? 0;
  const critical = snap.danger && running;
  const eng = engineRef.current;
  const cursorCell = eng?.grid[eng.cursor.y * 8 + eng.cursor.x];
  const cursorDescription = eng
    ? `Row ${eng.cursor.y + 1}, column ${eng.cursor.x + 1}: ${cursorCell?.unit ? UNITS[cursorCell.unit].name : "empty"}${cursorCell && cursorCell.offline > 0 ? ", offline" : ""}.`
    : "";

  return (
    <div className="grain relative flex h-[100dvh] w-full flex-col overflow-hidden bg-void select-none">
      <header className="relative z-20 flex h-12 shrink-0 items-stretch justify-between border-b border-line bg-deck/95">
        <div className="flex min-w-0 items-stretch">
          <span className="flex w-12 shrink-0 items-center justify-center border-r border-line text-power">
            <Cpu size={17} strokeWidth={1.6} />
          </span>
          <div className="flex min-w-0 items-center px-3 sm:px-4">
            <div>
              <div className="truncate font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-[#d8dee3] sm:text-[13px]">
                Datacenter <span className="text-power">/ Core Build</span>
              </div>
              <div className="mt-0.5 hidden text-[9px] uppercase tracking-[0.22em] text-ash/55 sm:block">
                Sector 07 / Cold aisle containment
              </div>
            </div>
          </div>
        </div>

        <div className="hidden items-center border-l border-line px-4 text-[9px] uppercase tracking-[0.18em] text-ash md:flex">
          <span className="mr-2 h-1.5 w-1.5 bg-ok" /> Facility link nominal
        </div>

        <div className="ml-auto flex items-stretch">
          <div className="hidden min-w-[118px] items-center border-l border-line px-4 text-right lg:flex lg:flex-col lg:justify-center">
            <div className="text-[9px] uppercase tracking-[0.2em] text-ash/50">Record</div>
            <div className="font-display text-[12px] tabular-nums text-ash">
              {scores.length ? formatScore(scores[0].score) : "000"}
            </div>
          </div>
          <div className="flex min-w-[94px] flex-col justify-center border-l border-line px-3 text-right sm:min-w-[120px] sm:px-4">
            <div className="text-[9px] uppercase tracking-[0.2em] text-ash/50">Live score</div>
            <div className="font-display text-lg leading-none tabular-nums text-[#ded8ca]">
              {formatScore(snap.score)}
            </div>
          </div>
          <button
            onClick={() => { setSettingsOpen(false); setCodexOpen((open) => !open); }}
            disabled={!!snap.pendingConcept}
            aria-label="Operations codex"
            aria-expanded={codexOpen}
            aria-haspopup="dialog"
            className={cn(
              "tool-button h-full relative",
              codexOpen && "bg-white/[0.04] text-cool",
            )}
          >
            <BookOpen size={14} />
            {snap.seenConcepts.length > 0 && (
              <span className="absolute right-1 top-1 h-1 w-1 bg-cool" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Enable sound" : "Mute sound"}
            aria-pressed={muted}
            className="tool-button h-full"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => { setCodexOpen(false); setSettingsOpen((open) => !open); }}
            disabled={!!snap.pendingConcept}
            aria-label="Settings"
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            className={cn("tool-button h-full", settingsOpen && "bg-white/[0.04] text-cool")}
          >
            <Gear size={14} />
          </button>
          <button
            onClick={pause}
            disabled={!running && state !== "paused"}
            aria-label={state === "paused" ? "Resume shift" : "Pause shift"}
            className="tool-button h-full disabled:opacity-25"
          >
            <Pause size={14} />
          </button>
        </div>
      </header>

      <main
        aria-label="Game board"
        className="relative flex min-h-0 flex-1 flex-col bg-deck lg:flex-row"
      >
        {(running || state === "paused") && (
          <aside
            aria-label="Loadout"
            className="hidden w-[224px] shrink-0 flex-col border-r border-line lg:flex"
          >
            <DeployBar snap={snap} onSelect={select} />
            <Legend />
          </aside>
        )}

        <section
          ref={wrapRef}
          className={cn(
            "scanlines relative min-h-0 flex-1 overflow-hidden bg-void",
            snap.danger && running && "outline outline-1 -outline-offset-1 outline-alarm/70",
          )}
        >
          <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="application"
          tabIndex={0}
          aria-label="Server floor. Arrow keys move, 1 to 3 choose a unit, Space deploys, X scraps, F reboots, P pauses. Tab leaves the floor."
          aria-describedby="floor-cursor"
        />
          <p id="floor-cursor" className="sr-only" role="status" aria-live="polite">{cursorDescription}</p>

          {(running || state === "paused") && (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-3 border-b px-3 backdrop-blur-[2px]",
                critical
                  ? "critical-band border-alarm/60"
                  : "border-line/50 bg-black/35",
              )}
            >
              <ShiftBadge snap={snap} />
              <span className="h-3 w-px bg-line" />
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-ash">
                <Radio size={10} className="text-cool" /> Phase {snap.phase}
              </div>
              <div className="relative h-px flex-1 bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-cool transition-[width] duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, (1 - snap.phaseLeft / 26) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] tabular-nums tracking-[0.12em] text-ash">
                {formatTime(snap.time)}
              </span>
              {critical && (
                <span className="anim-alarm border border-alarm px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-alarm">
                  Thermal
                </span>
              )}
            </div>
          )}

          {snap.modifier && running && (
            <div className="pointer-events-none absolute left-1/2 top-12 z-10 w-[min(320px,78%)] -translate-x-1/2 border-y bg-black/60 px-3 py-1.5 text-center backdrop-blur-sm" style={{ borderColor: `${snap.modifier.color}66` }}>
              <span className="font-display text-[10px] uppercase tracking-[0.18em]" style={{ color: snap.modifier.color }}>
                {snap.modifier.label}
              </span>
              <span className="absolute inset-x-0 bottom-0 h-px bg-white/10">
                <span
                  className="block h-full"
                  style={{
                    width: `${(snap.modifier.left / snap.modifier.total) * 100}%`,
                    background: snap.modifier.color,
                  }}
                />
              </span>
            </div>
          )}

          {running && snap.combo > 0 && (
            <div className="pointer-events-none absolute bottom-10 right-4 z-10 border-r-2 border-fiber pr-3 text-right">
              <div className="text-[9px] uppercase tracking-[0.18em] text-ash">Link chain</div>
              <div className="font-display text-2xl leading-none tabular-nums text-fiber">
                ×{snap.comboMult.toFixed(1)}
              </div>
              <div className="mt-1 h-px w-16 bg-white/10">
                <div className="h-full bg-fiber" style={{ width: `${(snap.comboLeft / 5) * 100}%` }} />
              </div>
            </div>
          )}

          {running && (
            <ObjectiveBand
              snap={snap}
              hint={engineRef.current?.hint || undefined}
              control={isTouch ? "Tap floor to deploy / hold unit to scrap" : "Space deploy / X scrap / P pause"}
            />
          )}

          {/* Announces state changes to assistive tech without visual clutter. */}
          <div className="sr-only" role="status" aria-live="assertive">
            {snap.danger
              ? "Thermal critical. Deploy coolant immediately."
              : snap.reboot > 0
                ? "Power distribution unit offline. Reboot required."
                : ""}
          </div>

          {state === "idle" && (
            <StartScreen
              onStart={start}
              scores={scores}
              seenCount={snap.seenConcepts.length}
              onOpenCodex={() => setCodexOpen(true)}
            />
          )}
          {state === "paused" && !snap.pendingConcept && !settingsOpen && !codexOpen && (
            <PauseScreen snap={snap} onResume={pause} onRestart={start} />
          )}
          {state === "over" && !settingsOpen && !codexOpen && (
            <GameOverScreen
              snap={snap}
              scores={scores}
              bestScore={bestScore}
              onRestart={start}
              onSubmit={submit}
              onOpenCodex={() => setCodexOpen(true)}
              saved={saved}
            />
          )}

          <AchievementToast id={snap.newAchievement} />
          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={snap.settings}
            onChange={applySettings}
          />

          {/* Teaching surfaces sit above every other overlay. */}
          <Codex
            open={codexOpen}
            onClose={() => setCodexOpen(false)}
            seen={snap.seenConcepts}
          />
          {snap.pendingConcept && (
            <ConceptCard key={snap.pendingConcept} id={snap.pendingConcept} onDismiss={dismissConcept} />
          )}
        </section>

        {(running || state === "paused") && (
          <aside
            aria-label="Telemetry"
            className="hidden w-[266px] shrink-0 flex-col border-l border-line lg:flex"
          >
            <Telemetry snap={snap} />
            <LogFeed snap={snap} />
          </aside>
        )}

        {(running || state === "paused") && (
          <div className="mobile-deck shrink-0 border-t border-line bg-deck lg:hidden">
            <div className="mobile-meters grid grid-cols-2 gap-4 px-3 py-2">
              <Meter
                label="Thermal stress"
                value={heatPct}
                color={heatColor}
                danger={heatPct > 0.82}
                right={`${snap.coreTemp.toFixed(0)} / 100`}
              />
              <Meter
                label="Bus load"
                value={Math.min(1, snap.load)}
                color={snap.load > 1 ? "#d9544f" : snap.load > 0.85 ? "#d6a243" : "#80b784"}
                danger={snap.load > 1}
                right={`${Math.round(snap.load * 100)}%`}
              />
            </div>
            <DeployBar snap={snap} onSelect={select} compact />
            <details className="max-h-40 overflow-y-auto border-t border-line px-3 text-xs">
              <summary className="cursor-pointer py-2 text-cool">Floor status and controls</summary>
              <p className="py-2">Stress {snap.coreTemp.toFixed(0)}/100 · Load {Math.round(snap.load * 100)}% · Model PUE {Number.isFinite(snap.pue) ? snap.pue.toFixed(2) : "—"}</p>
              <p className="pb-2">Tap an empty cell to build. Tap an offline unit to reboot. Hold a unit to scrap; drag off to cancel.</p>
              <p className="pb-2">{snap.log[0]?.text}</p>
              <button className="action-secondary mb-2" onClick={() => canvasRef.current?.focus()}>Focus floor for keyboard play</button>
            </details>
          </div>
        )}
      </main>

      <footer className="relative z-10 hidden h-6 shrink-0 items-center justify-between border-t border-line bg-deck px-3 text-[9px] uppercase tracking-[0.18em] text-ash/45 lg:flex">
        <span><span className="mr-2 inline-block h-1 w-1 bg-ok" />NOC uplink / stable</span>
        <span>Chiller loop 02 / nominal</span>
        <span>Fiber trunk 12 / 400G</span>
        <span>Generator A / standby</span>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Skull,
  Trophy,
  BookOpen,
} from "lucide-react";
import { formatScore, formatTime, type ScoreEntry } from "../game/storage";
import { gradeRun, pueBand } from "../game/curriculum";
import { ACHIEVEMENTS, type Snapshot } from "../game/types";
import { cn } from "../utils/cn";
import { RunSummary, UnitIcon } from "./Hud";
import { useModal } from "./useModal";

export function ScoreTable({
  scores,
  highlight = -1,
  compact,
}: {
  scores: ScoreEntry[];
  highlight?: number;
  compact?: boolean;
}) {
  return (
    <section className="border-t border-line">
      <div className="flex items-center justify-between py-2.5">
        <div className="section-label">
          <Trophy size={11} className="text-power" /> Local records
        </div>
        <span className="text-[9px] tracking-[0.18em] text-ash/50">TOP 08</span>
      </div>
      {scores.length === 0 ? (
        <p className="border-t border-line/60 py-4 text-[10px] text-ash/55">
          No shift records. First operator sets the baseline.
        </p>
      ) : (
        <table className="w-full border-collapse text-[10px] tabular-nums">
          <thead>
            <tr className="border-y border-line/60 text-[9px] uppercase tracking-[0.16em] text-ash/50">
              <th className="py-1.5 text-left font-normal">Rank</th>
              <th className="py-1.5 text-left font-normal">Ops</th>
              <th className="py-1.5 text-right font-normal">Score</th>
              {!compact && <th className="py-1.5 text-right font-normal">Data</th>}
              <th className="py-1.5 text-right font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr
                key={`${score.date}-${index}`}
                className={cn(
                  "border-b border-line/35 text-[#c8cfd4]",
                  index === highlight && "border-l-2 border-l-power bg-power/[0.06] text-power",
                )}
              >
                <td className="py-1.5 text-ash/45">{String(index + 1).padStart(2, "0")}</td>
                <td className="py-1.5 font-semibold tracking-[0.16em]">{score.tag}</td>
                <td className="py-1.5 text-right">{formatScore(score.score)}</td>
                {!compact && <td className="py-1.5 text-right text-cool">{score.data.toFixed(1)}T</td>}
                <td className="py-1.5 text-right text-ash">{formatTime(score.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ControlLine({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/35 py-1.5 text-[9px]">
      <span className="flex gap-1">
        {keys.map((key) => (
          <span key={key} className="kbd">
            {key}
          </span>
        ))}
      </span>
      <span className="uppercase tracking-[0.14em] text-ash/70">{label}</span>
    </div>
  );
}

export function StartScreen({
  onStart,
  scores,
  seenCount,
  onOpenCodex,
}: {
  onStart: () => void;
  scores: ScoreEntry[];
  seenCount: number;
  onOpenCodex: () => void;
}) {
  return (
    <div className="screen-veil grain absolute inset-0 z-30 overflow-y-auto">
      <div className="mx-auto grid min-h-full w-full max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex min-h-[600px] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 lg:border-r lg:border-line lg:px-12 lg:py-10">
          <div className="anim-slidein">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.24em] text-ash">
                <span className="h-2 w-2 bg-ok" />
                Sector 07 / Operations training
              </div>
              <span className="font-display text-[10px] tracking-[0.18em] text-ash/55">BUILD 02.6</span>
            </div>

            <div className="mt-[clamp(2.5rem,8vh,6.5rem)]">
              <div className="mb-3 text-[9px] uppercase tracking-[0.34em] text-power">
                Cold aisle containment simulator
              </div>
              <h1 className="font-display font-bold uppercase leading-[0.78] tracking-[-0.055em] text-[#e0e3df]">
                <span className="block text-[clamp(3.7rem,11vw,8.2rem)]">Data</span>
                <span className="block text-[clamp(3.7rem,11vw,8.2rem)]">Center</span>
                <span className="mt-2 block text-[clamp(1.6rem,4vw,3rem)] tracking-[0.12em] text-power">
                  Core Build
                </span>
              </h1>
              <p className="mt-6 max-w-lg border-l border-power/70 pl-4 text-[12px] leading-6 text-ash">
                Link rack clusters. Carry the power load. Keep thermal stress below 100.
                Throughput pays; heat compounds.
              </p>
              <p className="mt-3 max-w-lg text-[11px] leading-5 text-ash/65">
                A simplified operations lab. Stress is a game index, not a temperature in Celsius.
                The codex connects your choices to engineering concepts; model PUE is not a measured facility benchmark.
              </p>
            </div>
          </div>

          <div className="anim-slidein mt-10 [animation-delay:120ms]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button onClick={onStart} className="action-primary w-full sm:w-[320px]">
                <span>Begin shift</span>
                <span className="flex items-center gap-2 text-[10px] tracking-[0.08em]">
                  SPACE <ArrowRight size={16} />
                </span>
              </button>
              <button onClick={onOpenCodex} className="action-secondary">
                <BookOpen size={13} /> Codex
                <span className="text-ash/45">{seenCount}/18</span>
              </button>
            </div>
            <div className="measure-line mt-7 h-2 border-x border-ash/25" />
            <div className="mt-3 grid grid-cols-4 gap-3">
              {(["rack", "cool", "power", "fiber"] as const).map((type, index) => (
                <div key={type} className="flex items-center gap-2 text-[9px] text-ash/65">
                  <span style={{ color: ["#69a6d7", "#78c8c0", "#d6a243", "#c77a9c"][index] }}>
                    <UnitIcon type={type} size={13} />
                  </span>
                  <span className="hidden uppercase tracking-[0.12em] sm:block">
                    {type === "rack" ? "Compute" : type === "cool" ? "Cooling" : type === "power" ? "Power" : "Network"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="bg-black/20 px-5 py-6 sm:px-8 lg:px-6 lg:py-10">
          <div className="flex h-full flex-col">
            <div className="section-label">First shift protocol</div>
            <ol className="mt-3 border-t border-line">
              {[
                ["01", "Link compute", "Place three adjacent CPU racks to open a POD."],
                ["02", "Stabilize", "Add HVAC before local heat crosses the amber band."],
                ["03", "Scale power", "PDU units raise bus capacity by eight."],
              ].map(([number, title, copy]) => (
                <li key={number} className="grid grid-cols-[28px_1fr] gap-2 border-b border-line/60 py-3">
                  <span className="font-display text-[10px] text-power">{number}</span>
                  <span>
                    <b className="block font-display text-[12px] uppercase tracking-[0.12em] text-[#d8dee3]">
                      {title}
                    </b>
                    <span className="mt-1 block text-[9px] leading-4 text-ash/70">{copy}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-ash">
                <Keyboard size={12} /> Console map
              </div>
              <div className="mt-2 border-t border-line">
                <ControlLine keys={["WASD", "ARROW"]} label="Move" />
                <ControlLine keys={["SPACE"]} label="Deploy" />
                <ControlLine keys={["1", "2", "3"]} label="Loadout" />
                <ControlLine keys={["X", "F", "P"]} label="Scrap / reboot / pause" />
              </div>
            </div>

            <div className="mt-6 lg:mt-auto">
              <ScoreTable scores={scores.slice(0, 5)} compact />

            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PauseScreen({
  snap,
  onResume,
  onRestart,
}: {
  snap: Snapshot;
  onResume: () => void;
  onRestart: () => void;
}) {
  const modalRef = useModal(true, onResume);
  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="screen-veil absolute inset-0 z-30 flex items-center overflow-y-auto px-5 sm:px-12"
      role="dialog"
      aria-modal="true"
      aria-label="Shift paused"
    >
      <div className="anim-slidein frame-corners w-full max-w-xl px-5 py-7 sm:px-8">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-cool">
          <Pause size={12} /> Simulation hold
        </div>
        <h2 className="mt-3 font-display text-[clamp(2.4rem,7vw,4.8rem)] font-bold uppercase leading-none tracking-[-0.04em] text-[#e0e3df]">
          Shift paused
        </h2>
        <p className="mt-3 border-l border-cool/60 pl-3 text-[11px] leading-5 text-ash">
          Simulation clock stopped. Thermal state and bus load are held.
        </p>

        <RunSummary snap={snap} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={onResume} className="action-primary min-w-[230px]">
            <span>Resume</span>
            <Play size={15} />
          </button>
          <button onClick={onRestart} className="action-secondary">
            <RotateCcw size={13} /> Restart shift <span className="text-ash/45">R</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GameOverScreen({
  snap,
  scores,
  bestScore,
  onRestart,
  onSubmit,
  onOpenCodex,
  saved,
}: {
  snap: Snapshot;
  scores: ScoreEntry[];
  bestScore: number;
  onRestart: () => void;
  onSubmit: (tag: string) => void;
  onOpenCodex: () => void;
  saved: boolean;
}) {
  const [tag, setTag] = useState("OPS");
  const modalRef = useModal(true, onRestart);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRecord = snap.score > bestScore && bestScore > 0;
  const earned = snap.achievements;
  const band = pueBand(snap.avgPue);
  const assessment = gradeRun({
    avgPue: snap.avgPue,
    peakTemp: snap.peakTemp,
    phase: snap.phase,
    redundantPowerAtEnd: snap.redundantPower,
    throttledSeconds: snap.throttled,
    uptime: snap.time,
  });

  // Auto-focus the initials field so the save path is Enter -> done.
  useEffect(() => {
    if (!saved) inputRef.current?.focus();
  }, [saved]);

  const rows = [
    ["Data shipped", `${snap.data.toFixed(1)} TB`],
    ["Uptime", formatTime(snap.time)],
    ["Phase", String(snap.phase).padStart(2, "0")],
    ["PODs online", String(snap.pods).padStart(2, "0")],
    ["Racks deployed", String(snap.rackCount).padStart(2, "0")],
  ] as const;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="screen-veil grain absolute inset-0 z-30 overflow-y-auto px-5 py-6 sm:px-8 lg:px-12"
      role="dialog"
      aria-modal="true"
      aria-label="Incident report"
    >
      <div className="mx-auto grid min-h-full w-full max-w-[1000px] content-center gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="anim-slidein">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.25em] text-alarm">
            <span className="flex items-center gap-2">
              <Skull size={13} /> Incident 07-A / Thermal runaway
            </span>
            {isRecord && (
              <span className="border border-power px-1.5 py-0.5 text-[9px] tracking-[0.18em] text-power">
                New facility record
              </span>
            )}
          </div>
          <h2 className="mt-4 font-display text-[clamp(3.2rem,10vw,7.4rem)] font-bold uppercase leading-[0.76] tracking-[-0.055em] text-[#e0e3df]">
            Core
            <span className="block text-alarm">shutdown</span>
          </h2>
          <div className="mt-8 flex items-end justify-between border-y border-alarm/45 py-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-ash">Final score</div>
              <div className="font-display text-[clamp(2.6rem,8vw,5rem)] leading-none tabular-nums text-power">
                {formatScore(snap.score)}
              </div>
            </div>
            <span className="hidden max-w-[190px] text-right text-[9px] leading-4 text-ash/60 sm:block">
              Thermal stress reached 100. This is the game's shutdown threshold, not a physical temperature.
            </span>
          </div>

          <dl className="mt-2 max-w-lg">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-line/55 py-2">
                <dt className="text-[9px] uppercase tracking-[0.17em] text-ash/70">{label}</dt>
                <dd className="m-0 font-display text-sm tabular-nums text-[#d8dee3]">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Engineering debrief: what the run demonstrated, not just its score. */}
          <section className="mt-7 border-t border-line pt-4">
            <div className="flex items-baseline justify-between">
              <div className="section-label">Shift debrief</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-ash/60">Grade</span>
                <span
                  className="font-display text-2xl leading-none"
                  style={{ color: assessment.color }}
                >
                  {assessment.grade}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
              {[
                {
                  label: "Model PUE",
                  value: isFinite(snap.avgPue) ? snap.avgPue.toFixed(2) : "—",
                  tone: band.color,
                  foot: band.label,
                },
                {
                  label: "Peak stress",
                  value: `${snap.peakTemp.toFixed(0)}/100`,
                  tone: snap.peakTemp > 90 ? "#d9544f" : snap.peakTemp > 70 ? "#d6a243" : "#80b784",
                  foot: snap.peakTemp > 90 ? "Minimal margin" : "Margin held",
                },
                {
                  label: "Throttled",
                  value: `${snap.throttled.toFixed(0)}s`,
                  tone: snap.throttled > 25 ? "#d9544f" : snap.throttled > 5 ? "#d6a243" : "#80b784",
                  foot: snap.throttled > 5 ? "Work lost to heat" : "Clean thermals",
                },
                {
                  label: "Final supply",
                  value: snap.redundantPower ? "+1 spare" : "No spare",
                  tone: snap.redundantPower ? "#80b784" : "#cf784d",
                  foot: "End-of-run capacity",
                },
              ].map((metric) => (
                <div key={metric.label} className="border-b border-line/50 py-2">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-ash/60">
                    {metric.label}
                  </div>
                  <div
                    className="font-display text-lg leading-tight tabular-nums"
                    style={{ color: metric.tone }}
                  >
                    {metric.value}
                  </div>
                  <div className="text-[9px] text-ash/45">{metric.foot}</div>
                </div>
              ))}
            </div>

            <ul className="mt-3 space-y-1">
              {assessment.notes.map((note) => (
                <li key={note} className="flex gap-2 text-[10px] leading-4 text-ash">
                  <span className="mt-1 h-1 w-1 shrink-0 bg-ash/40" />
                  {note}
                </li>
              ))}
            </ul>

            {snap.seenConcepts.length > 0 && (
              <button
                onClick={onOpenCodex}
                className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-cool transition hover:text-[#d8dee3]"
              >
                <BookOpen size={12} />
                {snap.seenConcepts.length} concepts demonstrated / open codex
              </button>
            )}
          </section>

          {earned.length > 0 && (
            <div className="mt-6 max-w-lg">
              <div className="text-[9px] uppercase tracking-[0.2em] text-ash/60">
                Directives completed / {earned.length}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {earned.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-power"
                  >
                    <span className="h-1 w-1 bg-power" />
                    {ACHIEVEMENTS[id].label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {!saved ? (
              <form
                className="flex border-y border-line"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmit(tag || "OPS");
                }}
              >
                <input
                  ref={inputRef}
                  value={tag}
                  maxLength={3}
                  onChange={(event) =>
                    setTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  className="h-12 w-24 select-text border-r border-line bg-black/30 text-center font-display text-lg tracking-[0.28em] text-power outline-none focus:bg-power/[0.06]"
                  aria-label="Operator initials"
                />
                <button
                  type="submit"
                  className="px-4 font-display text-[11px] uppercase tracking-[0.16em] text-power transition hover:bg-power/[0.08]"
                >
                  Log record
                </button>
              </form>
            ) : (
              <div className="flex h-12 items-center border-y border-ok/40 px-4 text-[10px] uppercase tracking-[0.16em] text-ok">
                Record logged / {tag || "OPS"}
              </div>
            )}
            <button onClick={onRestart} className="action-primary min-w-[220px]">
              <span>Restart</span>
              <RotateCcw size={15} />
            </button>
          </div>
        </section>

        <aside className="anim-slidein border-t border-line pt-6 [animation-delay:90ms] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <ScoreTable
            scores={scores}
            highlight={
              saved
                ? scores.findIndex(
                    (score) => score.tag === (tag || "OPS") && score.score === snap.score,
                  )
                : -1
            }
          />
        </aside>
      </div>
    </div>
  );
}

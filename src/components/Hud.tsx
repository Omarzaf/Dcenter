import {
  Activity,
  AlertTriangle,
  Droplets,
  Fan,
  Flame,
  Layers,
  Network,
  Server,
  Shuffle,
  Timer,
  Zap,
} from "lucide-react";
import { formatScore, formatTime } from "../game/storage";
import { pueBand } from "../game/curriculum";
import { UNITS, type Snapshot, type UnitType } from "../game/types";
import { cn } from "../utils/cn";

export function UnitIcon({ type, size = 16 }: { type: UnitType; size?: number }) {
  const props = { size, strokeWidth: 1.7 };
  if (type === "rack") return <Server {...props} />;
  if (type === "cool") return <Fan {...props} />;
  if (type === "power") return <Zap {...props} />;
  return <Network {...props} />;
}

export function Meter({
  label,
  value,
  color,
  danger,
  right,
}: {
  label: string;
  value: number;
  color: string;
  danger?: boolean;
  right?: string;
}) {
  const width = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-4">
        <span className="text-[9px] uppercase tracking-[0.2em] text-ash">{label}</span>
        <span
          className={cn(
            "font-display text-[14px] leading-none tabular-nums",
            danger && "anim-alarm",
          )}
          style={{ color }}
        >
          {right}
        </span>
      </div>
      <div className="relative h-[5px] overflow-hidden bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-150"
          style={{
            width: `${width}%`,
            background: color,
            boxShadow: danger ? `0 0 12px ${color}` : "none",
          }}
        />
        <span
          className="absolute inset-y-0 w-px bg-white/25"
          style={{ left: "82%" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 grid grid-cols-4">
          <span className="border-r border-void/60" />
          <span className="border-r border-void/60" />
          <span className="border-r border-void/60" />
          <span />
        </div>
      </div>
    </div>
  );
}

export function DeployBar({
  snap,
  onSelect,
  compact,
}: {
  snap: Snapshot;
  onSelect: (i: number) => void;
  compact?: boolean;
}) {
  return (
    <section
      data-compact={compact ? "true" : "false"}
      className={cn("deploy-bar rail-section", compact ? "border-b border-line" : "flex-1")}
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="section-label">Loadout</span>
        <span className="text-[9px] tracking-[0.16em] text-ash/55">
          {compact ? "TAP TO SELECT" : "KEYS 1-3"}
        </span>
      </div>

      <div className={cn(compact ? "grid grid-cols-3" : "border-t border-line/70")}>
        {snap.queue.map((unit, index) => {
          const def = UNITS[unit];
          const active = index === snap.selected;
          return (
            <button
              key={`${index}-${unit}`}
              onClick={() => onSelect(index)}
              aria-pressed={active}
              aria-label={`${def.name}, loadout ${index + 1}`}
              className={cn(
                "group relative text-left transition-colors duration-150 active:bg-white/[0.06]",
                compact
                  ? "flex min-h-[62px] flex-col items-center justify-center gap-1 border-r border-line/70 last:border-r-0"
                  : "flex w-full items-center gap-3 border-b border-line/70 px-3 py-3",
                active ? "bg-white/[0.045]" : "hover:bg-white/[0.025]",
              )}
            >
              <span
                className={cn(
                  "absolute bg-current transition-all",
                  compact ? "inset-x-3 bottom-0 h-[2px]" : "inset-y-2 left-0 w-[2px]",
                  active ? "opacity-100" : "opacity-0",
                )}
                style={{ color: def.color }}
              />
              {!compact && (
                <span className="w-5 text-[9px] tabular-nums text-ash/45">0{index + 1}</span>
              )}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center"
                style={{ color: active ? def.color : "#83909b" }}
              >
                <UnitIcon type={unit} size={18} />
              </span>
              <span className={cn("min-w-0", !compact && "flex-1")}>
                <span
                  className="block font-display text-[12px] font-semibold tracking-[0.14em]"
                  style={{ color: active ? def.color : "#c6cdd2" }}
                >
                  {def.code}
                </span>
                {!compact && (
                  <span className="mt-0.5 block truncate text-[9px] uppercase tracking-[0.08em] text-ash/65">
                    {def.name}
                  </span>
                )}
              </span>
              {!compact && (
                <span className="text-[9px] tabular-nums text-ash/50">
                  {def.draw > 0 ? `${def.draw}u` : "+BUS"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Legend() {
  return (
    <section className="rail-section border-b border-line px-3 py-3">
      <div className="section-label mb-3">Floor spec</div>
      <dl className="space-y-2.5">
        {(Object.keys(UNITS) as UnitType[]).map((type) => {
          const unit = UNITS[type];
          return (
            <div key={type} className="grid grid-cols-[20px_38px_1fr] gap-1.5 text-[10px] leading-[1.4]">
              <dt className="pt-px" style={{ color: unit.color }}>
                <UnitIcon type={type} size={13} />
              </dt>
              <dt className="font-semibold" style={{ color: unit.color }}>
                {unit.code}
              </dt>
              <dd className="m-0 text-ash/75">{unit.blurb}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Instrument({
  icon,
  label,
  value,
  color = "#d8dee3",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2 last:border-b-0">
      <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-ash/75">
        {icon}
        {label}
      </span>
      <span className="font-display text-sm tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function AlertRow({
  icon,
  children,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-l-2 bg-white/[0.025] px-2 py-1.5 text-[10px]",
        pulse && "anim-alarm",
      )}
      style={{ color, borderColor: color }}
    >
      {icon}
      {children}
    </div>
  );
}

export function Telemetry({ snap }: { snap: Snapshot }) {
  const heatPct = Math.min(1, snap.coreTemp / 100);
  const heatColor = heatPct > 0.82 ? "#d9544f" : heatPct > 0.6 ? "#d6a243" : "#78c8c0";
  const loadPct = Math.min(1, snap.load);
  const loadColor = snap.load > 1 ? "#d9544f" : snap.load > 0.85 ? "#d6a243" : "#80b784";
  const band = pueBand(snap.pue);

  return (
    <section className="rail-section border-b border-line">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="section-label">Core telemetry</span>
        <span className="font-display text-[10px] tabular-nums text-ash">P{snap.phase}</span>
      </div>

      <div className="space-y-4 border-t border-line/70 px-3 py-3">
        <Meter
          label="Thermal stress"
          value={heatPct}
          color={heatColor}
          danger={heatPct > 0.82}
          right={`${snap.coreTemp.toFixed(1)} / 100`}
        />
        <Meter
          label="Bus load"
          value={loadPct}
          color={loadColor}
          danger={snap.load > 1}
          right={`${snap.demand.toFixed(1)} / ${snap.capacity.toFixed(0)}u`}
        />
      </div>

      {/* PUE: the primary efficiency metric, shown with its quality band. */}
      <div className="border-t border-line/70 px-3 py-3">
        <div className="flex items-end justify-between">
          <span className="text-[9px] uppercase tracking-[0.2em] text-ash">
            Model PUE
            <span className="ml-1.5 normal-case tracking-normal text-ash/45">
              facility / IT
            </span>
          </span>
          <span
            className="font-display text-[18px] leading-none tabular-nums"
            style={{ color: band.color }}
          >
            {isFinite(snap.pue) ? snap.pue.toFixed(2) : "—"}
          </span>
        </div>
        <div className="relative mt-2 h-[5px] bg-white/[0.06]">
          {/* 1.0 to 2.2 mapped across the track. */}
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-200"
            style={{
              width: `${Math.max(0, Math.min(100, ((Math.min(snap.pue, 2.2) - 1) / 1.2) * 100))}%`,
              background: band.color,
            }}
          />
          {[
            { at: 1.2, title: "Model ratio 1.2" },
            { at: 1.5, title: "Model ratio 1.5" },
          ].map((mark) => (
            <span
              key={mark.at}
              title={mark.title}
              className="absolute inset-y-0 w-px bg-white/30"
              style={{ left: `${((mark.at - 1) / 1.2) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: band.color }}>
            {band.label}
          </span>
          <span className="text-[9px] tabular-nums text-ash/55">
            IT {snap.itLoad.toFixed(1)}u / OH {snap.overhead.toFixed(1)}u
          </span>
        </div>
      </div>

      <div className="border-t border-line/70 px-3">
        <Instrument
          icon={<Activity size={11} />}
          label="Output"
          value={`${snap.throughput.toFixed(1)} TB/s`}
          color="#69a6d7"
        />
        <Instrument icon={<Layers size={11} />} label="Linked pods" value={`${snap.pods}`} />
        <Instrument icon={<Server size={11} />} label="Rack count" value={`${snap.rackCount}`} />
        <Instrument icon={<Timer size={11} />} label="Uptime" value={formatTime(snap.time)} />
      </div>

      {(snap.load > 1 || snap.danger || snap.reboot > 0 || snap.scrambled > 0 || snap.humid > 0) && (
        <div className="space-y-1.5 border-t border-line/70 px-3 py-3">
          {snap.load > 1 && (
            <AlertRow icon={<AlertTriangle size={12} />} color="#d9544f">
              BUS OVERLOAD / BUILD PDU
            </AlertRow>
          )}
          {snap.danger && (
            <AlertRow icon={<Flame size={12} />} color="#d9544f" pulse>
              THERMAL LIMIT / VENT NOW
            </AlertRow>
          )}
          {snap.reboot > 0 && (
            <AlertRow icon={<Zap size={12} />} color="#d6a243" pulse>
              PDU OFFLINE / TAP OR [F]
            </AlertRow>
          )}
          {snap.scrambled > 0 && (
            <AlertRow icon={<Shuffle size={12} />} color="#c77a9c">
              QUEUE SCRAMBLED <span className="ml-auto tabular-nums">{snap.scrambled.toFixed(1)}s</span>
            </AlertRow>
          )}
          {snap.humid > 0 && (
            <AlertRow icon={<Droplets size={12} />} color="#83909b">
              HUMIDITY ×1.5 <span className="ml-auto tabular-nums">{snap.humid.toFixed(1)}s</span>
            </AlertRow>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Bottom status band. Mirrors the phase band at the top of the board so the
 * board is bracketed by two read-only HUD strips.
 */
export function ObjectiveBand({
  snap,
  hint,
  control,
}: {
  snap: Snapshot;
  hint?: string;
  control?: string;
}) {
  const aside = hint || control;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-8 items-stretch border-t border-line/60 bg-black/45 backdrop-blur-[2px]">
      <div className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden">
        {snap.objectives.map((objective, index) => (
          <div
            key={objective.label}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3",
              index > 0 && "border-l border-line/50",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0",
                objective.done ? "bg-ok" : "border border-ash/45",
              )}
            />
            <span
              className={cn(
                "whitespace-nowrap text-[9px] uppercase tracking-[0.14em]",
                objective.done ? "text-ok/75" : "text-ash",
              )}
            >
              {objective.label}
            </span>
          </div>
        ))}
      </div>
      {aside && (
        <div className="hidden min-w-0 items-center border-l border-line/50 px-3 sm:flex">
          <span
            className={cn(
              "truncate text-[9px] uppercase tracking-[0.14em]",
              hint ? "text-rack" : "text-ash/50",
            )}
          >
            {aside}
          </span>
        </div>
      )}
    </div>
  );
}

/** Read-only run state, used by the pause surface. */
export function RunSummary({ snap }: { snap: Snapshot }) {
  const rows = [
    ["Score", formatScore(snap.score)],
    ["Data shipped", `${snap.data.toFixed(1)} TB`],
    ["Thermal stress", `${snap.coreTemp.toFixed(1)}/100`],
    ["Bus load", `${Math.round(snap.load * 100)}%`],
    ["PODs", String(snap.pods)],
    ["Uptime", formatTime(snap.time)],
  ] as const;
  return (
    <dl className="mt-8 grid grid-cols-2 gap-x-8 border-t border-line">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between border-b border-line/50 py-2"
        >
          <dt className="text-[9px] uppercase tracking-[0.16em] text-ash/70">{label}</dt>
          <dd className="m-0 font-display text-sm tabular-nums text-[#d8dee3]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ShiftBadge({ snap }: { snap: Snapshot }) {
  const colors = ["#d6a243", "#cf784d", "#78c8c0", "#d9544f"];
  const color = colors[snap.shift] ?? colors[0];
  return (
    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-ash">
      <span className="h-1.5 w-1.5" style={{ background: color }} />
      {snap.shiftName}
    </div>
  );
}

export function LogFeed({ snap }: { snap: Snapshot }) {
  const colors: Record<string, string> = {
    info: "#83909b",
    good: "#80b784",
    warn: "#d6a243",
    bad: "#d9544f",
  };
  return (
    <section className="rail-section flex min-h-0 flex-1 flex-col border-b border-line">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="section-label">Event log</span>
        <span className="text-[9px] text-ash/45">LATEST / 06</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-hidden border-t border-line/70 px-3 py-2 text-[10px] leading-relaxed">
        {snap.log.length === 0 && <li className="py-2 text-ash/40">No anomalies recorded.</li>}
        {snap.log.map((line, index) => (
          <li
            key={line.id}
            className={cn(
              "anim-slidein grid grid-cols-[18px_1fr] border-b border-line/35 py-1.5 last:border-0",
              index > 3 && "opacity-45",
            )}
            style={{ color: colors[line.kind] }}
          >
            <span className="tabular-nums text-ash/35">{String(index + 1).padStart(2, "0")}</span>
            <span className="truncate">{line.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ScoreBadge({ snap }: { snap: Snapshot }) {
  return (
    <div className="flex items-end gap-4">
      <div>
        <div className="text-[9px] uppercase tracking-[0.24em] text-ash">Score</div>
        <div className="font-display text-[28px] leading-none tabular-nums text-[#ded8ca]">
          {formatScore(snap.score)}
        </div>
      </div>
      <div className="border-l border-line pl-3">
        <div className="text-[9px] uppercase tracking-[0.2em] text-ash">Data</div>
        <div className="font-display text-sm tabular-nums text-cool">{snap.data.toFixed(1)} TB</div>
      </div>
      {snap.combo > 0 && (
        <div className="anim-pop border-b border-fiber pb-0.5 font-display text-sm tabular-nums text-fiber">
          ×{snap.comboMult.toFixed(1)}
        </div>
      )}
    </div>
  );
}

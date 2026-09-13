import { useState } from "react";
import { useModal } from "./useModal";
import { BookOpen, Lock, X } from "lucide-react";
import {
  CONCEPTS,
  CONCEPT_ORDER,
  DISCIPLINES,
  type ConceptId,
  type Discipline,
} from "../game/curriculum";
import { cn } from "../utils/cn";

/**
 * Browsable reference. Entries unlock by being demonstrated in play, so the
 * codex doubles as a record of what the student has actually encountered.
 */
export function Codex({
  open,
  onClose,
  seen,
}: {
  open: boolean;
  onClose: () => void;
  seen: ConceptId[];
}) {
  const unlocked = new Set(seen);
  const [filter, setFilter] = useState<Discipline | "all">("all");
  const [selected, setSelected] = useState<ConceptId | null>(null);

  const visible = CONCEPT_ORDER.filter((id) => filter === "all" || CONCEPTS[id].discipline === filter);
  const modalRef = useModal(open, onClose);

  if (!open) return null;

  const active = selected && unlocked.has(selected) ? CONCEPTS[selected] : null;
  const activeDiscipline = active ? DISCIPLINES[active.discipline] : null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="screen-veil absolute inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-title"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-deck/95 px-4">
        <div className="flex items-center gap-2.5">
          <BookOpen size={15} className="text-cool" />
          <div>
            <div
              id="codex-title"
              className="font-display text-[12px] uppercase tracking-[0.2em] text-[#d8dee3]"
            >
              Operations codex
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-ash/55">
              {unlocked.size} of {CONCEPT_ORDER.length} concepts demonstrated
            </div>
          </div>
        </div>
        <button onClick={onClose} className="tool-button -mr-4 h-12" aria-label="Close codex">
          <X size={15} />
        </button>
      </div>

      {/* discipline filter */}
      <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-line bg-deck/80">
        {(["all", ...Object.keys(DISCIPLINES)] as (Discipline | "all")[]).map((key) => {
          const isActive = filter === key;
          const label = key === "all" ? "All" : DISCIPLINES[key as Discipline].label;
          const color = key === "all" ? "#d8dee3" : DISCIPLINES[key as Discipline].color;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              aria-pressed={isActive}
              className={cn(
                "relative whitespace-nowrap border-r border-line px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition",
                isActive ? "bg-white/[0.04] text-[#d8dee3]" : "text-ash hover:text-[#d8dee3]",
              )}
            >
              {label}
              {isActive && (
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px]"
                  style={{ background: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* index */}
        <div className="min-h-0 overflow-y-auto border-b border-line bg-black/20 lg:border-b-0 lg:border-r">
          <ol>
            {visible.map((id, index) => {
              const concept = CONCEPTS[id];
              const discipline = DISCIPLINES[concept.discipline];
              const isUnlocked = unlocked.has(id);
              const isSelected = selected === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => isUnlocked && setSelected(id)}
                    disabled={!isUnlocked}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-line/50 px-4 py-2.5 text-left transition",
                      isUnlocked
                        ? "hover:bg-white/[0.03]"
                        : "cursor-not-allowed opacity-40",
                      isSelected && "bg-white/[0.05]",
                    )}
                  >
                    <span className="w-5 shrink-0 text-[9px] tabular-nums text-ash/40">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="h-1.5 w-1.5 shrink-0"
                      style={{ background: isUnlocked ? discipline.color : "transparent",
                        border: isUnlocked ? "none" : "1px solid #83909b66" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate font-display text-[12px] uppercase tracking-[0.1em]",
                          isUnlocked ? "text-[#d8dee3]" : "text-ash",
                        )}
                      >
                        {isUnlocked ? concept.term : "Locked"}
                      </span>
                      <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-ash/50">
                        {isUnlocked ? discipline.label : "Encounter this in play"}
                      </span>
                    </span>
                    {!isUnlocked && <Lock size={11} className="shrink-0 text-ash/40" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* reader */}
        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          {!active ? (
            <div className="flex h-full flex-col items-start justify-center">
              <div className="max-w-md">
                <div className="section-label">Reference</div>
                <p className="mt-3 text-[12px] leading-6 text-ash">
                  Entries unlock as your floor demonstrates them. Build a rack cluster and the
                  airflow entry opens; overload the bus and you unlock capacity planning.
                </p>
                <p className="mt-3 text-[11px] leading-5 text-ash/65">
                  This lab uses simplified teaching rules. Its stress and power ratios are
                  game values, not engineering measurements or facility certification.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
                  {(Object.keys(DISCIPLINES) as Discipline[]).map((key) => {
                    const total = CONCEPT_ORDER.filter(
                      (id) => CONCEPTS[id].discipline === key,
                    ).length;
                    const got = CONCEPT_ORDER.filter(
                      (id) => CONCEPTS[id].discipline === key && unlocked.has(id),
                    ).length;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5"
                          style={{ background: DISCIPLINES[key].color }}
                        />
                        <span className="text-[10px] uppercase tracking-[0.14em] text-ash">
                          {DISCIPLINES[key].label}
                        </span>
                        <span className="font-display text-[11px] tabular-nums text-ash/60">
                          {got}/{total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <article className="anim-slidein max-w-2xl">
              <div
                className="text-[9px] uppercase tracking-[0.24em]"
                style={{ color: activeDiscipline?.color }}
              >
                {activeDiscipline?.label}
              </div>
              <h2 className="mt-2 font-display text-[clamp(1.9rem,5vw,3.2rem)] font-bold uppercase leading-[0.9] tracking-[-0.03em] text-[#e0e3df]">
                {active.term}
              </h2>
              {active.sub && (
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ash/70">
                  {active.sub}
                </div>
              )}
              <p
                className="mt-4 border-l-2 pl-3 text-[13px] leading-6 text-[#d8dee3]"
                style={{ borderColor: activeDiscipline?.color }}
              >
                {active.headline}
              </p>

              <div className="mt-6">
                <div className="section-label mb-2">On your floor</div>
                <p className="text-[11px] leading-5 text-ash">{active.inGame}</p>
              </div>

              <div className="mt-6">
                <div className="section-label mb-2">In practice</div>
                <div className="space-y-3">
                  {active.real.map((paragraph, index) => (
                    <p key={index} className="text-[12px] leading-6 text-ash">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {active.figures && (
                <div className="mt-6">
                  <div className="section-label mb-2">Reference examples</div>
                  <dl className="border-t border-line">
                    {active.figures.map((figure) => (
                      <div
                        key={figure.label}
                        className="flex items-baseline justify-between gap-6 border-b border-line/50 py-2"
                      >
                        <dt className="text-[11px] text-ash/75">{figure.label}</dt>
                        <dd
                          className="m-0 whitespace-nowrap font-display text-[13px] tabular-nums"
                          style={{ color: activeDiscipline?.color }}
                        >
                          {figure.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {active.check && (
                <div className="mt-6 border-t border-line pt-4">
                  <div className="section-label mb-2">Recall</div>
                  <p className="text-[12px] leading-5 text-[#d8dee3]">{active.check.q}</p>
                  <p className="mt-2 border-l-2 border-ok/60 pl-3 text-[11px] leading-5 text-ash">
                    <b className="text-ok">{active.check.options[active.check.answer]}.</b>{" "}
                    {active.check.why}
                  </p>
                </div>
              )}
              {active.sources && (
                <div className="mt-6 border-t border-line pt-4">
                  <div className="section-label mb-2">Further reading</div>
                  {active.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block py-2 text-xs text-cool underline">{source.label}</a>)}
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

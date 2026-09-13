import { useState } from "react";
import { useModal } from "./useModal";
import { ArrowRight, BookOpen, Check, X } from "lucide-react";
import { CONCEPTS, DISCIPLINES, type ConceptId } from "../game/curriculum";
import { cn } from "../utils/cn";

/**
 * Just-in-time teaching moment. Fires the first time the player's own floor
 * demonstrates a concept, pauses the run, and offers an optional check.
 */
export function ConceptCard({
  id,
  onDismiss,
}: {
  id: ConceptId;
  onDismiss: () => void;
}) {
  const concept = CONCEPTS[id];
  const discipline = DISCIPLINES[concept.discipline];
  const [picked, setPicked] = useState<number | null>(null);
  const modalRef = useModal(true, onDismiss);

  const correct = picked !== null && concept.check && picked === concept.check.answer;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="screen-veil grain absolute inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-title"
    >
      <div className="anim-slidein mx-auto flex min-h-full w-full max-w-[860px] flex-col justify-center">
        <div className="border-y border-line bg-black/25">
          {/* header */}
          <div
            className="flex items-center justify-between border-b px-4 py-2.5 sm:px-6"
            style={{ borderColor: `${discipline.color}55` }}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={13} style={{ color: discipline.color }} />
              <span
                className="text-[9px] uppercase tracking-[0.24em]"
                style={{ color: discipline.color }}
              >
                {discipline.label} / Concept unlocked
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-ash transition hover:text-[#d8dee3]"
              aria-label="Dismiss and resume"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <h2
              id="concept-title"
              className="font-display text-[clamp(1.8rem,5vw,3rem)] font-bold uppercase leading-[0.9] tracking-[-0.03em] text-[#e0e3df]"
            >
              {concept.term}
            </h2>
            {concept.sub && (
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ash/70">
                {concept.sub}
              </div>
            )}

            <p
              className="mt-4 border-l-2 pl-3 text-[13px] leading-6 text-[#d8dee3]"
              style={{ borderColor: discipline.color }}
            >
              {concept.headline}
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section>
                <div className="section-label mb-2">On your floor</div>
                <p className="text-[11px] leading-5 text-ash">{concept.inGame}</p>

                {concept.figures && (
                  <dl className="mt-4 border-t border-line">
                    {concept.figures.map((figure) => (
                      <div
                        key={figure.label}
                        className="flex items-baseline justify-between gap-4 border-b border-line/50 py-1.5"
                      >
                        <dt className="text-[10px] text-ash/70">{figure.label}</dt>
                        <dd
                          className="m-0 whitespace-nowrap font-display text-[12px] tabular-nums"
                          style={{ color: discipline.color }}
                        >
                          {figure.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section>
                <div className="section-label mb-2">In practice</div>
                <div className="space-y-2.5">
                  {concept.real.map((paragraph, index) => (
                    <p key={index} className="text-[11px] leading-5 text-ash">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            </div>

            {/* retrieval practice */}
            {concept.check && (
              <section className="mt-6 border-t border-line pt-4">
                <div className="section-label mb-2">Check your understanding</div>
                <p className="text-[12px] leading-5 text-[#d8dee3]">{concept.check.q}</p>
                <div className="mt-3 grid gap-1.5">
                  {concept.check.options.map((option, index) => {
                    const isAnswer = index === concept.check!.answer;
                    const chosen = picked === index;
                    const revealed = picked !== null;
                    return (
                      <button
                        key={option}
                        onClick={() => picked === null && setPicked(index)}
                        disabled={revealed}
                        className={cn(
                          "flex items-center gap-2.5 border px-3 py-2 text-left text-[11px] transition",
                          !revealed && "border-line text-ash hover:border-ash/70 hover:text-[#d8dee3]",
                          revealed && isAnswer && "border-ok bg-ok/[0.08] text-ok",
                          revealed && chosen && !isAnswer && "border-alarm bg-alarm/[0.08] text-alarm",
                          revealed && !chosen && !isAnswer && "border-line/40 text-ash/40",
                        )}
                      >
                        <span className="font-display text-[10px] tabular-nums opacity-60">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {revealed && isAnswer && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
                {picked !== null && (
                  <p
                    className={cn(
                      "anim-slidein mt-3 border-l-2 pl-3 text-[11px] leading-5",
                      correct ? "border-ok text-ok/90" : "border-power text-ash",
                    )}
                  >
                    <b className="uppercase tracking-[0.14em]">
                      {correct ? "Correct. " : "Not quite. "}
                    </b>
                    {concept.check.why}
                  </p>
                )}
              </section>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-6">
            <span className="hidden text-[9px] uppercase tracking-[0.16em] text-ash/50 sm:block">
              Saved to codex / simulation held
            </span>
            <button onClick={onDismiss} className="action-primary min-w-[200px]">
              <span>Resume shift</span>
              <span className="flex items-center gap-2 text-[10px] tracking-[0.08em]">
                <ArrowRight size={15} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

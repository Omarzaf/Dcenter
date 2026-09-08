import { Award } from "lucide-react";
import { ACHIEVEMENTS, type AchievementId } from "../game/types";

export function AchievementToast({ id }: { id: AchievementId | null }) {
  if (!id) return null;
  const a = ACHIEVEMENTS[id];
  return (
    <div className="anim-slidein pointer-events-none absolute right-0 top-14 z-30 flex w-[min(360px,calc(100%_-_1rem))] border-y border-l border-power/55 bg-deck/95 backdrop-blur">
      <span className="flex w-12 shrink-0 items-center justify-center border-r border-power/35 text-power">
        <Award size={17} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="text-[8px] uppercase tracking-[0.24em] text-power/75">Directive complete</div>
        <div className="mt-0.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[#d8dee3]">
          {a.label}
        </div>
        <div className="mt-0.5 text-[9px] text-ash/70">{a.desc} / +250</div>
      </div>
    </div>
  );
}

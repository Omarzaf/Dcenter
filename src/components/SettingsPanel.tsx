import { Eye, GraduationCap, Volume2, VolumeX, X } from "lucide-react";
import { useModal } from "./useModal";
import type { PublicSettings } from "../game/types";

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: PublicSettings;
  onChange: (next: PublicSettings) => void;
}) {
  const draft = settings;
  const modalRef = useModal(open, onClose);

  if (!open) return null;

  const apply = (next: PublicSettings) => {
    onChange(next);
  };

  const palettes = [
    { id: "classic" as const, label: "Classic", colors: ["#69a6d7", "#d6a243", "#d9544f"] },
    { id: "deuteranopia" as const, label: "Deuteranopia", colors: ["#1260a0", "#e6c83c", "#f05a3c"] },
    { id: "tritanopia" as const, label: "Tritanopia", colors: ["#501660", "#a81c84", "#e0503c"] },
  ];

  return (
    <>
      <div className="veil-backdrop absolute inset-0 z-30" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="anim-slidein pointer-events-auto absolute inset-y-0 right-0 z-40 flex w-[min(330px,90vw)] flex-col overflow-y-auto border-l border-line bg-deck/95 backdrop-blur-md"
      >
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <div>
            <div
              id="settings-title"
              className="font-display text-[11px] uppercase tracking-[0.2em] text-[#d8dee3]"
            >
              Console settings
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-ash/55">
              Station 07 / local
            </div>
          </div>
          <button
            onClick={onClose}
            className="tool-button -mr-4"
            aria-label="Close settings"
          >
            <X size={15} />
          </button>
        </div>

      <div className="px-4 py-5">
        <button
          onClick={() => apply({ ...draft, muted: !draft.muted })}
          aria-pressed={!draft.muted}
          className="flex w-full items-center justify-between border-y border-line py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ash">
            {draft.muted ? <VolumeX size={13} /> : <Volume2 size={13} className="text-cool" />}
            Audio output
          </span>
          <span className="font-display text-[11px] tracking-[0.14em] text-[#d8dee3]">
            {draft.muted ? "MUTED" : "ACTIVE"}
          </span>
        </button>

        <button
          onClick={() => apply({ ...draft, learnMode: !draft.learnMode })}
          aria-pressed={draft.learnMode}
          className="flex w-full items-start justify-between gap-3 border-b border-line py-3 text-left"
        >
          <span>
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ash">
              <GraduationCap size={13} className={draft.learnMode ? "text-cool" : ""} />
              Learn mode
            </span>
            <span className="mt-1 block text-[9px] leading-4 text-ash/55">
              Pause and explain a concept the first time your floor demonstrates it. Entries
              still unlock in the codex either way.
            </span>
          </span>
          <span className="shrink-0 pt-0.5 font-display text-[11px] tracking-[0.14em] text-[#d8dee3]">
            {draft.learnMode ? "ON" : "OFF"}
          </span>
        </button>

        <div className="border-b border-line py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ash">
              <Eye size={13} className="text-cool" /> Motion response
            </span>
            <span className="font-display text-[12px] tabular-nums text-[#d8dee3]">
              {Math.round(draft.shake * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.shake}
            onChange={(event) => apply({ ...draft, shake: Number(event.target.value) })}
            className="range-slider"
            aria-label="Motion response intensity"
            aria-valuetext={`${Math.round(draft.shake * 100)} percent`}
          />
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.15em] text-ash/50">
            <span>Still</span>
            <span>Full response</span>
          </div>
        </div>

        <fieldset className="border-b border-line py-4">
          <legend className="mb-2 text-[10px] uppercase tracking-[0.16em] text-ash">
            Thermal palette
          </legend>
          {palettes.map((palette) => {
            const active = draft.palette === palette.id;
            return (
              <button
                type="button"
                key={palette.id}
                onClick={() => apply({ ...draft, palette: palette.id })}
                aria-pressed={active}
                className="flex w-full items-center border-t border-line/50 py-2.5 text-left last:border-b"
              >
                <span
                  className="mr-3 h-2 w-2 border border-ash/40"
                  style={{ background: active ? "#78c8c0" : "transparent" }}
                />
                <span className="flex-1 font-display text-[11px] uppercase tracking-[0.12em] text-[#c8cfd4]">
                  {palette.label}
                </span>
                <span className="flex h-2 w-14 overflow-hidden">
                  {palette.colors.map((color) => (
                    <span key={color} className="flex-1" style={{ background: color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </fieldset>

          <p className="mt-4 text-[9px] leading-4 text-ash/55">
            Configuration is stored on this device. Reduced-motion system preferences are respected
            automatically.
          </p>
        </div>
      </div>
    </>
  );
}

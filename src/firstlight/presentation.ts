import type { CameraView, TimeMode } from "./types";

export const PRESENTATION_KEY = "core.firstlight.presentation.v1";
export interface PresentationSettings {
  cameraView: CameraView;
  timeMode: TimeMode;
  reducedMotion: boolean | null;
}
export const DEFAULT_PRESENTATION: PresentationSettings = {
  cameraView: "campus",
  timeMode: "cycle",
  reducedMotion: null,
};

export function loadPresentation(): PresentationSettings {
  try {
    const raw = localStorage.getItem(PRESENTATION_KEY);
    if (!raw || raw.length > 1000) return { ...DEFAULT_PRESENTATION };
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { ...DEFAULT_PRESENTATION };
    const saved = data as Record<string, unknown>;
    return {
      cameraView:
        saved.cameraView === "hall" || saved.cameraView === "plant"
          ? saved.cameraView
          : "campus",
      timeMode:
        saved.timeMode === "day" || saved.timeMode === "night"
          ? saved.timeMode
          : "cycle",
      reducedMotion:
        typeof saved.reducedMotion === "boolean" ? saved.reducedMotion : null,
    };
  } catch {
    return { ...DEFAULT_PRESENTATION };
  }
}

export function savePresentation(settings: PresentationSettings): void {
  try {
    localStorage.setItem(PRESENTATION_KEY, JSON.stringify(settings));
  } catch {
    /* Preferences are optional when storage is unavailable. */
  }
}

export function formatSiteTime(hour: number): string {
  const minutes = ((Math.floor(hour * 60) % 1440) + 1440) % 1440;
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

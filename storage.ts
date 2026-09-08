export interface ScoreEntry {
  score: number;
  data: number;
  time: number;
  phase: number;
  pods: number;
  tag: string;
  date: number;
}

const KEY = "dcb.highscores.v1";
const MAX = 8;

function sanitize(raw: string): ScoreEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.score === "number")
      .slice(0, MAX)
      .map((e) => ({
        score: Math.max(0, Math.floor(e.score)),
        data: Number(e.data) || 0,
        time: Number(e.time) || 0,
        phase: Number(e.phase) || 1,
        pods: Number(e.pods) || 0,
        tag: String(e.tag || "OPS").slice(0, 3).toUpperCase(),
        date: Number(e.date) || Date.now(),
      }));
  } catch {
    return [];
  }
}

export function loadScores(): ScoreEntry[] {
  if (typeof localStorage === "undefined") return [];
  return sanitize(localStorage.getItem(KEY) || "[]");
}

const SKEY = "dcb.settings.v1";
export interface PersistedSettings {
  muted?: boolean;
  shake?: number;
  palette?: "classic" | "deuteranopia" | "tritanopia";
}
export function loadSettings(): PersistedSettings {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SKEY) || "{}") as PersistedSettings;
  } catch {
    return {};
  }
}
export function saveSettings(s: PersistedSettings) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch {
    /* ignored */
  }
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const next = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked - keep in-memory only */
  }
  return next;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function formatScore(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

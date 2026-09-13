import { CONCEPT_ORDER, type ConceptId } from "./curriculum";

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

function read(key: string): string | null {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
}

function write(key: string, value: unknown): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function sanitize(raw: string): ScoreEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is Record<string, unknown> => record(e) && typeof e.score === "number" && Number.isFinite(e.score))
      .map((e) => ({
        score: Math.floor(finite(e.score)),
        data: finite(e.data),
        time: finite(e.time),
        phase: Math.max(1, Math.floor(finite(e.phase, 1))),
        pods: Math.floor(finite(e.pods)),
        tag: (typeof e.tag === "string" ? e.tag.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) : "") || "OPS",
        date: finite(e.date),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function loadScores(): ScoreEntry[] {
  return sanitize(read(KEY) || "[]");
}

const SKEY = "dcb.settings.v1";
export interface PersistedSettings {
  muted?: boolean;
  shake?: number;
  palette?: "classic" | "deuteranopia" | "tritanopia";
  learnMode?: boolean;
}

/* --- codex progress ------------------------------------------------ */

const CKEY = "dcb.codex.v1";

export function loadCodex(): ConceptId[] {
  try {
    const parsed: unknown = JSON.parse(read(CKEY) || "[]");
    return Array.isArray(parsed) ? CONCEPT_ORDER.filter((id) => parsed.includes(id)) : [];
  } catch {
    return [];
  }
}

export function saveCodex(ids: string[]) {
  return write(CKEY, CONCEPT_ORDER.filter((id) => ids.includes(id)));
}
export function loadSettings(): PersistedSettings {
  try {
    const parsed: unknown = JSON.parse(read(SKEY) || "{}");
    if (!record(parsed)) return {};
    const result: PersistedSettings = {};
    if (typeof parsed.muted === "boolean") result.muted = parsed.muted;
    if (typeof parsed.learnMode === "boolean") result.learnMode = parsed.learnMode;
    if (typeof parsed.shake === "number" && Number.isFinite(parsed.shake)) result.shake = Math.max(0, Math.min(1, parsed.shake));
    if (parsed.palette === "classic" || parsed.palette === "deuteranopia" || parsed.palette === "tritanopia") result.palette = parsed.palette;
    return result;
  } catch {
    return {};
  }
}
export function saveSettings(s: PersistedSettings) {
  return write(SKEY, s);
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const next = sanitize(JSON.stringify([...loadScores(), entry]));
  write(KEY, next);
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

import { createMission, validateMission } from "./model";
import { startDialogue, validateDialogue, type Dialogue } from "./narrative";
import type { MissionState } from "./types";

export const SAVE_KEY = "core.firstlight.v1";
export interface Session {
  mission: MissionState;
  dialogue: Dialogue;
}
export function freshSession(): Session {
  const mission = createMission();
  return { mission, dialogue: startDialogue(mission.stage) };
}
export function decodeSession(raw: string): Session | null {
  if (raw.length > 200_000) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1 ||
      !("mission" in data)
    )
      return null;
    const mission = validateMission(data.mission);
    if (!mission) return null;
    const dialogue =
      "dialogue" in data
        ? validateDialogue(data.dialogue, mission.stage)
        : null;
    return { mission, dialogue: dialogue ?? startDialogue(mission.stage) };
  } catch {
    return null;
  }
}
export function encodeSession(session: Session): string {
  return JSON.stringify({ version: 1, ...session });
}
export function loadSession(): { session: Session; notice: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { session: freshSession(), notice: "" };
    const session = decodeSession(raw);
    return session
      ? { session, notice: "" }
      : {
          session: freshSession(),
          notice:
            "The saved chapter could not be read. A new mission is available; your earlier prototype saves are separate.",
        };
  } catch {
    return {
      session: freshSession(),
      notice:
        "Storage is unavailable. You can play and export your progress from the pause menu.",
    };
  }
}

import { validateCampaign } from "./model.ts";
import type { CampaignState } from "./types.ts";

export const CAMPAIGN_SAVE_KEY = "core.campaign.v1";
export function encodeCampaign(state: CampaignState): string {
  const valid = validateCampaign(state);
  if (!valid) throw new Error("Only a validated campaign can be exported.");
  return JSON.stringify(valid);
}
export function decodeCampaign(raw: string): CampaignState | null {
  if (typeof raw !== "string" || raw.length > 100_000) return null;
  try {
    return validateCampaign(JSON.parse(raw));
  } catch {
    return null;
  }
}
export function loadCampaign(): {
  state: CampaignState | null;
  notice: string;
} {
  try {
    const raw = localStorage.getItem(CAMPAIGN_SAVE_KEY);
    if (!raw) return { state: null, notice: "" };
    const state = decodeCampaign(raw);
    return state
      ? { state, notice: "" }
      : {
          state: null,
          notice:
            "The saved campaign could not be validated. Your First Light and earlier prototype saves are separate.",
        };
  } catch {
    return {
      state: null,
      notice:
        "Campaign storage is unavailable. Export progress to keep it after this session.",
    };
  }
}
export function saveCampaign(state: CampaignState): boolean {
  try {
    localStorage.setItem(CAMPAIGN_SAVE_KEY, encodeCampaign(state));
    return true;
  } catch {
    return false;
  }
}

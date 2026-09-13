import { Story } from "inkjs";
import storyContent from "./story.json";
import type { MissionStage } from "./types";

export interface Dialogue {
  stage: MissionStage;
  lines: string[];
  choices: { index: number; text: string }[];
  ink: string;
}

const STAGES: MissionStage[] = [
  "arrival",
  "survey",
  "placement",
  "power",
  "cooling",
  "network",
  "commissioning",
  "fault",
  "retest",
  "handover",
  "reflection",
  "expansion",
  "complete",
];

function stageStory(stage: MissionStage, soughtExplanation: boolean): Story {
  const story = new Story(storyContent);
  // This chapter has no narrative randomness. A stable seed makes saves exactly
  // comparable to the small set of authored, reachable dialogue states.
  story.state.storySeed = 42;
  story.variablesState.$("sought_explanation", soughtExplanation);
  story.ChoosePathString(stage);
  return story;
}

function collect(story: Story, stage: MissionStage): Dialogue {
  const lines: string[] = [];
  let guard = 0;
  while (story.canContinue && guard++ < 50) {
    const line = story.Continue()?.trim();
    if (line) lines.push(line);
  }
  return {
    stage,
    lines,
    choices: story.currentChoices.map(({ index, text }) => ({ index, text })),
    ink: story.state.ToJson(),
  };
}

export function startDialogue(
  stage: MissionStage,
  previous?: Dialogue,
): Dialogue {
  let soughtExplanation = false;
  const validPrevious = previous
    ? validateDialogue(previous, previous.stage)
    : null;
  if (validPrevious) {
    const prior = new Story(storyContent);
    prior.state.LoadJson(validPrevious.ink);
    soughtExplanation = prior.variablesState.$("sought_explanation") === true;
  }
  // Carry only the supported boolean across stages, never arbitrary execution
  // pointers, visit counts, output buffers, or choices from an imported save.
  return collect(stageStory(stage, soughtExplanation), stage);
}

export function chooseDialogue(dialogue: Dialogue, index: number): Dialogue {
  const canonical = validateDialogue(dialogue, dialogue.stage);
  if (!canonical) return startDialogue(dialogue.stage);
  if (
    !Number.isInteger(index) ||
    !canonical.choices.some((choice) => choice.index === index)
  )
    return canonical;
  const story = new Story(storyContent);
  story.state.LoadJson(canonical.ink);
  story.ChooseChoiceIndex(index);
  return collect(story, dialogue.stage);
}

export function validateDialogue(
  value: unknown,
  stage: MissionStage,
): Dialogue | null {
  if (!value || typeof value !== "object" || !STAGES.includes(stage))
    return null;
  const data = value as Record<string, unknown>;
  if (
    data.stage !== stage ||
    typeof data.ink !== "string" ||
    data.ink.length > 100_000 ||
    !Array.isArray(data.lines) ||
    data.lines.length > 8 ||
    !data.lines.every((line) => typeof line === "string" && line.length < 2000)
  )
    return null;
  // Do not load an untrusted Ink snapshot to discover what it claims to be.
  // Each stage permits only its briefing or one of its terminating help branches,
  // under either value of the single retained explanation-memory flag.
  for (const soughtExplanation of [false, true]) {
    const base = collect(stageStory(stage, soughtExplanation), stage);
    const candidates = [base];
    for (const choice of base.choices) {
      const branch = new Story(storyContent);
      branch.state.LoadJson(base.ink);
      branch.ChooseChoiceIndex(choice.index);
      candidates.push(collect(branch, stage));
    }
    for (const candidate of candidates) {
      if (
        candidate.ink === data.ink &&
        JSON.stringify(candidate.lines) === JSON.stringify(data.lines)
      )
        return candidate;
    }
  }
  return null;
}

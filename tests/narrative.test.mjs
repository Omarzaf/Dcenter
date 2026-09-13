import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Story } from "inkjs";
import { Compiler } from "inkjs/full";
const source = readFileSync(
  new URL("../src/firstlight/firstLight.ink", import.meta.url),
  "utf8",
);
const content = JSON.parse(
  readFileSync(
    new URL("../src/firstlight/story.json", import.meta.url),
    "utf8",
  ),
);
const stages = [
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
function read(story) {
  let text = "";
  let count = 0;
  while (story.canContinue) {
    assert.ok(count++ < 30, "narrative terminates");
    text += story.Continue();
  }
  return text;
}

test("compiled chapter matches the authored source", () => {
  assert.deepEqual(
    JSON.parse(new Compiler(source).Compile().ToJson()),
    content,
  );
});

test("every mission stage has a reachable briefing and all help branches terminate", () => {
  for (const stage of stages) {
    const story = new Story(content);
    story.ChoosePathString(stage);
    assert.ok(read(story).trim().length > 20, stage);
    const choices = story.currentChoices.map((choice) => choice.index);
    const checkpoint = story.state.ToJson();
    for (const index of choices) {
      const branch = new Story(content);
      branch.state.LoadJson(checkpoint);
      branch.ChooseChoiceIndex(index);
      assert.ok(read(branch).trim().length > 20, `${stage}:${index}`);
      assert.equal(branch.currentChoices.length, 0);
    }
  }
});

test("pending mentor choices and explanation memory survive save restoration", () => {
  const first = new Story(content);
  first.ChoosePathString("survey");
  read(first);
  const restored = new Story(content);
  restored.state.LoadJson(first.state.ToJson());
  assert.deepEqual(
    restored.currentChoices.map((choice) => choice.text),
    first.currentChoices.map((choice) => choice.text),
  );
  restored.ChooseChoiceIndex(0);
  read(restored);
  const ending = new Story(content);
  ending.state.LoadJson(restored.state.ToJson());
  ending.ChoosePathString("complete");
  assert.match(read(ending), /kept asking/);
  const independent = new Story(content);
  independent.ChoosePathString("complete");
  assert.match(read(independent), /traced the connections/);
});

test("cooling fault narrative protects the customer and explains correction before retest", () => {
  const story = new Story(content);
  story.ChoosePathString("fault");
  assert.match(read(story), /test stopped before customer handover/);
  story.ChoosePathString("retest");
  assert.match(read(story), /Run the same acceptance test again/);
  story.ChoosePathString("expansion");
  assert.match(read(story), /working rack is unaffected/);
});

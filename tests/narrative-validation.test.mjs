import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Compile the production wrappers in memory: Node cannot directly import their
// bundler-style extensionless TS and JSON imports. No shared output is written.
const compiled = new Map();
function loadProduction(file) {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../src/firstlight', file);
  if (compiled.has(path)) return compiled.get(path).exports;
  const module = { exports: {} };
  compiled.set(path, module);
  const nativeRequire = createRequire(path);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: path,
  }).outputText;
  const require = (specifier) => specifier.startsWith('./') && !specifier.endsWith('.json')
    ? loadProduction(specifier.endsWith('.ts') ? specifier : `${specifier}.ts`)
    : nativeRequire(specifier);
  new Function('exports', 'require', 'module', '__filename', '__dirname', source)(module.exports, require, module, path, dirname(path));
  return module.exports;
}

const { startDialogue, chooseDialogue, validateDialogue } = loadProduction('narrative.ts');
const { freshSession, encodeSession, decodeSession } = loadProduction('persistence.ts');
const { createMission, transition } = loadProduction('model.ts');
const STAGES = ['arrival', 'survey', 'placement', 'power', 'cooling', 'network', 'commissioning', 'fault', 'retest', 'handover', 'reflection', 'expansion', 'complete'];

test('canonical briefings and every help branch survive validation and restore pending choices', () => {
  const explained = chooseDialogue(startDialogue('survey'), 0);
  for (const previous of [undefined, explained]) for (const stage of STAGES) {
    const briefing = startDialogue(stage, previous);
    assert.deepEqual(validateDialogue(JSON.parse(JSON.stringify(briefing)), stage), briefing);
    for (const choice of briefing.choices) {
      const branch = chooseDialogue(briefing, choice.index);
      assert.deepEqual(validateDialogue(JSON.parse(JSON.stringify(branch)), stage), branch);
      assert.equal(branch.choices.length, 0);
    }
  }
});

test('returning to a briefing retains only legitimate explanation memory and remains canonical', () => {
  const original = startDialogue('survey');
  const explanation = chooseDialogue(original, 0);
  const back = startDialogue('survey', explanation);
  assert.equal(back.choices.length, original.choices.length);
  assert.deepEqual(validateDialogue(back, 'survey'), back);
  const ending = startDialogue('complete', back);
  assert.match(ending.lines.join(' '), /kept asking/);
  assert.match(startDialogue('complete').lines.join(' '), /traced the connections/);
  assert.deepEqual(startDialogue('survey'), original, 'time and other Story instances cannot reroll the snapshot');
});

test('wrong-stage Ink, invented text, altered execution state and oversized payloads are rejected', () => {
  const survey = startDialogue('survey');
  const ending = startDialogue('complete');
  const forged = [
    { ...ending, stage: 'survey', lines: ['All tests have passed. Bring customer service online.'] },
    { ...survey, ink: ending.ink },
    { ...survey, lines: ['The rack is already online.'] },
    { ...survey, stage: 'complete' },
    { ...survey, ink: '{broken' },
    { ...survey, ink: 'x'.repeat(100001) },
    { ...survey, lines: Array(9).fill('line') },
    { ...survey, lines: ['x'.repeat(2000)] },
    { ...survey, ink: JSON.stringify({ ...JSON.parse(survey.ink), storySeed: 99 }) },
  ];
  for (const value of forged) assert.equal(validateDialogue(value, 'survey'), null);
  for (const value of [null, undefined, {}, [], 'dialogue']) assert.equal(validateDialogue(value, 'survey'), null);
  assert.equal(validateDialogue(survey, 'missing-stage'), null);
  const repairedChoices = validateDialogue({ ...survey, choices: [{ index: 999, text: 'Skip all checks' }] }, 'survey');
  assert.deepEqual(repairedChoices.choices, survey.choices, 'saved choice labels and indices never override authored choices');
});

test('bad dialogue resets only guidance while preserving the validated mission and resources', () => {
  const mission = transition(createMission(), { type: 'enter' }).state;
  const incompatible = {
    ...startDialogue('complete'), stage: 'survey',
    lines: ['Customer service is online; the inspection is optional.'],
  };
  const restored = decodeSession(JSON.stringify({ version: 1, mission, dialogue: incompatible }));
  assert.deepEqual(restored.mission, mission);
  assert.deepEqual(restored.dialogue, startDialogue('survey'));
  assert.equal(restored.mission.serviceOnline, false);
  assert.equal(restored.mission.budget, 50);
  assert.deepEqual(decodeSession(encodeSession(freshSession())), freshSession());
});

test('invalid choice requests cannot grant memory, corrupt guidance, or mutate a saved briefing', () => {
  const original = startDialogue('survey');
  const snapshot = structuredClone(original);
  Object.freeze(original.lines); Object.freeze(original.choices); Object.freeze(original);
  for (const index of [-1, 1000, 0.5, NaN, Infinity, '0']) assert.deepEqual(chooseDialogue(original, index), original);
  chooseDialogue(original, 0);
  assert.deepEqual(original, snapshot);
  const invalid = { ...original, lines: ['Pretend all checks passed.'] };
  assert.deepEqual(chooseDialogue(invalid, 0), startDialogue('survey'));
  assert.match(startDialogue('complete', invalid).lines.join(' '), /traced the connections/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');

// The runner supplies a temporary CommonJS compilation; no production dependency is needed.
const compiled = process.env.ARCADE_TEST_BUILD;
if (!compiled) throw new Error('Set ARCADE_TEST_BUILD to the compiled src/game directory.');
const { Engine } = require(join(compiled, 'engine.js'));
const storage = require(join(compiled, 'storage.js'));
const { CONCEPTS, pueBand } = require(join(compiled, 'curriculum.js'));

function engine() {
  const canvas = { getContext: () => ({}), focus() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const result = new Engine(canvas);
  result.reset();
  result.state = 'running';
  return result;
}

function key(target, value) {
  return { target, key: value, prevented: false, preventDefault() { this.prevented = true; } };
}

test('Tab retains browser navigation and buttons do not trigger board shortcuts', () => {
  const e = engine();
  const tab = key(e.canvas, 'Tab');
  e.onKey(tab);
  assert.equal(tab.prevented, false);
  assert.equal(e.selected, 0);
  const button = key({ tagName: 'BUTTON' }, ' ');
  e.onKey(button);
  assert.equal(button.prevented, false);
  assert.equal(e.grid.filter((cell) => cell.unit).length, 0);
  const arrow = key(e.canvas, 'ArrowRight');
  e.onKey(arrow);
  assert.equal(arrow.prevented, true);
  assert.equal(e.cursor.x, 4);
});

test('quiz controls own confirm keys and pending lessons cannot be overwritten', () => {
  const e = engine();
  e.teach('pue');
  e.teach('tiers');
  assert.equal(e.pendingConcept, 'pue');
  assert.equal(e.seenConcepts.has('tiers'), false);
  e.onKey(key({ tagName: 'BUTTON' }, 'Enter'));
  assert.equal(e.pendingConcept, 'pue');
  e.dismissConcept();
  e.teach('tiers');
  assert.equal(e.pendingConcept, 'tiers');
});

test('silent lesson unlocks are persisted immediately and known lessons do not interrupt', () => {
  const e = engine();
  const updates = [];
  e.onConceptUnlock = (ids) => updates.push(ids);
  e.settings.learnMode = false;
  e.teach('pue');
  assert.deepEqual(updates, [['pue']]);
  assert.equal(e.state, 'running');
  e.reset();
  e.settings.learnMode = true;
  e.teach('pue');
  assert.equal(e.pendingConcept, null);
  assert.equal(updates.length, 1);
});

test('reference panels preserve running versus manually paused state', () => {
  const e = engine();
  e.setOverlayOpen(true);
  assert.equal(e.state, 'paused');
  const time = e.time;
  e.update(0.05);
  assert.equal(e.time, time);
  e.setOverlayOpen(false);
  assert.equal(e.state, 'running');
  e.togglePause();
  e.setOverlayOpen(true);
  e.setOverlayOpen(false);
  assert.equal(e.state, 'paused');
});

test('moving off a held unit cancels decommission and pausing clears a hold', () => {
  const e = engine();
  e.grid[0].unit = 'rack';
  e.hold = { i: 0, t: 0.3 };
  e.cell = 40;
  e.board = 320;
  e.onPointerMove({ clientX: 61, clientY: 20 });
  assert.equal(e.holdProgress(), 0);
  e.hold = { i: 0, t: 0.3 };
  e.togglePause();
  e.update(0.5);
  assert.equal(e.grid[0].unit, 'rack');
  assert.equal(e.holdProgress(), 0);
});

test('throttling counts elapsed affected time once, even with multiple hot pods', () => {
  const e = engine();
  e.settings.learnMode = false;
  for (const i of [0, 1, 2, 16, 17, 18]) {
    e.grid[i].unit = 'rack';
    e.grid[i].heat = 120;
  }
  e.pods = [{ key: 'first', cells: [0, 1, 2] }, { key: 'second', cells: [16, 17, 18] }];
  e.simulate(0.05);
  assert.equal(e.throttledSeconds, 0.05);
  assert.ok(e.throttledSeconds <= e.time);
});

test('an empty floor earns no score or achievements over 90 seconds, including client windfalls', (t) => {
  const e = engine();
  e.settings.learnMode = false;
  // Pick the client-bonus event at every event boundary to cover the windfall path.
  t.mock.method(Math, 'random', () => 0.999);
  for (let tick = 0; tick < 1800; tick++) e.update(0.05);
  assert.ok(e.time > 89);
  assert.ok(e.phase >= 4);
  assert.equal(e.score, 0);
  assert.equal(e.achievements.size, 0);
  assert.ok(e.log.some((line) => line.text.includes('PRODUCTIVE POD IS REQUIRED')));
  e.peakTemp = 99;
  e.coreTemp = 30;
  e.update(0.05);
  assert.equal(e.score, 0);
  assert.equal(e.achievements.has('core_99'), false);
});

test('productive pods still receive phase survival points and client bonuses', () => {
  const e = engine();
  e.settings.learnMode = false;
  for (const i of [0, 1, 2]) e.grid[i].unit = 'rack';
  e.rebuildPods();
  e.simulate(0.05);
  assert.ok(e.throughput > 0);
  const beforePhase = e.score;
  e.phaseTimer = 0;
  e.simulate(0.05);
  assert.ok(e.score - beforePhase > 400);
  assert.ok(e.log.some((line) => line.text.includes('UPTIME +400')));
  const beforeClient = e.score;
  e.evBonus();
  assert.equal(e.score - beforeClient, 400);
});

test('blocked localStorage getters never crash boot or record saving', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.deepEqual(storage.loadScores(), []);
  assert.deepEqual(storage.loadSettings(), {});
  assert.deepEqual(storage.loadCodex(), []);
  assert.equal(storage.saveSettings({ muted: true }), false);
  assert.equal(storage.saveCodex(['pue']), false);
  assert.equal(storage.saveScore({ score: 50, data: 1, time: 2, phase: 1, pods: 0, tag: 'OPS', date: 1 })[0].score, 50);
});

test('persisted settings, scores, and lessons reject malformed or unknown values', () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } });
  values.set('dcb.settings.v1', 'null');
  assert.deepEqual(storage.loadSettings(), {});
  values.set('dcb.settings.v1', JSON.stringify({ muted: 'false', learnMode: false, shake: 300, palette: 'invalid' }));
  assert.deepEqual(storage.loadSettings(), { learnMode: false, shake: 1 });
  values.set('dcb.codex.v1', JSON.stringify(['pue', 'pue', 'unknown', 9]));
  assert.deepEqual(storage.loadCodex(), ['pue']);
  values.set('dcb.highscores.v1', JSON.stringify([{ score: 9, tag: '<x>', data: -4, time: 'bad' }, { score: '10' }, { score: 90 }]));
  const scores = storage.loadScores();
  assert.deepEqual(scores.map((entry) => entry.score), [90, 9]);
  assert.equal(scores[1].tag, 'X');
  assert.equal(scores[1].data, 0);
  assert.equal(scores[1].time, 0);
});

test('Tier reference and model PUE avoid false real-world guarantees', () => {
  assert.equal(CONCEPTS.tiers.figures.some((item) => item.value.includes('%')), false);
  assert.match(CONCEPTS.tiers.real.join(' '), /removed availability predictions/);
  assert.ok(CONCEPTS.tiers.sources.length > 0);
  assert.doesNotMatch(pueBand(1.1).note, /comparable|best-in-class|hyperscale/i);
});

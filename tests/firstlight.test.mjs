import assert from 'node:assert/strict';
import test from 'node:test';
import { BAYS, createMission, missionMetrics, transition, validateMission } from '../src/firstlight/model.ts';

function commands(bay = 0, choice = 'phase') {
  return [
    { type: 'enter' }, { type: 'inspect' }, { type: 'install', bay },
    { type: 'connect', utility: 'power' }, { type: 'connect', utility: 'cooling' }, { type: 'connect', utility: 'network' },
    { type: 'test' }, { type: 'repair' }, { type: 'test' }, { type: 'activate' },
    { type: 'reflect', answer: 'controls' }, { type: 'expansion', choice },
  ];
}

function step(state, command) {
  const result = transition(state, command);
  assert.equal(result.error, undefined, JSON.stringify({ stage: state.stage, command, error: result.error }));
  assert.deepEqual(validateMission(JSON.parse(JSON.stringify(result.state))), result.state);
  return result.state;
}

function reach(stage, bay = 0, choice = 'phase') {
  let state = createMission();
  for (const command of commands(bay, choice)) {
    if (state.stage === stage) return state;
    state = step(state, command);
  }
  assert.equal(state.stage, stage);
  return state;
}

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}

test('First Light completes the full dependency, fault, repair, retest and handover journey', () => {
  const stages = ['survey', 'placement', 'power', 'cooling', 'network', 'commissioning', 'fault', 'retest', 'handover', 'reflection', 'expansion', 'complete'];
  let state = createMission();
  assert.equal(missionMetrics(state).serviceKw, 0);
  assert.equal(state.budget, 50);
  for (const [index, command] of commands().entries()) {
    state = step(state, command);
    assert.equal(state.stage, stages[index]);
    assert.equal(state.log.length, index + 1);
    assert.equal(state.log.at(-1).minute, state.timeMinutes);
    if (index < 9) {
      assert.equal(state.serviceOnline, false);
      assert.equal(missionMetrics(state).serviceKw, 0);
      assert.equal(missionMetrics(state).facilityDrawKw, 0);
    }
  }
  assert.equal(state.testRuns, 2);
  assert.equal(state.serviceOnline, true);
  assert.equal(state.controlFixed, true);
  assert.equal(state.commissioned, true);
  assert.equal(state.reflection, 'controls');
  assert.equal(state.expansionChoice, 'phase');
  assert.ok(state.budget > 0);
  assert.ok(state.timeMinutes > 0 && state.timeMinutes < 12);
  const output = missionMetrics(state);
  assert.equal(output.serviceKw, 6);
  assert.equal(output.facilityDrawKw, output.rackPowerKw + output.networkPowerKw + output.coolingPowerKw + output.distributionLossKw);
  assert.equal(output.facilityDrawKw, 8);
  assert.equal(output.pue, 1.29);
  assert.ok(output.connectedPowerKw >= output.facilityDrawKw);
  assert.ok(output.availableCoolingKw >= output.coolingDemandKw);
  assert.ok(output.networkMbps >= output.requiredNetworkMbps);
});

test('identical equipment in three bays has different routing expenses without invented thermal advantages', () => {
  const missions = BAYS.map((bay) => reach('complete', bay.id));
  assert.equal(new Set(missions.map((state) => state.budget)).size, 3);
  for (const [index, state] of missions.entries()) {
    const bay = BAYS[index];
    const connectionCost = Object.values(bay.connectionCosts).reduce((sum, cost) => sum + cost, 0);
    assert.equal(state.budget, 50 - bay.installCost - connectionCost - 2 - 4 - 4);
    assert.equal(missionMetrics(state).serviceKw, 6);
    assert.equal(missionMetrics(state).coolingDemandKw, 6.2);
    assert.deepEqual(missionMetrics(state).edges.map((edge) => edge.routeMetres), Object.values(bay.routeMetres));
  }
  assert.ok(missions[0].budget > missions[2].budget);
});

test('physical utility paths are required and no disconnected rack can provide service', () => {
  let state = reach('power');
  assert.equal(missionMetrics(state).installed, true);
  for (const utility of ['power', 'cooling', 'network']) {
    const before = missionMetrics(state);
    assert.equal(before.serviceKw, 0);
    assert.equal(before.readyForService, false);
    assert.equal(before.readyForTest, false);
    assert.ok(transition(state, { type: 'test' }).error);
    assert.ok(transition(state, { type: 'activate' }).error);
    state = step(state, { type: 'connect', utility });
    const edge = missionMetrics(state).edges.find((entry) => entry.utility === utility);
    assert.equal(edge.source, `${utility}-source`);
    assert.equal(edge.target, 'rack');
    assert.equal(edge.connected, true);
  }
  assert.equal(missionMetrics(state).allConnected, true);
  assert.equal(missionMetrics(state).readyForTest, true);
  assert.equal(missionMetrics(state).readyForService, false);
  const corruptLive = { ...reach('reflection'), connections: { power: true, cooling: false, network: true } };
  assert.equal(missionMetrics(corruptLive).serviceKw, 0);
  assert.equal(validateMission(corruptLive), null);
});

test('the deterministic control fault stops customer service and repair alone cannot bypass retesting', () => {
  const before = reach('commissioning');
  const first = step(before, { type: 'test' });
  assert.deepEqual(first, step(before, { type: 'test' }));
  assert.equal(first.stage, 'fault');
  assert.equal(first.testRuns, 1);
  const failed = missionMetrics(first);
  assert.equal(failed.lastTestLoadKw, 6);
  assert.equal(failed.facilityDrawKw, 0);
  assert.equal(failed.conditions.find((entry) => entry.id === 'cooling').status, 'failed');
  assert.equal(failed.conditions.find((entry) => entry.id === 'power').status, 'passed');
  assert.ok(transition(first, { type: 'test' }).error);
  assert.ok(transition(first, { type: 'activate' }).error);
  const repaired = step(first, { type: 'repair' });
  assert.equal(missionMetrics(repaired).readyForTest, true);
  assert.equal(missionMetrics(repaired).readyForService, false);
  assert.equal(missionMetrics(repaired).conditions.find((entry) => entry.id === 'cooling').status, 'pending');
  assert.ok(transition(repaired, { type: 'activate' }).error);
  const passed = step(repaired, { type: 'test' });
  assert.equal(missionMetrics(passed).readyForService, true);
  assert.equal(missionMetrics(passed).serviceKw, 0);
  assert.equal(passed.serviceOnline, false);
});

test('wrong explanations teach the cause without consuming resources or advancing', () => {
  const state = reach('reflection');
  for (const answer of ['more-racks', 'bandwidth']) {
    const result = transition(state, { type: 'reflect', answer });
    assert.equal(result.state, state);
    assert.match(result.error, /cooling control/i);
    assert.equal(result.state.budget, state.budget);
    assert.equal(result.state.timeMinutes, state.timeMinutes);
    assert.equal(result.state.stage, 'reflection');
  }
  assert.equal(step(state, { type: 'reflect', answer: 'controls' }).stage, 'expansion');
});

test('expansion choices record distinct commitments without silently building chapter two', () => {
  const before = reach('expansion');
  const costs = { phase: 4, reserve: 6, rush: 0 };
  for (const [choice, cost] of Object.entries(costs)) {
    const after = step(before, { type: 'expansion', choice });
    assert.equal(after.stage, 'complete');
    assert.equal(after.expansionChoice, choice);
    assert.equal(after.budget, before.budget - cost);
    assert.equal(after.bay, before.bay);
    assert.deepEqual(after.connections, before.connections);
    assert.equal(after.testRuns, 2);
    assert.equal(missionMetrics(after).serviceKw, 6);
    assert.match(after.log.at(-1).detail, /Next assignment:/);
    assert.ok(transition(after, { type: 'expansion', choice }).error);
  }
});

test('commands reject duplicate, out-of-order and malformed runtime inputs atomically', () => {
  const start = createMission();
  const malformed = [null, undefined, [], {}, { type: 'warp' }, { type: 'enter', credits: 1000 }, { type: 'install', bay: -1 }, { type: 'install', bay: 3 }, { type: 'install', bay: 1.5 }, { type: 'install', bay: '0' }, { type: 'connect', utility: '__proto__' }, { type: 'reflect', answer: 'skip' }, { type: 'expansion', choice: '__proto__' }];
  for (const command of malformed) {
    const result = transition(start, command);
    assert.ok(result.error);
    assert.equal(result.state, start);
  }
  for (const command of commands().slice(1)) assert.equal(transition(start, command).state, start);
  let state = start;
  for (const command of commands()) {
    const after = step(state, command);
    const duplicate = transition(after, command);
    assert.ok(duplicate.error);
    assert.equal(duplicate.state, after);
    state = after;
  }
});

test('every successful transition accepts frozen input and owns its changed containers', () => {
  let state = createMission();
  for (const command of commands(2, 'reserve')) {
    const snapshot = structuredClone(state);
    freeze(state);
    const next = step(state, freeze(command));
    assert.deepEqual(state, snapshot);
    assert.notEqual(next, state);
    assert.notEqual(next.connections, state.connections);
    assert.notEqual(next.log, state.log);
    state = next;
  }
});

test('save validation reconstructs every stage and rejects altered flags, money, time and causal logs', () => {
  for (const bay of BAYS) for (const choice of ['phase', 'reserve', 'rush']) {
    let state = createMission();
    assert.deepEqual(validateMission(state), state);
    for (const command of commands(bay.id, choice)) {
      state = step(state, command);
      assert.deepEqual(validateMission(JSON.parse(JSON.stringify(state))), state);
    }
  }
  const valid = reach('complete');
  const mutations = [
    (s) => { s.version = 2; }, (s) => { s.stage = 'arrival'; }, (s) => { s.bay = 2; },
    (s) => { s.inspected = false; }, (s) => { s.controlFixed = false; }, (s) => { s.commissioned = false; },
    (s) => { s.serviceOnline = false; }, (s) => { s.connections.power = false; },
    (s) => { s.connections.network = 'true'; }, (s) => { s.connections.extra = true; },
    (s) => { s.budget += 0.01; }, (s) => { s.budget = NaN; }, (s) => { s.timeMinutes = Infinity; },
    (s) => { s.timeMinutes += 0.01; }, (s) => { s.testRuns = 1; },
    (s) => { s.reflection = 'more-racks'; }, (s) => { s.expansionChoice = 'reserve'; },
    (s) => { s.log.pop(); }, (s) => { s.log[6].title = 'First test passed'; },
    (s) => { s.log[0].detail = '<script>bad()</script>'; }, (s) => { s.log[0].minute += 1; },
    (s) => { delete s.log[1]; }, (s) => { s.injected = 1; },
  ];
  for (const mutation of mutations) {
    const corrupt = structuredClone(valid);
    mutation(corrupt);
    assert.equal(validateMission(corrupt), null, mutation.toString());
    assert.ok(transition(corrupt, { type: 'enter' }).error);
  }
  for (const value of [null, [], {}, 1, 'state', { version: 1 }]) assert.equal(validateMission(value), null);
  const loaded = validateMission(valid);
  loaded.log[0].title = 'Changed locally';
  loaded.connections.power = false;
  assert.notEqual(valid.log[0].title, loaded.log[0].title);
  assert.equal(valid.connections.power, true);
});

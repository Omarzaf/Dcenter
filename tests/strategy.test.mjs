import assert from "node:assert/strict";
import test from "node:test";
import { ASSETS, SITES, SCENARIOS, UPGRADES } from "../src/strategy/content.ts";
import {
  advanceQuarter,
  assetCost,
  build,
  createGame,
  currentEvent,
  invest,
  metrics,
  previewQuarter,
  validateSave,
} from "../src/strategy/model.ts";

function expand(state) {
  for (const asset of ["compute", "compute", "cooling", "power", "network"]) {
    const result = build(state, asset, state.board.indexOf(null));
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}

function finish(state, choice = "mitigate") {
  while (state.status === "playing") {
    const result = advanceQuarter(
      state,
      currentEvent(state) ? choice : undefined,
    );
    assert.equal(result.error, undefined);
    state = result.state;
    assert.notEqual(validateSave(JSON.parse(JSON.stringify(state))), null);
  }
  return state;
}

test("starter has a finite, functioning economy and transparent capital costs", () => {
  const state = createGame("atlantic", "balanced");
  const output = metrics(state);
  assert.equal(state.board.length, 36);
  assert.equal(output.service, 100);
  assert.equal(output.demand, 8);
  assert.equal(output.compute, 12);
  assert.equal(
    output.profit,
    Number((output.revenue - output.expenses).toFixed(2)),
  );
  assert.ok(output.pue >= 1);
  assert.deepEqual(validateSave(state), state);
  for (const [asset, definition] of Object.entries(ASSETS))
    assert.equal(assetCost(state, asset), definition.cost);
});

test("actions reject invalid, occupied, unaffordable, duplicate and completed-state operations without mutation", () => {
  const state = createGame("atlantic", "balanced");
  const before = structuredClone(state);
  for (const index of [-1, 36, 1.5, NaN, Infinity])
    assert.equal(build(state, "compute", index).state, state);
  assert.ok(build(state, "compute", 14).error);
  assert.ok(build(state, "__proto__", 0).error);
  assert.equal(assetCost(state, "toString"), Infinity);
  assert.ok(build({ ...state, cash: 0 }, "compute", 0).error);
  assert.ok(invest(state, "missing").error);
  assert.ok(invest({ ...state, cash: 0 }, "efficiency").error);
  const upgraded = invest(state, "efficiency").state;
  assert.ok(invest(upgraded, "efficiency").error);
  assert.ok(build({ ...state, status: "won" }, "compute", 0).error);
  assert.ok(invest({ ...state, status: "lost" }, "efficiency").error);
  assert.ok(advanceQuarter({ ...state, status: "lost" }).error);
  assert.deepEqual(state, before);
  const built = build(state, "compute", 0).state;
  assert.equal(built.cash, state.cash - ASSETS.compute.cost);
  assert.equal(built.board[0], "compute");
  assert.notEqual(built.board, state.board);
});

test("every visible event requires an explicit response, charged once", () => {
  const start = advanceQuarter(createGame("atlantic", "balanced")).state;
  const before = structuredClone(start);
  const event = currentEvent(start);
  assert.ok(event);
  assert.ok(advanceQuarter(start).error);
  assert.ok(advanceQuarter(start, "fake").error);
  assert.ok(advanceQuarter({ ...start, cash: 0 }, "mitigate").error);
  const preview = previewQuarter(start, "mitigate");
  assert.equal(preview.error, undefined);
  const projected = metrics(preview.state);
  const completed = advanceQuarter(start, "mitigate").state;
  const record = completed.history.at(-1);
  assert.equal(
    completed.cash,
    Number((preview.state.cash + projected.profit).toFixed(2)),
  );
  assert.equal(record.service, projected.service);
  assert.equal(record.revenue, projected.revenue);
  assert.equal(record.expenses, Number((projected.expenses + 18).toFixed(2)));
  assert.equal(completed.decisions.length, 1);
  assert.equal(completed.decisions[0].cost, 18);
  assert.ok(previewQuarter(preview.state, "mitigate").error);
  assert.ok(advanceQuarter(preview.state, "accept").error);
  assert.deepEqual(start, before);
  assert.ok(advanceQuarter(completed, "accept").error);
});

test("event order is deterministic and scenario mix changes the planning problem", () => {
  const order = (scenario, seed) => {
    let state = createGame("atlantic", scenario, seed);
    const events = [];
    for (let quarter = 1; quarter <= 12; quarter++) {
      state = { ...state, quarter };
      const event = currentEvent(state);
      if (event) events.push(event.category);
      else assert.equal(quarter % 2, 1);
    }
    return events;
  };
  assert.deepEqual(order("balanced", 42), order("balanced", 42));
  assert.notDeepEqual(order("balanced", 42), order("balanced", 9));
  assert.equal(
    order("fragmentation", 42).filter((event) => event === "supply").length,
    3,
  );
  assert.equal(
    order("energy", 42).filter((event) => event === "energy").length,
    3,
  );
});

test("sites expose distinct climate, water, energy and connectivity trade-offs", () => {
  const atlantic = createGame("atlantic", "balanced");
  const nordic = createGame("nordic", "balanced");
  const strait = createGame("strait", "balanced");
  assert.ok(metrics(nordic).cooling < metrics(atlantic).cooling);
  assert.ok(metrics(nordic).expenses < metrics(atlantic).expenses);
  assert.ok(metrics(strait).water > metrics(atlantic).water);
  assert.ok(
    metrics(strait, "water").coolingCapacity <
      metrics(atlantic, "water").coolingCapacity,
  );
  const a = { ...atlantic, quarter: 12 };
  const n = { ...nordic, quarter: 12 };
  assert.ok(metrics(n, "network").service < metrics(a, "network").service);
});

test("resilience investments alter the specific risks they claim to address", () => {
  const state = {
    ...expand(createGame("strait", "energy")),
    cash: 1000,
    quarter: 12,
  };
  const powerContract = invest(state, "power_contract").state;
  assert.ok(
    metrics(powerContract, "energy").expenses <
      metrics(state, "energy").expenses,
  );
  assert.ok(
    metrics(powerContract, "energy").powerCapacity >
      metrics(state, "energy").powerCapacity,
  );
  const battery = build(state, "battery", state.board.indexOf(null)).state;
  assert.equal(
    metrics(battery, "energy").powerCapacity,
    metrics(state, "energy").powerCapacity + 10,
  );
  assert.equal(
    metrics(battery, "none").powerCapacity,
    metrics(state, "none").powerCapacity,
  );
  const recycling = build(state, "recycling", state.board.indexOf(null)).state;
  assert.ok(metrics(recycling, "water").water < metrics(state, "water").water);
  assert.ok(
    metrics(recycling, "water").coolingCapacity >
      metrics(state, "water").coolingCapacity,
  );
  const dry = invest(state, "dry_cooling").state;
  assert.ok(metrics(dry).water < metrics(state).water);
  assert.ok(metrics(dry, "none").power > metrics(state, "none").power);
  const efficient = invest(state, "efficiency").state;
  assert.ok(metrics(efficient, "none").power < metrics(state, "none").power);
  assert.equal(
    metrics(efficient, "none").compute,
    metrics(state, "none").compute,
  );
  const diverse = invest(
    { ...state, siteId: "nordic" },
    "network_diversity",
  ).state;
  assert.ok(
    metrics(diverse, "network").service >
      metrics({ ...state, siteId: "nordic" }, "network").service,
  );
  const suppliers = invest(state, "supplier_diversity").state;
  assert.ok(
    metrics(suppliers, "supply").compute > metrics(state, "supply").compute,
  );
  assert.equal(UPGRADES.length, 6);
});

test("supply-shock construction premiums are visible and supplier qualification reduces them", () => {
  let state = createGame("strait", "fragmentation");
  const quarter = [2, 4, 6, 8, 10, 12].find(
    (value) =>
      currentEvent({ ...state, quarter: value })?.category === "supply",
  );
  state = { ...state, quarter };
  assert.ok(assetCost(state, "compute") > ASSETS.compute.cost);
  const diverse = invest(state, "supplier_diversity").state;
  assert.ok(assetCost(diverse, "compute") < assetCost(state, "compute"));
  const built = build(state, "compute", 0).state;
  assert.equal(built.cash, state.cash - assetCost(state, "compute"));
});

test("an active, solvent, well-served campaign can win at every site in every scenario", () => {
  for (const site of SITES)
    for (const scenario of SCENARIOS) {
      const result = finish(expand(createGame(site.id, scenario.id)));
      assert.equal(result.status, "won", `${site.id}/${scenario.id}`);
      assert.equal(result.quarter, 12);
      assert.equal(result.history.length, 12);
      assert.equal(result.decisions.length, 6);
      assert.ok(result.cash >= 0);
      assert.ok(result.trust >= 45);
      assert.equal(currentEvent(result), null);
    }
});

test("doing nothing cannot win and an empty floor cannot farm uptime", () => {
  const idle = finish(createGame("atlantic", "balanced"), "accept");
  assert.equal(idle.status, "lost");
  let empty = {
    ...createGame("atlantic", "balanced"),
    board: Array(36).fill(null),
  };
  assert.equal(metrics(empty).pue, null);
  assert.equal(metrics(empty).service, 0);
  empty = finish(empty, "accept");
  assert.equal(empty.status, "lost");
  assert.ok(empty.quarter < 12);
});

test("save validation rejects structural, numeric, nested and timeline corruption", () => {
  const saved = finish(expand(createGame("atlantic", "balanced")));
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(saved))), saved);
  const corruptions = [
    (s) => {
      s.version = 2;
    },
    (s) => {
      s.seed = -1;
    },
    (s) => {
      s.siteId = "real-country-score";
    },
    (s) => {
      s.quarter = 13;
    },
    (s) => {
      s.cash = Infinity;
    },
    (s) => {
      s.board[0] = "__proto__";
    },
    (s) => {
      s.board.pop();
    },
    (s) => {
      s.upgrades = ["efficiency", "efficiency"];
    },
    (s) => {
      s.history[1].service = NaN;
    },
    (s) => {
      s.history[1].quarter = 4;
    },
    (s) => {
      s.history[0].profit = 999;
    },
    (s) => {
      s.history[0].served = 999;
    },
    (s) => {
      s.history[0].demand = 9;
    },
    (s) => {
      s.history[0].cash = 10000;
    },
    (s) => {
      s.history[0].trust = 100;
    },
    (s) => {
      s.history[0].lesson = "x".repeat(1501);
    },
    (s) => {
      s.decisions[0].cost = 0;
    },
    (s) => {
      s.decisions[0].eventId = "made-up";
    },
    (s) => {
      s.decisions.push(s.decisions[0]);
    },
    (s) => {
      s.decisions = [];
    },
    (s) => {
      s.trust = 0;
    },
    (s) => {
      s.status = "lost";
    },
  ];
  for (const corrupt of corruptions) {
    const value = structuredClone(saved);
    corrupt(value);
    assert.equal(validateSave(value), null, corrupt.toString());
  }
  for (const value of [null, [], "hello", 1, {}, { version: 1 }])
    assert.equal(validateSave(value), null);
  const owned = validateSave(saved);
  owned.board[0] = null;
  assert.notDeepEqual(owned.board, saved.board);
  const sparse = createGame("atlantic", "balanced");
  delete sparse.board[0];
  assert.equal(validateSave(sparse), null);
  assert.equal(
    validateSave({ ...createGame("atlantic", "balanced"), cash: 221 }),
    null,
  );
});

test("valid save timelines survive mid-campaign investments and conservative responses", () => {
  let state = expand(createGame("nordic", "fragmentation", 9));
  for (
    let quarter = 1;
    quarter <= 12 && state.status === "playing";
    quarter++
  ) {
    if (quarter === 3) state = invest(state, "community_plan").state;
    if (quarter === 7) state = invest(state, "efficiency").state;
    const result = advanceQuarter(
      state,
      currentEvent(state) ? "conserve" : undefined,
    );
    assert.equal(result.error, undefined);
    state = result.state;
    assert.deepEqual(validateSave(JSON.parse(JSON.stringify(state))), state);
  }
});

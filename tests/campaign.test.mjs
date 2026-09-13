import assert from "node:assert/strict";
import test from "node:test";
import { createMission, transition } from "../src/firstlight/model.ts";
import {
  CAMPAIGN_STAGES,
  createCampaign,
  campaignChoices,
  transitionCampaign,
  campaignMetrics,
  campaignSchedule,
  campaignVisual,
  forecastScenario,
  replayChapter,
  validateCampaign,
} from "../src/campaign/model.ts";
import {
  CAMPAIGN_SAVE_KEY,
  encodeCampaign,
  decodeCampaign,
  loadCampaign,
  saveCampaign,
} from "../src/campaign/persistence.ts";

const WRONG = new Set([
  "promise-hardware",
  "explain-count",
  "explain-add-delays",
  "explain-power",
]);
function origin(bay = 0, choice = "phase") {
  let state = createMission();
  for (const command of [
    { type: "enter" },
    { type: "inspect" },
    { type: "install", bay },
    { type: "connect", utility: "power" },
    { type: "connect", utility: "cooling" },
    { type: "connect", utility: "network" },
    { type: "test" },
    { type: "repair" },
    { type: "test" },
    { type: "activate" },
    { type: "reflect", answer: "controls" },
    { type: "expansion", choice },
  ]) {
    const result = transition(state, command);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}
function step(state, id) {
  const result = transitionCampaign(state, id);
  assert.equal(
    result.error,
    undefined,
    `${state.stage}: ${id}: ${result.error}`,
  );
  assert.notEqual(result.state, state);
  assert.deepEqual(validateCampaign(result.state), result.state);
  return result.state;
}
function walk(state, overrides = {}, stop = "complete") {
  for (let guard = 0; guard < 33 && state.stage !== stop; guard++) {
    const option = campaignChoices(state).find(
      (c) => !c.disabledReason && !WRONG.has(c.id),
    );
    assert.ok(
      option,
      `No legal path at ${state.stage}; budget ${state.budget}`,
    );
    state = step(state, overrides[state.stage] ?? option.id);
  }
  assert.equal(state.stage, stop);
  return state;
}
const prepared = {
  "cooling-design": "cooling-hybrid",
  procurement: "procurement-qualified",
  "network-design": "network-diverse",
  "power-design": "power-battery",
  "shipment-response": "qualified-alternate",
  "client-commitment": "promise-revised",
  "shift-one": "shift-one-critical",
  "shift-two": "shift-two-critical",
  "shift-three": "shift-three-battery",
  "cable-response": "use-diverse",
};
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freeze(child);
  return value;
}
const near = (a, b, tolerance = 0.002) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);

test("all nine canonical First Light origins enter and complete the five-chapter campaign", () => {
  for (const bay of [0, 1, 2])
    for (const firstChoice of ["phase", "reserve", "rush"]) {
      const first = origin(bay, firstChoice),
        snapshot = structuredClone(first);
      const initial = createCampaign(freeze(first));
      assert.equal(initial.budget, 120 + first.budget);
      assert.equal(campaignMetrics(initial).gridKw, 12);
      assert.equal(campaignMetrics(initial).facilityKw, 8);
      assert.deepEqual(first, snapshot);
      const done = walk(initial, prepared);
      assert.equal(done.chapter, 6);
      assert.equal(done.journal.length, 32);
      assert.deepEqual(
        done.journal.map((r) => r.stage),
        CAMPAIGN_STAGES.slice(0, -1),
      );
      assert.equal(done.expansionPhase, "online");
      assert.equal(done.recoveryTested, true);
      assert.ok(done.budget >= 0);
      assert.equal(campaignMetrics(done).openingKept, true);
      assert.equal(campaignMetrics(done).waterKept, true);
      assert.equal(done.unservedCriticalKwh, 0);
      assert.deepEqual(campaignChoices(done), []);
    }
  assert.throws(() => createCampaign(createMission()), /Complete/);
  assert.throws(
    () => createCampaign({ ...origin(), budget: 1000 }),
    /validate/,
  );
});

test("site permits and separate construction gates determine a parallel critical path", () => {
  const beforeWorks = walk(
    createCampaign(origin()),
    { site: "site-new", requirements: "requirements-full" },
    "groundworks",
  );
  assert.ok(beforeWorks.permitDay > beforeWorks.day);
  const works = step(beforeWorks, "build-shell");
  assert.equal(works.shellDay, beforeWorks.permitDay + 10);
  assert.equal(works.expansionPhase, "foundation");
  assert.equal(campaignMetrics(works).serviceKw, 6);
  let state = walk(
    works,
    { "client-commitment": "promise-revised" },
    "wait-delivery",
  );
  const latest = Math.max(state.hardwareDay, state.gridDay, state.shellDay);
  assert.equal(campaignMetrics(state).expectedOpeningDay, latest + 4);
  state = step(state, "await-milestones");
  assert.equal(state.day, latest);
  assert.equal(state.expansionPhase, "delivered");
  assert.equal(campaignMetrics(state).serviceKw, 6);
  const schedule = campaignSchedule(state);
  assert.equal(schedule.find((t) => t.id === "installation").status, "ready");
  assert.equal(
    schedule.find((t) => t.id === "commissioning").status,
    "pending",
  );
  assert.ok(transitionCampaign(state, "open-expansion").error);
  state = step(state, "install-expansion");
  assert.equal(state.day, latest + 3);
  assert.equal(campaignMetrics(state).serviceKw, 6);
  assert.ok(transitionCampaign(state, "open-expansion").error);
  state = step(state, "commission-expansion");
  assert.equal(state.day, latest + 4);
  assert.equal(campaignMetrics(state).serviceKw, 6);
  state = step(state, "open-expansion");
  assert.equal(state.actualOpenDay, latest + 4);
  assert.equal(campaignMetrics(state).serviceKw, 18);
  assert.equal(campaignMetrics(state).gridKw, 27);
  assert.equal(campaignMetrics(state).facilityKw, 23.5);
});

test("new-hardware trade delay leaves the running hall untouched and qualification gates real alternatives", () => {
  const signal = walk(
    createCampaign(origin(1, "reserve")),
    { procurement: "procurement-qualified" },
    "shipment-signal",
  );
  const delayed = step(signal, "review-delays");
  assert.equal(delayed.hardwareDay - signal.hardwareDay, 12);
  assert.equal(delayed.gridDay - signal.gridDay, 14);
  assert.equal(campaignMetrics(delayed).serviceKw, 6);
  const reserved = step(delayed, "reserved-slot");
  assert.equal(reserved.hardwareDay, delayed.day + 4);
  assert.equal(reserved.gridDay, delayed.gridDay);
  const usual = walk(createCampaign(origin()), {}, "shipment-response");
  for (const id of ["qualified-alternate", "reserved-slot"]) {
    assert.ok(campaignChoices(usual).find((c) => c.id === id).disabledReason);
    assert.equal(transitionCampaign(usual, id).state, usual);
  }
  const phased = step(usual, "phased-shipment");
  assert.equal(phased.hardwareDay, usual.day + 10);
  const late = walk(createCampaign(origin(2, "rush")));
  assert.equal(campaignMetrics(late).openingKept, false);
  const renegotiated = walk(createCampaign(origin(2, "rush")), {
    "client-commitment": "promise-revised",
  });
  assert.equal(campaignMetrics(renegotiated).openingKept, true);
});

test("maintenance proves failure domains and respects battery discharge power", () => {
  const shared = walk(createCampaign(origin()), {}, "maintenance-explain");
  assert.equal(shared.routeTested, false);
  assert.equal(shared.maintenancePassed, false);
  assert.match(shared.journal.at(-1).detail, /both services failed together/);
  const separated = walk(
    createCampaign(origin()),
    { "network-design": "network-diverse", "power-design": "power-separated" },
    "maintenance-explain",
  );
  assert.equal(separated.routeTested, true);
  assert.equal(separated.maintenancePassed, true);
  const bridged = walk(
    createCampaign(origin()),
    { "network-design": "network-diverse", "power-design": "power-battery" },
    "maintenance-explain",
  );
  assert.equal(bridged.batteryKwh, 11);
  assert.equal(
    bridged.maintenancePassed,
    false,
    "4 kW cannot maintain an 8 kW starter facility",
  );
  assert.match(bridged.journal.at(-1).detail, /full load not maintained/);
  const sharedHeat = walk(shared, {}, "shift-one");
  const separatedHeat = walk(separated, {}, "shift-one");
  assert.equal(
    campaignMetrics(sharedHeat).gridKw,
    campaignMetrics(separatedHeat).gridKw,
    "separated on-site paths do not remove regional import limits",
  );
});

test("finite batteries deplete across two-hour windows and cannot bypass power, water or workload conservation", () => {
  let state = walk(createCampaign(origin()), prepared, "shift-one");
  let totalBattery = 0;
  for (const [index, stage] of [
    "shift-one",
    "shift-two",
    "shift-three",
  ].entries()) {
    assert.equal(
      campaignMetrics(state).gridKw,
      [12, 9, 8][index],
      "preview grid reflects the upcoming shift",
    );
    assert.equal(
      campaignMetrics(state).waterLimitLph,
      [18, 12, 10][index],
      "preview allocation is not the previous dispatch",
    );
    const before = state;
    state = step(state, `${stage}-battery`);
    const d = state.lastDispatch;
    assert.equal(d.hours, 2);
    assert.ok(
      d.facilityKw <= d.gridKw + Math.min(4, before.batteryKwh / 2) + 0.001,
    );
    assert.ok(d.batteryUsedKwh <= before.batteryKwh);
    assert.ok(d.batteryUsedKwh <= 4 * d.hours);
    near(d.batteryUsedKwh, Math.max(0, d.facilityKw - d.gridKw) * 2);
    near(before.batteryKwh - d.batteryUsedKwh, state.batteryKwh);
    assert.ok(d.waterLph <= d.waterLimitLph);
    assert.ok(d.criticalServedKw <= 6 && d.criticalServedKw <= d.servedKw);
    near(d.servedKw * 2 + d.deferredKwh + d.unservedCriticalKwh, 12 * 2);
    totalBattery += d.batteryUsedKwh;
  }
  assert.equal(state.batteryKwh, 0);
  near(totalBattery, 11);
  assert.ok(
    state.unservedCriticalKwh > 0,
    "spending all reserve early leaves the final critical deficit exposed",
  );
  const conserved = walk(createCampaign(origin()), prepared, "heat-explain");
  assert.equal(conserved.unservedCriticalKwh, 0);
  assert.ok(conserved.batteryKwh > 0);
  assert.ok(conserved.deferredKwh > 0);
  near(
    conserved.servedKwh + conserved.deferredKwh + conserved.unservedCriticalKwh,
    72,
  );
});

test("installed cooling and explicit water pledges create real tradeoffs without an instant retrofit", () => {
  const wet = walk(createCampaign(origin()), {}, "shift-one");
  assert.ok(transitionCampaign(wet, "shift-one-dry").error);
  assert.ok(transitionCampaign(wet, "shift-one-battery").error);
  const lowWater = walk(
    wet,
    {
      "shift-one": "shift-one-water",
      "shift-two": "shift-two-water",
      "shift-three": "shift-three-water",
    },
    "week-review",
  );
  assert.equal(lowWater.waterLitres, 48);
  assert.equal(campaignMetrics(lowWater).waterKept, true);
  assert.ok(lowWater.unservedCriticalKwh > 0);
  const fullWet = walk(
    wet,
    {
      "shift-one": "shift-one-full",
      "shift-two": "shift-two-full",
      "shift-three": "shift-three-full",
    },
    "week-review",
  );
  assert.ok(fullWet.waterLitres > 48);
  assert.equal(campaignMetrics(fullWet).waterKept, false);
  const hybrid = walk(
    createCampaign(origin()),
    {
      ...prepared,
      "shift-one": "shift-one-dry",
      "shift-two": "shift-two-dry",
      "shift-three": "shift-three-dry",
    },
    "week-review",
  );
  assert.equal(hybrid.waterLitres, 0);
  assert.ok(
    hybrid.unservedCriticalKwh > 0,
    "dry cooling still needs electricity during the final shortfall",
  );
});

test("corridor recovery uses tested diversity or actual procurement time and a separate recovery test", () => {
  const shared = walk(createCampaign(origin()), {}, "cable-response");
  assert.equal(campaignMetrics(shared).serviceKw, 0);
  assert.ok(transitionCampaign(shared, "use-diverse").error);
  let emergency = step(shared, "order-emergency");
  assert.equal(emergency.day, shared.day);
  assert.equal(campaignMetrics(emergency).serviceKw, 0);
  assert.ok(transitionCampaign(emergency, "test-recovery").error);
  emergency = step(emergency, "receive-emergency");
  near(emergency.day - shared.day, 6 / 24);
  assert.equal(emergency.recoveryHours, 6);
  assert.equal(campaignMetrics(emergency).serviceKw, 0);
  assert.equal(campaignVisual(emergency).emergencyRoute, true);
  assert.equal(campaignVisual(emergency).networkDiverse, false);
  emergency = step(emergency, "test-recovery");
  assert.equal(emergency.recoveryHours, 7);
  assert.equal(campaignMetrics(emergency).serviceKw, 6);
  assert.equal(campaignVisual(emergency).networkTested, true);
  assert.equal(
    campaignVisual(emergency).cableOutage,
    true,
    "a temporary route does not repair the original corridor",
  );
  assert.equal(
    forecastScenario(emergency, {}).serviceKw,
    6,
    "a no-added-disruption forecast keeps the existing primary outage",
  );
  assert.match(emergency.journal.at(-1).detail, /cause: unknown/);
  const ready = walk(createCampaign(origin()), prepared, "cable-response");
  const diverse = step(ready, "use-diverse");
  assert.equal(campaignMetrics(diverse).serviceKw, 12);
  const local = step(shared, "local-teaching");
  assert.equal(campaignMetrics(local).serviceKw, 3);
  const restored = step(step(local, "await-route-repair"), "test-recovery");
  assert.equal(restored.recoveryHours, 13);
  assert.equal(campaignMetrics(restored).serviceKw, 12);
  assert.equal(campaignVisual(restored).cableOutage, false);
});

test("counterfactual forecasts are pure, bounded, physically constrained and preserve past openings", () => {
  const state = walk(createCampaign(origin()), prepared, "shipment-response");
  freeze(state);
  const before = structuredClone(state);
  const clear = {
    hardwareDelayDays: 0,
    gridDelayDays: 0,
    gridReductionPercent: 0,
    waterReductionPercent: 0,
    corridorOutage: false,
  };
  const base = forecastScenario(state, clear);
  const altered = forecastScenario(state, {
    ...clear,
    hardwareDelayDays: 4,
    gridDelayDays: 9,
  });
  assert.equal(
    altered.openingDay,
    Math.max(
      state.hardwareDay + 4,
      state.gridDay + 9,
      state.shellDay,
      state.day,
    ) + 3,
  );
  assert.ok(altered.openingDay >= base.openingDay);
  assert.deepEqual(forecastScenario(state, clear), base);
  assert.deepEqual(state, before);
  assert.equal(
    forecastScenario(state, { ...clear, gridReductionPercent: 100 }).serviceKw,
    0,
  );
  assert.ok(
    forecastScenario(state, { ...clear, waterReductionPercent: 100 })
      .serviceKw > 0,
    "installed dry mode survives a zero cooling-water allocation if powered",
  );
  const shared = walk(createCampaign(origin()), {}, "shipment-response");
  assert.equal(
    forecastScenario(shared, { ...clear, corridorOutage: true }).serviceKw,
    0,
  );
  const wetBattery = walk(
    createCampaign(origin()),
    { "power-design": "power-battery" },
    "shipment-response",
  );
  assert.equal(
    forecastScenario(wetBattery, {
      ...clear,
      waterReductionPercent: 90,
      gridReductionPercent: 60,
    }).batteryMinutes,
    0,
    "stored power cannot bridge missing cooling water",
  );
  for (const assumptions of [
    null,
    {},
    {
      hardwareDelayDays: NaN,
      gridDelayDays: Infinity,
      gridReductionPercent: -100,
      waterReductionPercent: 999,
      corridorOutage: "false",
    },
  ]) {
    const forecast = forecastScenario(state, assumptions);
    for (const key of [
      "openingDay",
      "serviceKw",
      "criticalServedKw",
      "batteryMinutes",
    ])
      assert.ok(Number.isFinite(forecast[key]) && forecast[key] >= 0);
    assert.ok(forecast.serviceKw <= 12);
  }
  const opened = walk(createCampaign(origin()), prepared);
  assert.equal(
    forecastScenario(opened, {
      ...clear,
      hardwareDelayDays: 90,
      gridDelayDays: 90,
    }).openingDay,
    opened.actualOpenDay,
  );
  const delivered = walk(
    createCampaign(origin()),
    prepared,
    "install-expansion",
  );
  assert.equal(
    forecastScenario(delivered, {
      ...clear,
      hardwareDelayDays: 90,
      gridDelayDays: 90,
    }).openingDay,
    campaignMetrics(delivered).expectedOpeningDay,
    "lead-time assumptions do not undo milestones already completed",
  );
});

test("the most expensive available path still funds mandatory installation and recovery for every origin", () => {
  for (const bay of [0, 1, 2])
    for (const firstChoice of ["phase", "reserve", "rush"]) {
      let state = createCampaign(origin(bay, firstChoice));
      while (state.stage !== "complete") {
        const choices = campaignChoices(state).filter(
          (c) => !c.disabledReason && !WRONG.has(c.id),
        );
        assert.ok(choices.length);
        state = step(
          state,
          choices.reduce((best, next) => (next.cost > best.cost ? next : best))
            .id,
        );
      }
      assert.ok(state.budget > 0);
      assert.equal(state.expansionPhase, "online");
      assert.equal(state.recoveryTested, true);
    }
});

test("chapter replay truncates the journal without rerolling unrelated decisions or resources", () => {
  const final = walk(createCampaign(origin(2, "reserve")), prepared);
  const snapshot = structuredClone(final);
  for (const chapter of [2, 3, 4, 5, 6]) {
    let checkpoint = replayChapter(final, chapter);
    assert.equal(checkpoint.chapter, chapter);
    assert.ok(checkpoint.journal.every((record) => record.chapter < chapter));
    assert.deepEqual(checkpoint.origin, final.origin);
    const remaining = final.journal.slice(checkpoint.journal.length);
    for (const record of remaining)
      checkpoint = step(checkpoint, record.choice);
    assert.deepEqual(checkpoint, final);
  }
  const early = createCampaign(origin());
  assert.equal(replayChapter(early, 3), null);
  assert.equal(replayChapter(final, 7), null);
  assert.deepEqual(final, snapshot);
});

test("runtime actions and wrong reflections cannot mutate frozen state, spend twice or skip gates", () => {
  let state = createCampaign(origin());
  for (let index = 0; index < 32; index++) {
    const before = structuredClone(state);
    freeze(state);
    for (const bad of [
      null,
      undefined,
      {},
      3,
      "__proto__",
      "skip-stage",
      "x".repeat(65),
    ]) {
      const result = transitionCampaign(state, bad);
      assert.ok(result.error);
      assert.equal(result.state, state);
    }
    for (const option of campaignChoices(state).filter(
      (c) => WRONG.has(c.id) || c.disabledReason,
    )) {
      const result = transitionCampaign(state, option.id);
      assert.ok(result.error);
      assert.equal(result.state, state);
    }
    const id = campaignChoices(state).find(
      (c) => !c.disabledReason && !WRONG.has(c.id),
    ).id;
    const next = step(state, id);
    assert.deepEqual(state, before);
    assert.notEqual(next.origin, state.origin);
    assert.notEqual(next.journal, state.journal);
    assert.ok(
      transitionCampaign(next, id).error,
      `${id} cannot be repeated in the next beat`,
    );
    state = next;
  }
});

test("bounded competing branches retain an affordable continuation and all physical invariants", () => {
  const used = new Set();
  for (let seed = 1; seed <= 96; seed++) {
    let random = seed,
      state = createCampaign(
        origin(
          seed % 3,
          ["phase", "reserve", "rush"][Math.floor(seed / 3) % 3],
        ),
      );
    for (let index = 0; index < 32; index++) {
      const options = campaignChoices(state).filter(
        (c) => !c.disabledReason && !WRONG.has(c.id),
      );
      assert.ok(options.length > 0, `${seed} stuck at ${state.stage}`);
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const option = options[random % options.length];
      used.add(option.id);
      state = step(state, option.id);
      assert.ok(state.budget >= 0);
      assert.ok(state.batteryKwh >= 0 && state.batteryKwh <= 12);
      const metrics = campaignMetrics(state),
        visual = campaignVisual(state);
      assert.ok(
        metrics.serviceKw >= 0 && metrics.serviceKw <= metrics.demandKw,
      );
      assert.ok(visual.serviceFraction >= 0 && visual.serviceFraction <= 1);
      if (state.lastDispatch)
        assert.ok(
          state.lastDispatch.waterLph <= state.lastDispatch.waterLimitLph,
        );
    }
    assert.equal(state.stage, "complete");
  }
  for (const id of [
    "requirements-full",
    "site-new",
    "cooling-hybrid",
    "power-battery",
    "power-separated",
    "qualified-alternate",
    "local-teaching",
    "order-emergency",
    "shift-three-water",
  ])
    assert.ok(used.has(id), `Competing branch never visited: ${id}`);
});

test("canonical journal validation rejects forged budgets, stages, timers, metrics, history and oversized saves", () => {
  const valid = walk(createCampaign(origin()), prepared);
  const corruptions = [
    (s) => {
      s.version = 2;
    },
    (s) => {
      s.stage = "requirements";
    },
    (s) => {
      s.chapter = 2;
    },
    (s) => {
      s.origin.budget += 1;
    },
    (s) => {
      s.budget += 0.01;
    },
    (s) => {
      s.day += 1;
    },
    (s) => {
      s.hardwareDay -= 1;
    },
    (s) => {
      s.gridDay = 0;
    },
    (s) => {
      s.promisedDay = s.day;
    },
    (s) => {
      s.expansionPhase = "installed";
    },
    (s) => {
      s.batteryKwh = 12;
    },
    (s) => {
      s.waterLitres = 0;
    },
    (s) => {
      s.unservedCriticalKwh = 900;
    },
    (s) => {
      s.maintenancePassed = !s.maintenancePassed;
    },
    (s) => {
      s.lastDispatch.servedKw = 999;
    },
    (s) => {
      s.recoveryHours = 0;
    },
    (s) => {
      s.recoveryTested = false;
    },
    (s) => {
      s.journal[4].day = 0;
    },
    (s) => {
      s.journal[0].spent = -120;
    },
    (s) => {
      s.journal[0].detail = "Free cash";
    },
    (s) => {
      s.journal[0].choice = "requirements-full";
    },
    (s) => {
      s.journal.push(s.journal[0]);
    },
    (s) => {
      s.journal.splice(3, 1);
    },
    (s) => {
      s.injected = true;
    },
    (s) => {
      s.journal[1].extra = 3;
    },
  ];
  for (const mutate of corruptions) {
    const copy = structuredClone(valid);
    mutate(copy);
    assert.equal(validateCampaign(copy), null, mutate.toString());
    assert.equal(decodeCampaign(JSON.stringify(copy)), null);
  }
  for (const value of [null, {}, [], "saved", { version: 1, journal: [] }])
    assert.equal(validateCampaign(value), null);
  for (const raw of ["{broken", "x".repeat(100001), "null"])
    assert.equal(decodeCampaign(raw), null);
  assert.deepEqual(decodeCampaign(encodeCampaign(valid)), valid);
  assert.deepEqual(
    validateCampaign(Object.fromEntries(Object.entries(valid).reverse())),
    valid,
    "JSON object key order is not a semantic difference",
  );
});

test("campaign storage is separate, recoverable and safe when browser storage is denied", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const values = new Map([
    ["core.firstlight.v1", "first-light-marker"],
    ["core.strategy.v1", "strategy-marker"],
  ]);
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
    });
    assert.deepEqual(loadCampaign(), { state: null, notice: "" });
    const state = createCampaign(origin());
    assert.equal(saveCampaign(state), true);
    assert.deepEqual(loadCampaign().state, state);
    assert.equal(values.get("core.firstlight.v1"), "first-light-marker");
    assert.equal(values.get("core.strategy.v1"), "strategy-marker");
    values.set(CAMPAIGN_SAVE_KEY, "{broken");
    assert.equal(loadCampaign().state, null);
    assert.match(loadCampaign().notice, /could not be validated/);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Denied");
      },
    });
    assert.equal(saveCampaign(state), false);
    assert.equal(loadCampaign().state, null);
    assert.match(loadCampaign().notice, /unavailable/);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});

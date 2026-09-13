import { ASSETS, EVENTS, SCENARIOS, SITES, UPGRADES } from "./content.ts";
import type {
  AssetType,
  ScenarioId,
  Shock,
  SiteId,
  StrategyEvent,
} from "./content.ts";

export type {
  AssetType,
  ScenarioId,
  Shock,
  SiteId,
  StrategyEvent,
} from "./content.ts";

export interface QuarterRecord {
  quarter: number;
  eventId: string | null;
  choiceId: string | null;
  revenue: number;
  expenses: number;
  profit: number;
  service: number;
  demand: number;
  served: number;
  cash: number;
  trust: number;
  lesson: string;
}

export interface DecisionRecord {
  quarter: number;
  eventId: string;
  choiceId: string;
  cost: number;
}

export interface StrategyState {
  version: 1;
  siteId: SiteId;
  scenarioId: ScenarioId;
  seed: number;
  quarter: number;
  status: "playing" | "won" | "lost";
  cash: number;
  trust: number;
  board: (AssetType | null)[];
  upgrades: string[];
  history: QuarterRecord[];
  decisions: DecisionRecord[];
}

export interface Metrics {
  demand: number;
  compute: number;
  served: number;
  service: number;
  power: number;
  powerCapacity: number;
  cooling: number;
  coolingCapacity: number;
  water: number;
  pue: number | null;
  revenue: number;
  expenses: number;
  profit: number;
  resilience: number;
}

export interface ActionResult {
  state: StrategyState;
  error?: string;
}

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const categories: Record<ScenarioId, Exclude<Shock, "none">[]> = {
  balanced: ["energy", "network", "water", "supply", "energy", "network"],
  fragmentation: ["supply", "network", "supply", "network", "energy", "supply"],
  energy: ["energy", "water", "energy", "water", "energy", "network"],
};

/** A seed chooses event order only; no opaque random modifier changes a shown forecast. */
function eventAt(
  scenarioId: ScenarioId,
  seed: number,
  quarter: number,
): StrategyEvent | null {
  if (quarter % 2 !== 0) return null;
  const order = [...categories[scenarioId]];
  let value = seed >>> 0;
  for (let index = order.length - 1; index > 0; index--) {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    const swap = value % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return EVENTS[order[quarter / 2 - 1]] ?? null;
}

export function createGame(
  siteId: SiteId,
  scenarioId: ScenarioId,
  seed = 42,
): StrategyState {
  if (
    !SITES.some((site) => site.id === siteId) ||
    !SCENARIOS.some((scenario) => scenario.id === scenarioId)
  ) {
    throw new RangeError("Choose a valid site and scenario.");
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("Seed must be an unsigned 32-bit integer.");
  const board: (AssetType | null)[] = Array.from({ length: 36 }, () => null);
  board[14] = "compute";
  board[15] = "cooling";
  board[20] = "power";
  board[21] = "network";
  return {
    version: 1,
    siteId,
    scenarioId,
    seed,
    quarter: 1,
    status: "playing",
    cash: 220,
    trust: 70,
    board,
    upgrades: [],
    history: [],
    decisions: [],
  };
}

export function currentEvent(state: StrategyState): StrategyEvent | null {
  return state.status === "playing"
    ? eventAt(state.scenarioId, state.seed, state.quarter)
    : null;
}

/** Positions are a capacity inventory, not a physical airflow or cable-routing simulation. */
export function metrics(state: StrategyState, shock?: Shock): Metrics {
  const activeShock =
    shock ??
    (state.status === "playing"
      ? currentEvent(state)?.category
      : eventAt(state.scenarioId, state.seed, state.quarter)?.category) ??
    "none";
  const site = SITES.find((entry) => entry.id === state.siteId)!;
  const counts: Record<AssetType, number> = {
    compute: 0,
    cooling: 0,
    power: 0,
    network: 0,
    battery: 0,
    recycling: 0,
  };
  for (const asset of state.board) if (asset) counts[asset]++;
  const has = (id: string) => state.upgrades.includes(id);
  const event = eventAt(state.scenarioId, state.seed, state.quarter);
  const decision =
    activeShock === event?.category
      ? state.decisions.find(
          (entry) =>
            entry.quarter === state.quarter && entry.eventId === event.id,
        )
      : undefined;
  const mitigate = decision?.choiceId === "mitigate";
  const conserve = decision?.choiceId === "conserve";
  const demand =
    8 +
    (state.quarter - 1) * (state.scenarioId === "fragmentation" ? 1.8 : 1.6);
  const climate =
    state.siteId === "nordic" ? 0.75 : state.siteId === "strait" ? 1.3 : 1;
  const computePower =
    counts.compute * 6 * (has("efficiency") ? 0.82 : 1) * (conserve ? 0.75 : 1);
  const coolingPower = counts.cooling * 2 * (has("dry_cooling") ? 1.2 : 1);
  const itPower = computePower + counts.network;
  const overhead =
    coolingPower +
    counts.power * 0.5 +
    counts.battery * 0.2 +
    counts.recycling * 0.4;
  const power = itPower + overhead;
  let energyRate = 1;
  let gridFactor = 1;
  let coolingFactor = 1;
  let networkFactor = 1;
  let supplyFactor = 1;
  if (activeShock === "energy") {
    energyRate = has("power_contract") ? 1.45 : 2.4;
    gridFactor = has("power_contract") ? 0.9 : 0.68;
    if (mitigate) {
      energyRate = Math.min(energyRate, 1.35);
      gridFactor = Math.max(gridFactor, 0.95);
    }
    if (conserve) gridFactor = Math.max(gridFactor, 0.88);
  }
  if (activeShock === "water") {
    coolingFactor = 1 - site.waterStress * 0.65;
    coolingFactor +=
      Math.min(0.3, counts.recycling * 0.12) + (has("dry_cooling") ? 0.35 : 0);
    if (mitigate) coolingFactor = Math.max(coolingFactor, 0.95);
    if (conserve) coolingFactor = Math.max(coolingFactor, 0.8);
    coolingFactor = Math.min(1, coolingFactor);
  }
  if (activeShock === "network") {
    networkFactor = has("network_diversity")
      ? 0.9
      : 1 - site.networkExposure * 0.7;
    if (mitigate) networkFactor = Math.max(networkFactor, 0.95);
    if (conserve) networkFactor = Math.max(networkFactor, 0.78);
  }
  if (activeShock === "supply") {
    supplyFactor = has("supplier_diversity")
      ? 0.96
      : 1 - site.supplyExposure * 0.4;
    if (mitigate) supplyFactor = Math.max(supplyFactor, 0.98);
    if (conserve) supplyFactor = Math.max(supplyFactor, 0.9);
  }
  const compute = counts.compute * 12 * supplyFactor * (conserve ? 0.85 : 1);
  const powerCapacity =
    counts.power * 25 * gridFactor +
    (activeShock === "energy" ? counts.battery * 10 : 0);
  const cooling =
    counts.compute *
    6 *
    climate *
    (has("efficiency") ? 0.9 : 1) *
    (conserve ? 0.85 : 1);
  const coolingCapacity = counts.cooling * 20 * coolingFactor;
  const powerRatio = power > 0 ? Math.min(1, powerCapacity / power) : 0;
  const coolingRatio = cooling > 0 ? Math.min(1, coolingCapacity / cooling) : 0;
  const served = Math.min(
    demand,
    compute * powerRatio * coolingRatio,
    counts.network * 24 * networkFactor,
  );
  const water =
    counts.cooling *
    4 *
    climate *
    (1 - Math.min(0.6, counts.recycling * 0.25)) *
    (has("dry_cooling") ? 0.45 : 1) *
    (conserve ? 0.7 : 1) *
    (activeShock === "water" && mitigate ? 0.5 : 1);
  const revenue = round(served * 1.65);
  const maintenance =
    state.board.filter(Boolean).length * 0.55 + state.upgrades.length * 0.15;
  const expenses = round(
    3 +
      power * site.powerCost * energyRate +
      water * (0.12 + site.waterStress * 0.2) +
      maintenance,
  );
  const resilience = clamp(
    Math.min(25, Math.max(0, powerCapacity - power)) +
      Math.min(20, Math.max(0, coolingCapacity - cooling)) +
      counts.battery * 8 +
      counts.recycling * 5 +
      (has("network_diversity") ? 15 : 0) +
      (has("supplier_diversity") ? 15 : 0) +
      (has("power_contract") ? 12 : 0) +
      (has("dry_cooling") ? 8 : 0),
    0,
    100,
  );
  return {
    demand: round(demand),
    compute: round(compute),
    served: round(served),
    service: round((served / demand) * 100),
    power: round(power),
    powerCapacity: round(powerCapacity),
    cooling: round(cooling),
    coolingCapacity: round(coolingCapacity),
    water: round(water),
    pue: itPower > 0 ? round(power / itPower) : null,
    revenue,
    expenses,
    profit: round(revenue - expenses),
    resilience: round(resilience),
  };
}

/** Construction premiums are visible and only apply while a supply event is active. */
export function assetCost(state: StrategyState, asset: AssetType): number {
  if (!Object.prototype.hasOwnProperty.call(ASSETS, asset)) return Infinity;
  const exposure = SITES.find(
    (site) => site.id === state.siteId,
  )!.supplyExposure;
  const multiplier =
    currentEvent(state)?.category === "supply"
      ? 1 +
        exposure * (state.upgrades.includes("supplier_diversity") ? 0.15 : 0.6)
      : 1;
  return Math.ceil(ASSETS[asset].cost * multiplier);
}

export function build(
  state: StrategyState,
  asset: AssetType,
  index: number,
): ActionResult {
  if (state.status !== "playing")
    return {
      state,
      error: "This campaign has ended. Start a new plan to build again.",
    };
  if (!Object.prototype.hasOwnProperty.call(ASSETS, asset))
    return { state, error: "Choose a valid facility asset." };
  if (!Number.isInteger(index) || index < 0 || index >= 36)
    return { state, error: "Choose a tile inside the facility." };
  if (state.board[index] !== null)
    return { state, error: "This tile already contains an asset." };
  const cost = assetCost(state, asset);
  if (state.cash < cost)
    return {
      state,
      error: `This asset costs ${cost} credits. Keep enough cash for operations.`,
    };
  const board = [...state.board];
  board[index] = asset;
  return { state: { ...state, board, cash: round(state.cash - cost) } };
}

export function invest(state: StrategyState, upgradeId: string): ActionResult {
  if (state.status !== "playing")
    return { state, error: "This campaign has ended." };
  const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);
  if (!upgrade) return { state, error: "Choose a listed investment." };
  if (state.upgrades.includes(upgradeId))
    return { state, error: "This investment is already in place." };
  if (state.cash < upgrade.cost)
    return { state, error: `This investment needs ${upgrade.cost} credits.` };
  return {
    state: {
      ...state,
      cash: round(state.cash - upgrade.cost),
      upgrades: [...state.upgrades, upgradeId],
    },
  };
}

/** A choice preview uses exactly the settlement formulas, without mutating the campaign. */
export function previewQuarter(
  state: StrategyState,
  choiceId?: string,
): ActionResult {
  if (state.status !== "playing")
    return { state, error: "This campaign has ended." };
  if (state.decisions.some((entry) => entry.quarter === state.quarter)) {
    return {
      state,
      error:
        "This quarter already has a prepared response. Preview or settle from the saved campaign state.",
    };
  }
  const event = currentEvent(state);
  if (!event)
    return choiceId
      ? { state, error: "There is no decision to make this quarter." }
      : { state };
  const option = event.options.find((entry) => entry.id === choiceId);
  if (!option)
    return {
      state,
      error: "Choose a response to the current event before advancing.",
    };
  if (state.cash < option.cost)
    return {
      state,
      error: `This response needs ${option.cost} credits up front.`,
    };
  return {
    state: {
      ...state,
      cash: round(state.cash - option.cost),
      decisions: [
        ...state.decisions,
        {
          quarter: state.quarter,
          eventId: event.id,
          choiceId: option.id,
          cost: option.cost,
        },
      ],
    },
  };
}

export function advanceQuarter(
  state: StrategyState,
  choiceId?: string,
): ActionResult {
  const preview = previewQuarter(state, choiceId);
  if (preview.error) return preview;
  const prepared = preview.state;
  const event = currentEvent(state);
  const output = metrics(prepared);
  const decisionCost =
    event?.options.find((entry) => entry.id === choiceId)?.cost ?? 0;
  const cash = round(prepared.cash + output.profit);
  const serviceChange =
    output.service >= 98
      ? 2
      : -(100 - output.service) * (choiceId === "conserve" ? 0.14 : 0.22);
  const trust = round(
    clamp(
      state.trust +
        serviceChange +
        (state.upgrades.includes("community_plan") ? 1 : 0),
      0,
      100,
    ),
  );
  const record: QuarterRecord = {
    quarter: state.quarter,
    eventId: event?.id ?? null,
    choiceId: event ? choiceId! : null,
    revenue: output.revenue,
    expenses: round(output.expenses + decisionCost),
    profit: round(output.profit - decisionCost),
    service: output.service,
    demand: output.demand,
    served: output.served,
    cash,
    trust,
    lesson:
      event?.lesson ??
      (output.service < 98
        ? "Demand exceeded usable capacity. Power, cooling, compute, and network must all support the service promise."
        : "Service commitments held. Check future demand before spending today's operating surplus."),
  };
  const history = [...state.history, record];
  const averageService =
    history.reduce((sum, entry) => sum + entry.service, 0) / history.length;
  let status: StrategyState["status"] =
    cash < 0 || trust < 20 ? "lost" : "playing";
  if (state.quarter === 12 && status === "playing") {
    status =
      averageService >= 85 &&
      output.service >= 90 &&
      trust >= 45 &&
      state.board.includes("compute")
        ? "won"
        : "lost";
  }
  return {
    state: {
      ...prepared,
      cash,
      trust,
      history,
      status,
      quarter: status === "playing" ? state.quarter + 1 : state.quarter,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function finite(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}
function integer(value: unknown, min: number, max: number): value is number {
  return finite(value, min, max) && Number.isInteger(value);
}

/** Reject corrupt or incompatible saves; return an owned copy with only known fields. */
export function validateSave(value: unknown): StrategyState | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (
    !SITES.some((site) => site.id === value.siteId) ||
    !SCENARIOS.some((scenario) => scenario.id === value.scenarioId)
  )
    return null;
  if (!integer(value.seed, 0, 0xffffffff) || !integer(value.quarter, 1, 12))
    return null;
  if (
    value.status !== "playing" &&
    value.status !== "won" &&
    value.status !== "lost"
  )
    return null;
  if (!finite(value.cash, -10000, 1000000) || !finite(value.trust, 0, 100))
    return null;
  if (
    !Array.isArray(value.board) ||
    value.board.length !== 36 ||
    !Array.from(value.board).every(
      (asset) =>
        asset === null ||
        (typeof asset === "string" &&
          Object.prototype.hasOwnProperty.call(ASSETS, asset)),
    )
  )
    return null;
  if (
    !Array.isArray(value.upgrades) ||
    value.upgrades.length > UPGRADES.length ||
    new Set(value.upgrades).size !== value.upgrades.length ||
    !value.upgrades.every((id) => UPGRADES.some((upgrade) => upgrade.id === id))
  )
    return null;
  if (
    !Array.isArray(value.history) ||
    !Array.isArray(value.decisions) ||
    value.decisions.length > 6
  )
    return null;
  const completed =
    value.status === "playing" ? value.quarter - 1 : value.quarter;
  if (
    value.history.length !== completed ||
    (value.status === "won" && value.quarter !== 12)
  )
    return null;
  if (value.status === "playing" && (value.cash < 0 || value.trust < 20))
    return null;
  const siteId = value.siteId as SiteId;
  const scenarioId = value.scenarioId as ScenarioId;
  const decisions: DecisionRecord[] = [];
  for (const raw of value.decisions) {
    if (!isRecord(raw) || !integer(raw.quarter, 1, completed)) return null;
    const event = eventAt(scenarioId, value.seed, raw.quarter);
    const option = event?.options.find((entry) => entry.id === raw.choiceId);
    if (
      !event ||
      raw.eventId !== event.id ||
      !option ||
      raw.cost !== option.cost ||
      decisions.some((entry) => entry.quarter === raw.quarter)
    )
      return null;
    decisions.push({
      quarter: raw.quarter,
      eventId: event.id,
      choiceId: option.id,
      cost: option.cost,
    });
  }
  const history: QuarterRecord[] = [];
  for (let index = 0; index < value.history.length; index++) {
    const raw: unknown = value.history[index];
    if (!isRecord(raw) || raw.quarter !== index + 1) return null;
    const event = eventAt(scenarioId, value.seed, index + 1);
    const decision = decisions.find((entry) => entry.quarter === index + 1);
    if (
      raw.eventId !== (event?.id ?? null) ||
      raw.choiceId !== (decision?.choiceId ?? null) ||
      Boolean(event) !== Boolean(decision)
    )
      return null;
    if (
      !finite(raw.revenue, 0, 10000) ||
      !finite(raw.expenses, 0, 10000) ||
      !finite(raw.profit, -10000, 10000)
    )
      return null;
    if (Math.abs(round(raw.revenue - raw.expenses) - raw.profit) > 0.011)
      return null;
    if (
      !finite(raw.service, 0, 100) ||
      !finite(raw.demand, 1, 100) ||
      !finite(raw.served, 0, raw.demand)
    )
      return null;
    if (
      raw.demand !==
      round(8 + index * (scenarioId === "fragmentation" ? 1.8 : 1.6))
    )
      return null;
    if (Math.abs(raw.service - round((raw.served / raw.demand) * 100)) > 0.15)
      return null;
    if (Math.abs(raw.revenue - round(raw.served * 1.65)) > 0.02) return null;
    if (
      !finite(raw.cash, -10000, 1000000) ||
      !finite(raw.trust, 0, 100) ||
      typeof raw.lesson !== "string" ||
      raw.lesson.length > 1500
    )
      return null;
    const priorCash = index > 0 ? history[index - 1].cash : 220;
    if (raw.cash > round(priorCash + raw.profit) + 0.011) return null;
    const priorTrust = index > 0 ? history[index - 1].trust : 70;
    const serviceChange =
      raw.service >= 98
        ? 2
        : -(100 - raw.service) *
          (decision?.choiceId === "conserve" ? 0.14 : 0.22);
    const withoutPlan = round(clamp(priorTrust + serviceChange, 0, 100));
    const withPlan = round(clamp(priorTrust + serviceChange + 1, 0, 100));
    if (
      raw.trust !== withoutPlan &&
      !(value.upgrades.includes("community_plan") && raw.trust === withPlan)
    )
      return null;
    if (index < value.history.length - 1 && (raw.cash < 0 || raw.trust < 20))
      return null;
    history.push({
      quarter: index + 1,
      eventId: event?.id ?? null,
      choiceId: decision?.choiceId ?? null,
      revenue: raw.revenue,
      expenses: raw.expenses,
      profit: raw.profit,
      service: raw.service,
      demand: raw.demand,
      served: raw.served,
      cash: raw.cash,
      trust: raw.trust,
      lesson: raw.lesson,
    });
  }
  if (decisions.length !== Math.floor(completed / 2)) return null;
  if (history.length && history[history.length - 1].trust !== value.trust)
    return null;
  if (!history.length && value.trust !== 70) return null;
  const lastCash = history.length ? history[history.length - 1].cash : 220;
  if (
    value.cash > lastCash + 0.011 ||
    (value.status !== "playing" && value.cash !== lastCash)
  )
    return null;
  if (
    value.status === "won" &&
    (value.cash < 0 ||
      value.trust < 45 ||
      history[11].service < 90 ||
      history.reduce((sum, entry) => sum + entry.service, 0) / 12 < 85 ||
      !value.board.includes("compute"))
  )
    return null;
  if (
    value.status === "lost" &&
    value.quarter < 12 &&
    value.cash >= 0 &&
    value.trust >= 20
  )
    return null;
  if (
    value.status === "lost" &&
    value.quarter === 12 &&
    value.cash >= 0 &&
    value.trust >= 45 &&
    history[11].service >= 90 &&
    history.reduce((sum, entry) => sum + entry.service, 0) / 12 >= 85 &&
    value.board.includes("compute")
  )
    return null;
  return {
    version: 1,
    siteId,
    scenarioId,
    seed: value.seed,
    quarter: value.quarter,
    status: value.status,
    cash: value.cash,
    trust: value.trust,
    board: [...value.board] as (AssetType | null)[],
    upgrades: [...value.upgrades] as string[],
    history,
    decisions,
  };
}

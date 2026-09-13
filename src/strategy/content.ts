export type SiteId = "atlantic" | "nordic" | "strait";
export type ScenarioId = "balanced" | "fragmentation" | "energy";
export type AssetType =
  "compute" | "cooling" | "power" | "network" | "battery" | "recycling";
export type Shock = "none" | "energy" | "water" | "network" | "supply";

export interface Site {
  id: SiteId;
  name: string;
  region: string;
  description: string;
  climate: string;
  powerCost: number;
  waterStress: number;
  supplyExposure: number;
  networkExposure: number;
}

/** Fictional planning archetypes. Coefficients are game rules, never regional measurements. */
export const SITES: Site[] = [
  {
    id: "atlantic",
    name: "Atlantic Exchange",
    region: "A connected temperate market",
    climate: "Temperate",
    powerCost: 0.2,
    waterStress: 0.3,
    supplyExposure: 0.45,
    networkExposure: 0.3,
    description:
      "Strong connectivity and modest water pressure, with a higher operating bill. An approachable first location.",
  },
  {
    id: "nordic",
    name: "Northern Reach",
    region: "A cool, remote energy hub",
    climate: "Cool",
    powerCost: 0.13,
    waterStress: 0.15,
    supplyExposure: 0.6,
    networkExposure: 0.8,
    description:
      "A cool climate lowers cooling demand and energy costs. Longer supply routes and concentrated connectivity require a plan.",
  },
  {
    id: "strait",
    name: "Strait Gateway",
    region: "A warm maritime trade hub",
    climate: "Warm",
    powerCost: 0.16,
    waterStress: 0.8,
    supplyExposure: 0.85,
    networkExposure: 0.6,
    description:
      "A low base power price comes with heavy cooling needs, scarce water, and exposure to shipping disruption.",
  },
];

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  difficulty: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "balanced",
    name: "A connected world",
    difficulty: "Foundation",
    description:
      "Serve a growing community through a mix of energy, water, network, and procurement shocks. Learn the four constraints.",
  },
  {
    id: "fragmentation",
    name: "A fragmented world",
    difficulty: "Advanced",
    description:
      "Hypothetical trade restrictions and disrupted routes test concentrated suppliers and connectivity. Diversification has a price.",
  },
  {
    id: "energy",
    name: "The resource squeeze",
    difficulty: "Advanced",
    description:
      "Energy volatility and water restrictions arrive repeatedly. Explore the tension between growth, efficiency, and local resilience.",
  },
];

export interface AssetDefinition {
  name: string;
  short: string;
  cost: number;
  description: string;
}

export const ASSETS: Record<AssetType, AssetDefinition> = {
  compute: {
    name: "Compute hall",
    short: "IT",
    cost: 34,
    description:
      "+12 service capacity. Needs 6 power and 6 cooling, before climate and efficiency adjustments.",
  },
  cooling: {
    name: "Cooling plant",
    short: "CL",
    cost: 20,
    description:
      "+20 cooling capacity. Draws 2 power and consumes water; unused cooling still incurs operating costs.",
  },
  power: {
    name: "Grid connection",
    short: "PW",
    cost: 25,
    description:
      "+25 power capacity. A shared grid shock can affect every connection; capacity alone is not independence.",
  },
  network: {
    name: "Network exchange",
    short: "NW",
    cost: 18,
    description:
      "Connects up to 24 units of service. Extra capacity helps, but route diversification is a separate investment.",
  },
  battery: {
    name: "Battery reserve",
    short: "BT",
    cost: 26,
    description:
      "Adds 10 units of ride-through power during an energy shock. A simplified quarterly continuity benefit, not a battery duration estimate.",
  },
  recycling: {
    name: "Water recovery",
    short: "WR",
    cost: 22,
    description:
      "Cuts water demand by 25% per unit, up to 60%. Also protects cooling during water restrictions.",
  },
};

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export const UPGRADES: Upgrade[] = [
  {
    id: "power_contract",
    name: "Diversify energy contracts",
    cost: 36,
    description:
      "Softens an energy price shock and preserves more grid capacity. Contracts reduce exposure but cannot remove it.",
  },
  {
    id: "network_diversity",
    name: "Independent network routes",
    cost: 32,
    description:
      "Preserves 90% of network capacity during disruption instead of relying on one concentrated route.",
  },
  {
    id: "supplier_diversity",
    name: "Qualify a second supplier",
    cost: 30,
    description:
      "Reduces supply-shock hardware premiums and preserves more compute service while replacement parts are scarce.",
  },
  {
    id: "dry_cooling",
    name: "Retrofit water-light cooling",
    cost: 38,
    description:
      "Cuts water use by 55% and protects against restrictions. Cooling electricity rises by 20%: an explicit energy–water trade-off.",
  },
  {
    id: "efficiency",
    name: "Tune workload efficiency",
    cost: 28,
    description:
      "Cuts compute power by 18% and cooling demand by 10%, with the same service capacity.",
  },
  {
    id: "community_plan",
    name: "Agree a community plan",
    cost: 24,
    description:
      "Adds one trust point each quarter through predictable reporting and demand management. It cannot compensate for persistent outages.",
  },
];

export interface EventOption {
  id: "accept" | "mitigate" | "conserve";
  label: string;
  description: string;
  cost: number;
}

export interface StrategyEvent {
  id: string;
  title: string;
  category: Exclude<Shock, "none">;
  description: string;
  lesson: string;
  options: EventOption[];
  sourceId: string;
}

export const EVENTS: Record<Exclude<Shock, "none">, StrategyEvent> = {
  energy: {
    id: "energy-disruption",
    title: "Energy agreements unravel",
    category: "energy",
    sourceId: "iea",
    description:
      "In this hypothetical quarter, a regional diplomatic dispute disrupts power imports. Grid capacity falls while spot electricity becomes more expensive. Your exposure depends on preparation.",
    lesson:
      "More grid connections do not guarantee independent supply. Contracts, efficiency, reserves, and demand management address different parts of the same shock.",
    options: [
      {
        id: "accept",
        label: "Use existing safeguards",
        cost: 0,
        description:
          "Take the projected disruption. Your permanent investments still apply.",
      },
      {
        id: "mitigate",
        label: "Buy continuity support",
        cost: 18,
        description:
          "This quarter: retain at least 95% of grid capacity and limit the energy-price multiplier to 1.35×.",
      },
      {
        id: "conserve",
        label: "Curtail flexible work",
        cost: 5,
        description:
          "This quarter: limit compute capacity to 85%, cut compute power by 25%, and retain at least 88% of grid capacity. Clear notice softens the trust penalty.",
      },
    ],
  },
  water: {
    id: "water-allocation",
    title: "Water becomes a shared constraint",
    category: "water",
    sourceId: "berkeley",
    description:
      "A hypothetical dry season brings an allocation order prioritizing households and essential services. Water-dependent cooling is constrained. Efficient energy use alone does not settle the local water question.",
    lesson:
      "PUE measures an energy ratio, not water stress. Water recovery and alternative cooling can protect continuity, but their costs and electricity needs still matter.",
    options: [
      {
        id: "accept",
        label: "Use existing safeguards",
        cost: 0,
        description:
          "Operate within the projected allocation. Water recovery and a cooling retrofit reduce the impact.",
      },
      {
        id: "mitigate",
        label: "Lease alternative cooling",
        cost: 18,
        description:
          "This quarter: retain at least 95% of cooling capacity and halve water use. Emergency provision has an up-front cost.",
      },
      {
        id: "conserve",
        label: "Reduce flexible demand",
        cost: 5,
        description:
          "This quarter: limit compute capacity to 85%, cut water demand by 30%, and retain at least 80% of cooling capacity. Clear notice softens the trust penalty.",
      },
    ],
  },
  network: {
    id: "network-route",
    title: "A cable corridor goes dark",
    category: "network",
    sourceId: "itu",
    description:
      "A hypothetical undersea cable incident coincides with disputed access for repair vessels. Do not infer who caused the damage. Concentrated routes leave some facilities with much less usable connectivity.",
    lesson:
      "Route diversity differs from raw bandwidth. Two links that share a physical corridor can fail together; buying more throughput does not automatically remove that dependency.",
    options: [
      {
        id: "accept",
        label: "Use existing safeguards",
        cost: 0,
        description:
          "Use the projected remaining network. Independent routes preserve 90% of capacity.",
      },
      {
        id: "mitigate",
        label: "Lease emergency transit",
        cost: 18,
        description:
          "This quarter: retain at least 95% of network capacity through an alternate carrier.",
      },
      {
        id: "conserve",
        label: "Prioritize essential traffic",
        cost: 5,
        description:
          "This quarter: limit compute capacity to 85% and retain at least 78% of network capacity. Clear notice softens the trust penalty.",
      },
    ],
  },
  supply: {
    id: "supply-restriction",
    title: "Export licenses enter the critical path",
    category: "supply",
    sourceId: "bis",
    description:
      "In this hypothetical scenario, an exporting jurisdiction expands license requirements for advanced computing hardware. Pending approvals and delivery delays reduce available replacement capacity and raise this quarter's construction costs. This event describes an invented policy change, not a current legal rule.",
    lesson:
      "Procurement concentration creates a timing risk as well as a price risk. Qualifying suppliers before a disruption costs money now to preserve options later.",
    options: [
      {
        id: "accept",
        label: "Use existing safeguards",
        cost: 0,
        description:
          "Use projected compute capacity. Building now includes the visible supply premium; a qualified second supplier reduces it.",
      },
      {
        id: "mitigate",
        label: "Lease compatible capacity",
        cost: 18,
        description:
          "This quarter: retain at least 98% of compute capacity. Construction premiums still apply.",
      },
      {
        id: "conserve",
        label: "Schedule essential workloads",
        cost: 5,
        description:
          "This quarter: preserve at least 90% of available compute, then limit work to 85%. Clear notice softens the trust penalty.",
      },
    ],
  },
};

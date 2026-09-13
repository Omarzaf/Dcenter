/**
 * Educational layer.
 *
 * Every entry ties a mechanic the player just used to the real discipline it
 * illustrates. The game uses abstract stress and resource values; it does not
 * predict equipment temperatures, efficiency benchmarks, or certified uptime.
 */

export type ConceptId =
  | "pue"
  | "power_chain"
  | "redundancy"
  | "stranded_capacity"
  | "rack_density"
  | "hot_cold_aisle"
  | "ashrae"
  | "delta_t"
  | "thermal_throttle"
  | "liquid_cooling"
  | "free_cooling"
  | "tor_leaf_spine"
  | "oversubscription"
  | "tiers"
  | "concurrent_maint"
  | "capacity_planning"
  | "wue"
  | "overcooling";

export type Discipline =
  "power" | "thermal" | "network" | "operations" | "efficiency";

export interface Concept {
  id: ConceptId;
  term: string;
  /** Expansion of the acronym or a plain-language restatement. */
  sub?: string;
  discipline: Discipline;
  /** One sentence a student should retain. */
  headline: string;
  /** How the mechanic they just used maps to the real thing. */
  inGame: string;
  /** The actual engineering explanation. */
  real: string[];
  /** Sourced figures, definitions, or explicitly labeled worked examples. */
  figures?: { label: string; value: string }[];
  sources?: { label: string; url: string }[];
  /** Retrieval-practice question. */
  check?: { q: string; options: string[]; answer: number; why: string };
}

export const DISCIPLINES: Record<Discipline, { label: string; color: string }> =
  {
    power: { label: "Power", color: "#d6a243" },
    thermal: { label: "Thermal", color: "#78c8c0" },
    network: { label: "Network", color: "#c77a9c" },
    operations: { label: "Operations", color: "#69a6d7" },
    efficiency: { label: "Efficiency", color: "#80b784" },
  };

export const CONCEPTS: Record<ConceptId, Concept> = {
  pue: {
    id: "pue",
    term: "PUE",
    sub: "Power Usage Effectiveness",
    discipline: "efficiency",
    headline:
      "PUE compares the facility's total energy use with the energy used by its IT equipment.",
    inGame:
      "Model PUE divides the game's facility draw by its IT draw. It illustrates a ratio using arbitrary resource units; it is not an annual energy measurement and cannot be compared with an operator's reported PUE.",
    real: [
      "PUE = Total Facility Energy / IT Equipment Energy over the same measurement period and boundary. IT includes networking and storage as well as servers. A ratio of 1.0 would mean no energy overhead within that boundary.",
      "It was defined by The Green Grid and is now standardised as ISO/IEC 30134-2. Because it is a ratio, it says nothing about absolute consumption: a wasteful facility running inefficient servers can post a good PUE simply because its IT load is enormous.",
      "That blind spot is why operators pair it with WUE and CUE, and why 'improving PUE' by installing hungrier servers is a known way to game the metric.",
    ],
    figures: [
      { label: "Theoretical floor", value: "1.0" },
      { label: "Worked example: 1,500 / 1,000", value: "1.5" },
    ],
    sources: [
      {
        label: "The Green Grid: PUE definition",
        url: "https://www.thegreengrid.org/node/372",
      },
    ],
    check: {
      q: "A facility draws 1,500 kW total and 1,000 kW of that reaches IT equipment. What is its PUE?",
      options: ["0.67", "1.5", "500 kW", "2.5"],
      answer: 1,
      why: "1,500 / 1,000 = 1.5. This is the ratio for the example, not a claim about an industry average.",
    },
  },

  power_chain: {
    id: "power_chain",
    term: "The power chain",
    sub: "Utility to server PSU",
    discipline: "power",
    headline:
      "Distribution, protection, backup, and conversion equipment all sit between the utility and the processor.",
    inGame:
      "Your PDU raises the floor's usable capacity. In a real building it is one link in a chain, and each link is a potential failure point as well as an efficiency loss.",
    real: [
      "One possible path includes a utility feed, transformer, switchgear, UPS, distribution equipment, and the server power supply. Not every component converts power, and the arrangement varies by design.",
      "A UPS can bridge a supply interruption while backup generation starts or a workload shuts down safely. Required runtime depends on the load, transfer sequence, and operating plan; there is no universal battery duration.",
      "In a worked example, a 94%-efficient UPS followed by a 90%-efficient power supply delivers 0.94 × 0.90 = 84.6% of the input through those two stages. These assumed efficiencies illustrate compounding losses, not product specifications.",
    ],
    figures: [{ label: "Worked example: 94% × 90%", value: "84.6%" }],
    check: {
      q: "Why does a data centre need a UPS if it already has backup generators?",
      options: [
        "Generators cannot supply enough power",
        "To bridge the seconds between utility loss and generators taking load",
        "To lower the facility's PUE",
        "Generators only work during scheduled maintenance",
      ],
      answer: 1,
      why: "A generator cannot necessarily accept the load immediately after utility loss. Stored energy carries the load across the designed transfer interval.",
    },
  },

  redundancy: {
    id: "redundancy",
    term: "N+1 and 2N",
    sub: "Redundancy topologies",
    discipline: "power",
    headline:
      "Redundancy is described relative to N, the capacity actually required to carry the load.",
    inGame:
      "A failed PDU removes capacity. If enough capacity remains, the floor can continue; if not, it browns out. The game does not model independent distribution paths.",
    real: [
      "N is the required capacity. N+1 adds one spare capacity unit; 2N provides two complete capacity systems. Losing one capacity unit can be survivable while a shared path or control remains a point of failure.",
      "Capacity redundancy alone does not establish concurrent maintainability or fault tolerance. Distribution paths, controls, isolation, and maintenance procedures also matter.",
      "Extra equipment adds capital and operating costs. The efficiency effect depends on equipment performance and how spare capacity is operated.",
    ],
    figures: [
      { label: "N", value: "No spare capacity" },
      { label: "N+1", value: "One spare unit" },
      { label: "2N", value: "Fully duplicated path" },
    ],
    sources: [
      {
        label: "Uptime Institute: Tier-system misconceptions",
        url: "https://journal.uptimeinstitute.com/myths-and-misconceptions-regarding-the-uptime-institutes-tier-certification-system/",
      },
    ],
    check: {
      q: "A load needs three cooling units. What does N+1 look like?",
      options: [
        "Three units",
        "Four units",
        "Six units",
        "Two units plus a generator",
      ],
      answer: 1,
      why: "N is three, so N+1 is four. Any one unit can fail or be taken out for service and the remaining three still carry the load.",
    },
  },

  stranded_capacity: {
    id: "stranded_capacity",
    term: "Stranded capacity",
    discipline: "power",
    headline:
      "A facility is limited by whichever resource runs out first, and the rest becomes unusable.",
    inGame:
      "When draw exceeds the bus limit, distribution constrains the floor even if tiles remain empty. Available space does not guarantee usable compute capacity.",
    real: [
      "Capacity comes in several forms: floor space, power, cooling and network ports. Exhausting any one of them strands the others.",
      "For example, with a fixed rack-power budget, replacing a plan for 5 kW per rack with 15 kW per rack reduces the supported rack count to one third. Upgrading the constrained system can make the unused space usable again.",
      "This is why modern designs plan in kilowatts per rack rather than square metres, and why retrofitting an older room for high-density hardware often means rebuilding the electrical plant rather than adding tiles.",
    ],
    check: {
      q: "A hall has floor space for 100 racks but its electrical plant supports only 40 at the intended density. What is the term for the unusable remainder?",
      options: [
        "Oversubscription",
        "Stranded capacity",
        "Bypass air",
        "Negative PUE",
      ],
      answer: 1,
      why: "The space exists but cannot be energised, so that capacity is stranded behind the power constraint.",
    },
  },

  rack_density: {
    id: "rack_density",
    term: "Rack density",
    sub: "Kilowatts per rack",
    discipline: "power",
    headline:
      "Power per rack determines how much electrical and cooling capacity must reach a small area.",
    inGame:
      "Packing racks tightly raises output but concentrates heat into a small area, which is precisely the tradeoff a real capacity planner manages.",
    real: [
      "Rack density is commonly expressed in kilowatts per rack. Actual and design loads can differ substantially across workloads and equipment generations.",
      "Dense accelerator systems can require very different power and cooling arrangements from lower-density enterprise equipment. Check the selected equipment's requirements.",
      "There is no universal rack-power threshold at which air cooling becomes impossible. Cooling suitability depends on hardware, airflow, layout, and supply conditions.",
    ],
    figures: [{ label: "Density unit", value: "kW per rack" }],
  },

  hot_cold_aisle: {
    id: "hot_cold_aisle",
    term: "Hot aisle / cold aisle",
    sub: "Airflow containment",
    discipline: "thermal",
    headline:
      "Separating supply and exhaust air helps prevent hot exhaust from returning to equipment intakes.",
    inGame:
      "Linking racks into a POD is the game's version of arranging a row. Real rows are oriented so that intakes face intakes and exhausts face exhausts.",
    real: [
      "For equipment designed with front-to-back airflow, rack fronts can face a shared cold aisle and exhausts a shared hot aisle. Equipment with other airflow directions needs accommodation.",
      "Containment uses barriers, doors, or ceiling panels to reduce unwanted mixing. Leakage and airflow balance still need attention.",
      "Two failure modes matter. Bypass air is conditioned air that returns to the cooling unit without ever passing through a server, wasting fan energy. Recirculation is hot exhaust looping back into an intake, which creates hot spots even when the room average looks fine.",
      "Blanking panels in empty rack slots and sealing floor cutouts are unglamorous but among the cheapest efficiency wins available.",
    ],
    check: {
      q: "Hot exhaust air loops back around a rack and re-enters the server intakes. What is this called?",
      options: ["Bypass air", "Recirculation", "Free cooling", "Delta-T"],
      answer: 1,
      why: "Recirculation raises intake temperature locally and produces hot spots even when the room's average temperature reads acceptable.",
    },
  },

  ashrae: {
    id: "ashrae",
    term: "ASHRAE thermal envelope",
    sub: "TC 9.9 guidelines",
    discipline: "thermal",
    headline:
      "The temperature that matters is the air entering the equipment, not the temperature of the room.",
    inGame:
      "Coolant arrays reduce the game's thermal stress index. That index is not Celsius and does not represent an ASHRAE inlet measurement. Real operators must distinguish inlet air, exhaust air, and chip temperature.",
    real: [
      "ASHRAE's published A1–A4 air-cooled equipment guidance uses a recommended inlet dry-bulb range of 18–27 °C. This is an equipment-class example, not a universal limit for every server or cooling technology.",
      "The full envelope also specifies humidity and other conditions. Allowable conditions vary by class, and equipment documentation must support operation within the chosen envelope.",
      "A higher supply-air setpoint can reduce cooling energy, but the result depends on the system. It can also leave less temperature margin during a cooling interruption.",
    ],
    figures: [
      { label: "ASHRAE A1–A4 recommended dry bulb", value: "18–27 °C" },
    ],
    sources: [
      {
        label: "ASHRAE: equipment-class thermal guidance, Table 3",
        url: "https://www.ashrae.org/file%20library/technical%20resources/bookstore/ashrae_storage_white_paper_2015.pdf",
      },
    ],
    check: {
      q: "Which temperature does ASHRAE's recommended envelope actually govern?",
      options: [
        "Average room temperature",
        "Air entering the equipment intake",
        "Exhaust air temperature",
        "Chilled water supply temperature",
      ],
      answer: 1,
      why: "The guidelines specify inlet conditions at the equipment, which is why containment and rack-face measurement matter more than a single room sensor.",
    },
  },

  delta_t: {
    id: "delta_t",
    term: "Delta-T",
    sub: "Temperature rise across IT equipment",
    discipline: "thermal",
    headline:
      "The temperature difference between intake and exhaust reveals whether your airflow is matched to the load.",
    inGame:
      "Coolant arrays remove abstract stress from nearby tiles. The floor does not separately model inlet and exhaust temperatures, so it does not measure a real delta-T.",
    real: [
      "Across air-cooled IT equipment, delta-T is exhaust temperature minus intake temperature. Its expected value depends on the equipment load and airflow.",
      "At a similar load, a lower rise can indicate more airflow, while a higher rise can indicate less. Bypass air and sensor placement can also change a measured result.",
      "A useful diagnosis considers delta-T together with inlet conditions, load, and airflow. The difference alone does not show whether equipment is safe.",
    ],
    figures: [{ label: "Across the equipment", value: "Exhaust minus intake" }],
  },

  thermal_throttle: {
    id: "thermal_throttle",
    term: "Thermal throttling",
    discipline: "thermal",
    headline:
      "Thermal protection can reduce processor performance to keep temperature within a hardware-specific limit.",
    inGame:
      "Overheated racks marked HOT are producing less throughput. Their power draw has not fallen proportionally, so you are paying nearly full price for reduced work.",
    real: [
      "Modern CPUs and accelerators monitor die temperature continuously. On reaching a threshold they reduce clock frequency and voltage to stay within their thermal limit, and shut down entirely if that fails.",
      "The operational consequence is that a cooling deficiency is often first reported as a performance regression rather than a facilities alarm.",
      "Throttling also reduces processor power. Its effect on completed work per unit of energy depends on the workload and the rest of the system; the game's fixed draw does not predict that relationship.",
    ],
    sources: [
      {
        label: "Intel: thermal protection and automatic shutdown",
        url: "https://www.intel.com/content/www/us/en/support/articles/000039154/processors/intel-core-processors.html",
      },
    ],
  },

  liquid_cooling: {
    id: "liquid_cooling",
    term: "Liquid cooling",
    discipline: "thermal",
    headline:
      "Liquid cooling can move heat away from dense equipment where the chosen air-cooling design cannot meet its requirements.",
    inGame:
      "Large PODs can strain the game's area-based cooling. This introduces the idea of matching cooling to a load; the game does not model liquid loops or a real rack-density threshold.",
    real: [
      "Water carries far more heat per unit volume than air, so a modest flow removes what would require an impractical volume of air.",
      "Rear-door heat exchangers cool rack exhaust. Direct-to-chip cold plates cool selected components, while immersion places compatible equipment in dielectric fluid. Each requires a suitable facility design.",
      "Liquid loops can support heat recovery. Whether recovered heat is useful depends on its temperature, a nearby demand, and any additional equipment such as heat pumps.",
    ],
    figures: [
      { label: "Cooling selection", value: "Equipment and site specific" },
    ],
    sources: [
      {
        label:
          "US Department of Energy: data center design guide, liquid cooling and heat recovery",
        url: "https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design_0.pdf",
      },
    ],
  },

  free_cooling: {
    id: "free_cooling",
    term: "Free cooling",
    sub: "Economiser operation",
    discipline: "efficiency",
    headline:
      "When outside conditions are favourable, the mechanical refrigeration plant can be switched off entirely.",
    inGame:
      "Ambient stress rises each phase, making the model harder to cool. This illustrates how environmental conditions can change operating margin; the values are not weather or temperature forecasts.",
    real: [
      "Economisers use favorable outdoor conditions to reduce or avoid compressor cooling. Designs can use outside air directly or reject heat through another circuit.",
      "Fans, pumps, treatment, and sometimes water are still needed. 'Free' describes reduced mechanical refrigeration, not zero resource use.",
      "Available operating hours depend on climate, air quality, equipment limits, and the cooling system. Site selection also depends on power, connectivity, water, land, and customers.",
      "Setpoints and economiser operation should be chosen together within supported equipment conditions.",
    ],
  },

  tor_leaf_spine: {
    id: "tor_leaf_spine",
    term: "Leaf-spine fabric",
    sub: "Clos topology",
    discipline: "network",
    headline:
      "A two-tier leaf-spine fabric provides multiple paths between leaf switches for server-to-server traffic.",
    inGame:
      "An adjacent fibre switch gives a POD one throughput bonus; additional switches do not stack that bonus. The game does not construct a real leaf-spine fabric.",
    real: [
      "In a conventional two-tier design, every leaf connects to every spine. Devices on different leaves use a leaf–spine–leaf path; devices on the same leaf can communicate locally.",
      "Consistent paths between leaves simplify planning, but do not guarantee identical latency. Congestion, link speed, and endpoint behavior still matter.",
      "Distributed workloads create east-west traffic between servers, making these paths useful. Three-tier and larger multi-tier designs also remain in use.",
      "Adding spines can increase aggregate capacity when leaf ports and links support the expansion. Adding leaves increases attachment capacity within the fabric's limits.",
    ],
    sources: [
      {
        label: "Cisco: ACI physical topology design",
        url: "https://www.cisco.com/c/en/us/td/docs/dcn/whitepapers/cisco-application-centric-infrastructure-design-guide.html",
      },
    ],
    check: {
      q: "Which traffic pattern is an important reason to choose a leaf-spine design?",
      options: [
        "It uses fewer switches",
        "Traffic shifted from client-server to server-to-server",
        "It removes the need for fibre",
        "It eliminates the need for redundancy",
      ],
      answer: 1,
      why: "Server-to-server traffic benefits from multiple paths between leaves. Traffic within one leaf can stay local, and equal paths do not guarantee equal latency.",
    },
  },

  oversubscription: {
    id: "oversubscription",
    term: "Oversubscription",
    discipline: "network",
    headline:
      "Oversubscription means shared uplink capacity is smaller than the combined capacity of the links it serves.",
    inGame:
      "The switch bonus introduces networking as a throughput constraint. The game does not model link bandwidth, traffic contention, or an oversubscription ratio.",
    real: [
      "The ratio compares server-facing bandwidth to uplink bandwidth. A leaf with 48 ports at 25 gigabits and 4 uplinks at 100 gigabits carries 1,200 gigabits below and 400 above, giving 3:1.",
      "Provisioning 1:1 is possible but expensive, and for many workloads the capacity would sit idle.",
      "Latency-sensitive and bandwidth-heavy work changes the calculus. Distributed training in particular can saturate uplinks for sustained periods, which is why AI clusters are often built at or near 1:1.",
    ],
    figures: [
      { label: "Worked example: 1,200 / 400", value: "3:1" },
      { label: "Equal aggregate capacities", value: "1:1" },
    ],
  },

  tiers: {
    id: "tiers",
    term: "Uptime Institute Tiers",
    discipline: "operations",
    headline:
      "A four-level classification describing what a facility can survive, not how new or expensive it is.",
    inGame:
      "A PDU failure illustrates dependence on a power component. This simplified floor does not model every subsystem or qualify for any Tier classification.",
    real: [
      "Tier I provides basic capacity with a single distribution path and no redundant capacity components. Maintenance can require a shutdown.",
      "Tier II adds redundant capacity components but retains a single distribution path, so the path itself remains a single point of failure.",
      "Tier III is concurrently maintainable: the infrastructure supports planned removal of capacity components and distribution paths without stopping the supported IT load.",
      "Tier IV adds fault tolerance: the infrastructure is designed to sustain a single equipment failure or distribution-path interruption without affecting the supported IT load.",
      "Tier classification describes infrastructure topology, not a guaranteed uptime percentage. Uptime Institute removed availability predictions from its Tier Standard in 2009; actual outcomes also depend on operations.",
    ],
    figures: [
      { label: "Tier I", value: "Basic capacity" },
      { label: "Tier II", value: "Redundant capacity components" },
      { label: "Tier III", value: "Concurrent maintainability" },
      { label: "Tier IV", value: "Fault tolerance" },
    ],
    sources: [
      {
        label: "Uptime Institute: explaining Tier classification",
        url: "https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/",
      },
    ],
    check: {
      q: "What distinguishes Tier III from Tier II?",
      options: [
        "Tier III is newer",
        "Tier III is concurrently maintainable: any component can be serviced without stopping IT",
        "Tier III uses liquid cooling",
        "Tier III has no single points of failure at all",
      ],
      answer: 1,
      why: "Concurrent maintainability is the defining Tier III property. Tolerating an unannounced failure of any component is Tier IV.",
    },
  },

  concurrent_maint: {
    id: "concurrent_maint",
    term: "Concurrent maintainability",
    discipline: "operations",
    headline:
      "A facility that cannot be serviced while running will eventually be taken down by its own maintenance schedule.",
    inGame:
      "Decommissioning a live unit cost you capacity immediately. Designs that anticipate maintenance absorb that loss without a service impact.",
    real: [
      "Every component has a service interval. Batteries are replaced, filters changed, breakers exercised, firmware updated.",
      "If a required service operation needs a shutdown, maintenance can cause planned downtime. Deferring it instead can increase the risk of failure.",
      "Concurrent maintainability, the Tier III threshold, means isolating any single component for service while the load continues to be carried.",
      "Operating procedures, isolation, and staff preparation also matter: a maintainable design must be operated correctly during the work.",
    ],
  },

  capacity_planning: {
    id: "capacity_planning",
    term: "Capacity planning",
    discipline: "operations",
    headline:
      "Capacity planning must account for construction and procurement lead times while future demand remains uncertain.",
    inGame:
      "Ambient stress rises every phase, so a floor that was comfortable becomes marginal. Build the model's headroom before you need it.",
    real: [
      "Lead times dominate. Large power equipment and generators are ordered far in advance, and utility interconnection agreements can take years.",
      "Building too early can leave capital idle and equipment operating away from its efficient range. Building too late can mean turning away demand.",
      "This is why modular and phased construction became standard: commission capacity in blocks that track demand rather than committing the full build at once.",
      "Planners track power, cooling, space and network independently, because the first to run out constrains everything else.",
    ],
  },

  wue: {
    id: "wue",
    term: "WUE",
    sub: "Water Usage Effectiveness",
    discipline: "efficiency",
    headline:
      "Evaporative cooling trades electricity for water, so a strong PUE can conceal heavy water consumption.",
    inGame:
      "Your efficiency score only counts energy. Real reporting increasingly counts water alongside it.",
    real: [
      "Site WUE compares site water use in litres with IT equipment energy in kilowatt-hours over the same period. The Green Grid also distinguishes source-related water impacts.",
      "Evaporative cooling uses water when operating in wet mode and can reduce cooling electricity. The energy and water consequences depend on operating conditions and system design.",
      "Water source matters as much as volume. Consumption in a water-stressed region carries a very different impact from the same figure in a water-rich one, and this has become a significant factor in siting decisions and planning permission.",
      "A closed IT cooling loop can still reject heat through a water-consuming cooling tower. Trace the whole heat-rejection system; 'closed loop' alone does not establish low water use. Dry heat rejection can save water, with energy effects that depend on conditions.",
    ],
    figures: [
      { label: "Site metric", value: "Litres per kWh of IT energy" },
      { label: "Companion metrics", value: "PUE, CUE" },
    ],
    sources: [
      {
        label: "The Green Grid: WUE framework",
        url: "https://www.thegreengrid.org/system/files/store/WUE_v1.pdf",
      },
      {
        label: "US Department of Energy: cooling water systems",
        url: "https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers",
      },
    ],
  },

  overcooling: {
    id: "overcooling",
    term: "Over-cooling",
    discipline: "efficiency",
    headline:
      "Cooling beyond what the load requires is pure overhead, and it is one of the most common inefficiencies in practice.",
    inGame:
      "A high model PUE means a larger share of draw serves overhead. Check whether coolant arrays are needed for stress control before removing them; the ratio alone cannot diagnose over-cooling.",
    real: [
      "Rooms are frequently run colder than necessary as insurance against hot spots, but the correct remedy for a hot spot is containment and airflow management, not lowering the setpoint for the entire hall.",
      "Over-cooling is often a symptom rather than the disease. Poor containment causes recirculation, recirculation causes hot spots, and operators respond by over-cooling the whole room to protect the worst rack.",
      "Under comparable system conditions, fan affinity laws approximate power as proportional to the cube of speed. Actual savings depend on controls and system resistance; verify adequate equipment airflow after changes.",
    ],
    check: {
      q: "A single rack runs hot. What is the more efficient first response?",
      options: [
        "Lower the setpoint for the entire hall",
        "Fix containment and airflow at that rack",
        "Add a second chiller",
        "Accept the hot spot and raise the setpoint",
      ],
      answer: 1,
      why: "Over-cooling the whole room to protect one rack is expensive. Blanking panels, sealing and airflow correction address the actual cause.",
    },
  },
};

export const CONCEPT_ORDER: ConceptId[] = [
  "pue",
  "hot_cold_aisle",
  "ashrae",
  "delta_t",
  "thermal_throttle",
  "liquid_cooling",
  "power_chain",
  "redundancy",
  "stranded_capacity",
  "rack_density",
  "tor_leaf_spine",
  "oversubscription",
  "tiers",
  "concurrent_maint",
  "capacity_planning",
  "free_cooling",
  "overcooling",
  "wue",
];

/* ------------------------------------------------------------------ */
/* PUE evaluation                                                      */
/* ------------------------------------------------------------------ */

export interface PueBand {
  label: string;
  color: string;
  note: string;
}

export function pueBand(pue: number): PueBand {
  if (!isFinite(pue) || pue <= 0)
    return {
      label: "No IT load",
      color: "#83909b",
      note: "Deploy compute to register efficiency.",
    };
  if (pue <= 1.2)
    return {
      label: "Low overhead",
      color: "#80b784",
      note: "Low overhead within this model; check capacity and cooling margin too.",
    };
  if (pue <= 1.4)
    return {
      label: "Modest overhead",
      color: "#78c8c0",
      note: "A game ratio, not an operator benchmark.",
    };
  if (pue <= 1.6)
    return {
      label: "Rising overhead",
      color: "#d6a243",
      note: "More modeled power is serving overhead.",
    };
  if (pue <= 2.0)
    return {
      label: "Elevated overhead",
      color: "#cf784d",
      note: "Check overhead alongside required cooling and spare capacity.",
    };
  return {
    label: "High overhead",
    color: "#d9544f",
    note: "Overhead exceeds the model's IT draw.",
  };
}

/** End-of-run letter grade across the four disciplines the sim models. */
export function gradeRun(input: {
  avgPue: number;
  peakTemp: number;
  phase: number;
  redundantPowerAtEnd: boolean;
  throttledSeconds: number;
  uptime: number;
}): { grade: string; color: string; notes: string[] } {
  let score = 0;
  const notes: string[] = [];

  if (input.avgPue > 0 && isFinite(input.avgPue)) {
    if (input.avgPue <= 1.2) {
      score += 3;
      notes.push(
        "The model's average overhead ratio stayed low; this does not establish real-world efficiency.",
      );
    } else if (input.avgPue <= 1.4) {
      score += 2;
      notes.push("The model's average overhead ratio remained modest.");
    } else if (input.avgPue <= 1.7) {
      score += 1;
      notes.push(
        "The model's overhead ratio rose; review cooling draw alongside thermal margin.",
      );
    } else {
      notes.push(
        "The model's overhead ratio was elevated. Check cooling needs and spare capacity before removing equipment.",
      );
    }
  }

  if (input.peakTemp < 70) {
    score += 2;
    notes.push("Thermal margin was never seriously threatened.");
  } else if (input.peakTemp < 90) {
    score += 1;
    notes.push("Thermal margin narrowed under load but held.");
  } else {
    notes.push(
      "The model's thermal stress approached its failure threshold; this does not measure real thermal ride-through time.",
    );
  }

  if (input.redundantPowerAtEnd) {
    score += 2;
    notes.push(
      "At the end of the run, distribution had enough spare capacity to cover one PDU loss in this model.",
    );
  } else {
    notes.push(
      "At the end of the run, distribution lacked a spare PDU's capacity. Earlier redundancy is not recorded by this metric.",
    );
  }

  if (input.throttledSeconds < 5) {
    score += 2;
    notes.push("Almost no work was lost to thermal throttling.");
  } else if (input.throttledSeconds < 25) {
    score += 1;
    notes.push("Some throughput was lost to throttling; hot spots persisted.");
  } else {
    notes.push(
      "Sustained throttling wasted power on work that was never completed.",
    );
  }

  if (input.phase >= 4) score += 1;

  const table: [number, string, string][] = [
    [9, "A", "#80b784"],
    [7, "B", "#78c8c0"],
    [5, "C", "#d6a243"],
    [3, "D", "#cf784d"],
    [0, "E", "#d9544f"],
  ];
  const [, grade, color] =
    table.find(([min]) => score >= min) ?? table[table.length - 1];
  return { grade, color, notes };
}

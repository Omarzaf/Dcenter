import { validateMission } from "../firstlight/model.ts";
import type { MissionState } from "../firstlight/types.ts";
import type {
  CampaignChapter,
  CampaignChoice,
  CampaignMetrics,
  CampaignStage,
  CampaignState,
  CampaignVisual,
  DispatchResult,
  ScenarioAssumptions,
  ScenarioForecast,
  ScheduleTask,
} from "./types.ts";

// All durations, prices and capacities below are authored teaching assumptions.
// They describe this fictional facility, not engineering designs or forecasts.
export const CAMPAIGN_STAGES: CampaignStage[] = [
  "requirements",
  "site",
  "cooling-design",
  "procurement",
  "groundworks",
  "promise-review",
  "trace-routes",
  "network-design",
  "power-design",
  "maintenance-test",
  "maintenance-explain",
  "weak-link-review",
  "shipment-signal",
  "shipment-response",
  "client-commitment",
  "wait-delivery",
  "install-expansion",
  "commission-expansion",
  "open-expansion",
  "shipment-review",
  "heat-signal",
  "community-promise",
  "shift-one",
  "shift-two",
  "shift-three",
  "heat-explain",
  "week-review",
  "cable-signal",
  "cable-response",
  "restore-route",
  "recovery-test",
  "continuity-plan",
  "complete",
];
const BATTERY_CAPACITY = 12;
const BATTERY_POWER = 4;
const CRITICAL_KW = 6;
const round = (n: number) => Math.round((n + Number.EPSILON) * 10_000) / 10_000;
const chapterOf = (index: number): CampaignChapter =>
  index < 6 ? 2 : index < 12 ? 3 : index < 20 ? 4 : index < 27 ? 5 : 6;
const installDays = (s: CampaignState) => (s.requirements === "full" ? 3 : 2);
const designedDemand = (s: CampaignState) =>
  s.requirements === "full" ? 18 : s.requirements === "phased" ? 12 : 6;
const normalGrid = (s: CampaignState) => (s.requirements === "full" ? 27 : 18);
const fullDemand = (s: CampaignState) =>
  s.expansionPhase === "online" ? designedDemand(s) : 6;
const prerequisiteDay = (s: CampaignState) =>
  Math.max(s.gridDay, s.hardwareDay, s.shellDay);
function expectedOpening(s: CampaignState): number {
  if (s.actualOpenDay !== null) return s.actualOpenDay;
  if (s.expansionPhase === "commissioned") return s.day;
  if (s.expansionPhase === "installed")
    return round(Math.max(s.day, prerequisiteDay(s)) + 1);
  return round(Math.max(s.day, prerequisiteDay(s)) + installDays(s) + 1);
}
function makeInitial(origin: MissionState): CampaignState {
  return {
    version: 1,
    origin: structuredClone(origin),
    stage: "requirements",
    chapter: 2,
    day: 0,
    budget: round(120 + origin.budget),
    requirements: null,
    site: null,
    cooling: null,
    supplier: null,
    network: null,
    power: null,
    routeTested: false,
    maintenancePassed: false,
    expansionPhase: "planned",
    permitDay: 0,
    gridDay: 0,
    hardwareDay: 0,
    shellDay: 0,
    promisedDay: null,
    actualOpenDay: null,
    shipmentResponse: null,
    communityPromise: null,
    batteryKwh: 0,
    waterLitres: 0,
    deferredKwh: 0,
    unservedCriticalKwh: 0,
    servedKwh: 0,
    heatShift: 0,
    lastDispatch: null,
    cableResponse: null,
    recoveryHours: 0,
    recoveryTested: false,
    journal: [],
  };
}
export function createCampaign(origin: MissionState): CampaignState {
  const valid = validateMission(origin);
  if (!valid || valid.stage !== "complete")
    throw new Error(
      "Complete and validate First Light before starting the campaign.",
    );
  return makeInitial(valid);
}
function choice(
  id: string,
  label: string,
  detail: string,
  cost = 0,
  days = 0,
  disabledReason?: string,
): CampaignChoice {
  return {
    id,
    label,
    detail,
    cost,
    days: round(days),
    ...(disabledReason ? { disabledReason } : {}),
  };
}

/** Each heat choice is a two-hour exercise window; gaps and the rest of the week are not simulated. */
function dispatch(
  s: CampaignState,
  mode: string,
  shift = s.heatShift,
): DispatchResult {
  const hours = 2;
  const demand = designedDemand(s);
  const gridKw =
    ([12, 9, 8][Math.min(2, shift)] ?? 8) + (s.requirements === "full" ? 4 : 0);
  const waterLimitLph = [18, 12, 10][Math.min(2, shift)] ?? 10;
  const dry = mode === "dry" || (mode === "battery" && s.cooling === "hybrid");
  const powerFactor = dry ? 1.5 : 1.25;
  const waterFactor = dry ? 0 : s.cooling === "hybrid" ? 1.4 : 2;
  const requestedKw = mode === "critical" ? CRITICAL_KW : demand;
  const waterBudget =
    mode === "water" ? Math.min(8, waterLimitLph) : waterLimitLph;
  const waterCapacity = waterFactor === 0 ? demand : waterBudget / waterFactor;
  const dischargeKw =
    mode === "battery" && s.power === "battery"
      ? Math.min(BATTERY_POWER, s.batteryKwh / hours)
      : 0;
  const served = Math.max(
    0,
    Math.min(
      requestedKw,
      waterCapacity,
      (gridKw + dischargeKw - 1) / powerFactor,
    ),
  );
  const facility = served > 0 ? 1 + powerFactor * served : 0;
  const batteryUsed = Math.min(
    s.batteryKwh,
    Math.max(0, facility - gridKw) * hours,
  );
  const criticalServed = Math.min(CRITICAL_KW, served);
  const deferred =
    Math.max(0, demand - CRITICAL_KW - Math.max(0, served - CRITICAL_KW)) *
    hours;
  return {
    hours,
    requestedKw,
    servedKw: round(served),
    criticalKw: CRITICAL_KW,
    criticalServedKw: round(criticalServed),
    gridKw,
    facilityKw: round(facility),
    batteryUsedKwh: round(batteryUsed),
    batteryRemainingKwh: round(s.batteryKwh - batteryUsed),
    waterLph: round(served * waterFactor),
    waterLimitLph,
    deferredKwh: round(deferred),
    unservedCriticalKwh: round((CRITICAL_KW - criticalServed) * hours),
    explanation: `${dry ? "Installed dry cooling uses extra electricity and no on-site cooling water in this exercise." : "Wet cooling is limited by the allocated withdrawal rate."} Critical work receives capacity first. The ${hours}-hour window serves ${round(served * hours)} kWh, defers ${round(deferred)} kWh and leaves ${round((CRITICAL_KW - criticalServed) * hours)} critical kWh unserved. ${round(batteryUsed)} kWh leaves the battery; no recharge occurs between these deficit windows.`,
  };
}

export function campaignChoices(s: CampaignState): CampaignChoice[] {
  let options: CampaignChoice[] = [];
  switch (s.stage) {
    case "requirements":
      options = [
        choice(
          "requirements-phased",
          "Open a smaller first phase",
          "Scope 6 kW of new service alongside the existing 6 kW. Later capacity is a future project, not silently included.",
          4,
          1,
        ),
        choice(
          "requirements-full",
          "Build the full requested hall",
          "Scope 12 kW of new service, for 18 kW total. More useful capacity also creates more deferrable demand during shortages.",
          8,
          2,
        ),
      ];
      break;
    case "site":
      options = [
        choice(
          "site-existing",
          "Survey the existing extension",
          "Use the surveyed campus boundary. The separate expansion permit takes four days after this two-day survey.",
          4,
          2,
        ),
        choice(
          "site-new",
          "Survey a new extension parcel",
          "A larger parcel needs a four-day survey and ten additional days for the modeled permit; its grid and shell leads are longer.",
          10,
          4,
        ),
      ];
      break;
    case "cooling-design":
      options = [
        choice(
          "cooling-wet",
          "Install efficient wet cooling",
          "Specify wet cooling: 0.25 cooling/distribution kW and 2 cooling-water litres per service kWh in the heat exercises, plus 1 kW common overhead.",
          6,
          1,
        ),
        choice(
          "cooling-hybrid",
          "Install a wet and dry hybrid plant",
          "Pay now for a usable dry mode. Wet mode uses 1.4 L per service kWh; dry mode uses zero on-site cooling water but raises the power multiplier from 1.25 to 1.5.",
          14,
          2,
        ),
      ];
      break;
    case "procurement":
      options = [
        choice(
          "procurement-standard",
          "Order the standard compatible equipment",
          "Place a compatible order with a 30-day delivery lead. An alternate supplier has not been qualified.",
          8,
          2,
        ),
        choice(
          "procurement-qualified",
          "Qualify an alternate and place the order",
          "Compatibility review costs time and credits. The primary order takes 32 days; a qualified alternative becomes a real option if trade delays arrive.",
          12,
          3,
        ),
      ];
      break;
    case "groundworks": {
      const start = Math.max(s.day, s.permitDay),
        duration = s.site === "new" ? 10 : 6;
      options = [
        choice(
          "build-shell",
          "Wait for permission, then build the shell",
          `The permit must be effective on day ${s.permitDay}. Groundworks start on day ${round(start)} and finish on day ${round(start + duration)}. Hardware and grid work continue in parallel.`,
          10,
          start - s.day + duration,
        ),
      ];
      break;
    }
    case "promise-review":
      options = [
        choice(
          "promise-dependencies",
          "Opening depends on every prerequisite",
          `The planned opening is day ${expectedOpening(s)}: the latest grid, shell or hardware milestone, followed by installation and testing. Record the promise with the preparation buffer.`,
        ),
        choice(
          "promise-hardware",
          "Delivery alone determines the opening",
          "Consider whether a delivered rack can serve clients before the grid connection, installation and acceptance test are ready.",
        ),
      ];
      break;
    case "trace-routes":
      options = [
        choice(
          "trace-corridor",
          "Trace both paths to their shared corridor",
          "Two service contracts currently enter through the same physical corridor. The power equipment also shares an upstream distribution path.",
        ),
      ];
      break;
    case "network-design":
      options = [
        choice(
          "network-shared",
          "Keep two services in the shared corridor",
          "The lower-cost second service still shares the excavation risk. It is not an independent recovery path.",
          3,
          1,
        ),
        choice(
          "network-diverse",
          "Build a physically separate entry route",
          "Install another physical corridor. It becomes a demonstrated recovery path only after the maintenance exercise.",
          12,
          3,
        ),
      ];
      break;
    case "power-design":
      options = [
        choice(
          "power-shared",
          "Retain the shared electrical path",
          "Save capital, accepting that maintenance on the shared source interrupts the starter hall.",
        ),
        choice(
          "power-separated",
          "Separate the maintenance paths",
          "Provide independent on-site switching paths for this exercise. Both still depend on the same regional electricity supply.",
          10,
          2,
        ),
        choice(
          "power-battery",
          "Install a finite battery bridge",
          "Install a charged 12 kWh battery with a 4 kW continuous discharge limit. It cannot replace an 8 kW starter load by itself; the exercise sheds deferrable load.",
          12,
          1,
        ),
      ];
      break;
    case "maintenance-test":
      options = [
        choice(
          "run-maintenance",
          "Isolate the shared corridor and source",
          "Run a 15-minute controlled exercise. Trace network and electrical failure separately. A battery supports only its 4 kW rated facility load; it cannot create unlimited power or an independent cable.",
          0,
          0.25 / 24,
        ),
      ];
      break;
    case "maintenance-explain":
      options = [
        choice(
          "explain-shared",
          "Shared dependencies can defeat extra equipment",
          "Independent paths must be traced and exercised. A battery also needs enough discharge power and energy for the intended service.",
        ),
        choice(
          "explain-count",
          "Two devices guarantee uninterrupted service",
          "Count the physical routes and their common dependencies, then compare both battery kW and kWh to the load.",
        ),
      ];
      break;
    case "weak-link-review":
      options = [
        choice(
          "continue-shipment",
          "Record the remaining maintenance limitations",
          `${s.routeTested ? "The diverse network route passed its exercise." : "The network still shares a corridor."} ${s.power === "separated" ? "Separated switching maintained the starter load." : s.power === "battery" ? "The battery bridged a reduced 4 kW facility load for 15 minutes, consuming 1 kWh; it did not maintain all service." : "The shared power path interrupted the exercise."} No automatic battery refill follows.`,
        ),
      ];
      break;
    case "shipment-signal":
      options = [
        choice(
          "review-delays",
          "Read the trade and transformer notices separately",
          "A fictional trade-policy change delays only undelivered new hardware: 16 days for the standard order or 12 for the qualified order. An independent transformer slip adds 14 days to the expansion grid milestone. The commissioned first hall continues operating.",
          0,
          1,
        ),
      ];
      break;
    case "shipment-response":
      options = [
        choice(
          "wait-shipment",
          "Keep the compatible order and wait",
          `Keep the hardware arrival at day ${s.hardwareDay}; the grid milestone remains day ${s.gridDay}.`,
        ),
        choice(
          "qualified-alternate",
          "Use the qualified alternative",
          "A previously qualified compatible order can arrive six days after this decision. This does not accelerate the transformer.",
          8,
          0,
          s.supplier !== "qualified"
            ? "Qualify an alternate supplier in Chapter 2 first."
            : undefined,
        ),
        choice(
          "reserved-slot",
          "Exercise the reserved qualified slot",
          "The First Light reservation plus Chapter 2 qualification enables a compatible four-day delivery slot. It is still not an operational hall.",
          6,
          0,
          s.origin.expansionChoice !== "reserve" || s.supplier !== "qualified"
            ? "Requires both the First Light reservation and Chapter 2 supplier qualification."
            : undefined,
        ),
        choice(
          "phased-shipment",
          "Accept the preplanned first-phase shipment",
          "The First Light phased study and a smaller scope enable a compatible first-phase arrival in ten days. The rest remains outside this commissioned scope.",
          4,
          0,
          s.origin.expansionChoice !== "phase" || s.requirements !== "phased"
            ? "Requires the First Light phased study and a phased expansion scope."
            : undefined,
        ),
      ];
      break;
    case "client-commitment":
      options = [
        choice(
          "promise-original",
          "Keep the original opening promise",
          `Keep day ${s.promisedDay}; a promise does not change construction dates. Forecast opening: day ${expectedOpening(s)}.`,
        ),
        choice(
          "promise-revised",
          "Renegotiate a feasible opening date",
          `Tell the client the revised critical path and record day ${expectedOpening(s)}. The original and revised commitments remain in the journal.`,
        ),
      ];
      break;
    case "wait-delivery":
      options = [
        choice(
          "await-milestones",
          "Wait until all three prerequisites are ready",
          `Grid day ${s.gridDay}, hardware day ${s.hardwareDay}, shell day ${s.shellDay}: wait for the latest, not the sum. Nothing is installed by this action.`,
          0,
          Math.max(0, prerequisiteDay(s) - s.day),
        ),
      ];
      break;
    case "install-expansion":
      options = [
        choice(
          "install-expansion",
          "Install and connect the delivered expansion",
          "Installation uses the permitted shell, delivered compatible hardware and completed grid work. Service stays in the first hall during this work.",
          6,
          installDays(s),
          s.expansionPhase !== "delivered" || s.day < prerequisiteDay(s)
            ? "Wait for the delivered hardware, shell and grid milestones."
            : undefined,
        ),
      ];
      break;
    case "commission-expansion":
      options = [
        choice(
          "commission-expansion",
          "Test the installed expansion under load",
          "Run the designed power, cooling, network and acceptance checks. A successful test permits a separate customer handover; it does not switch customers automatically.",
          2,
          1,
          s.expansionPhase !== "installed"
            ? "Install the expansion first."
            : undefined,
        ),
      ];
      break;
    case "open-expansion":
      options = [
        choice(
          "open-expansion",
          "Accept the expansion service",
          `Activate the commissioned capacity for ${designedDemand(s)} kW total service.`,
          0,
          0,
          s.expansionPhase !== "commissioned"
            ? "Commissioning must pass before customer handover."
            : undefined,
        ),
      ];
      break;
    case "shipment-review":
      options = [
        choice(
          "explain-critical-path",
          "The latest prerequisite controlled opening",
          `Actual opening: day ${s.actualOpenDay}. Improving hardware delivery helps only until another dependency becomes the limiting milestone.`,
        ),
        choice(
          "explain-add-delays",
          "Add every delay to calculate opening",
          "The grid, hardware and shell schedules overlap. Their latest finish controls when sequential installation and testing can begin.",
        ),
      ];
      break;
    case "heat-signal":
      options = [
        choice(
          "review-linked-alerts",
          "Prepare three linked shortage exercises",
          "A fictional hot week combines restricted electricity imports and cooling-water allocation. Model three explicit two-hour critical windows, not seven days of continuous operation. Regional import limits also affect separated on-site power paths.",
          0,
          7,
        ),
      ];
      break;
    case "community-promise":
      options = [
        choice(
          "promise-water",
          "Commit to at most 48 litres across the exercises",
          "A voluntary six-hour cooling-water pledge tighter than the allocation ceiling. Meet it through installed cooling options and workload decisions, not by relabeling water use.",
        ),
        choice(
          "promise-critical",
          "Commit to all 36 critical kWh",
          "Protect the 6 kW essential service during all three two-hour windows. Noncritical research can be deferred, but unmet critical demand remains visible.",
        ),
      ];
      break;
    case "shift-one":
    case "shift-two":
    case "shift-three": {
      const modes: [string, string, string, string?][] = [
        [
          "critical",
          "Protect critical work and defer research",
          "Request only the essential 6 kW; remaining capacity is deliberately deferred.",
        ],
        [
          "full",
          "Attempt the full workload on grid power",
          "Request all work; physical limits still reduce service and allocate critical demand first.",
        ],
        [
          "dry",
          "Run the installed dry cooling mode",
          "Use less cooling water at the cost of more electricity.",
          s.cooling !== "hybrid"
            ? "Dry mode requires the hybrid design selected in Chapter 2 and installed before opening."
            : undefined,
        ],
        [
          "battery",
          "Dispatch the installed battery",
          "Use up to 4 kW from the remaining stored energy; hybrid plants use dry mode for this action.",
          s.power !== "battery"
            ? "Requires the battery installed in Chapter 3."
            : undefined,
        ],
        [
          "water",
          "Limit wet cooling to 8 litres per hour",
          "Curtail workload to a tighter water target, even when this reduces critical service.",
        ],
      ];
      options = modes.map(([id, label, detail, disabled]) => {
        const d = dispatch(s, id);
        return choice(
          `${s.stage}-${id}`,
          label,
          `${detail} Preview: ${d.servedKw} kW served, ${d.waterLph} L/h, ${d.batteryUsedKwh} kWh battery, ${d.unservedCriticalKwh} critical kWh unmet over two hours.`,
          0,
          2 / 24,
          disabled,
        );
      });
      break;
    }
    case "heat-explain":
      options = [
        choice(
          "explain-energy",
          "kW is a rate; kWh is a finite quantity",
          "Power limits the instantaneous load; stored energy limits how long the battery can support it. Water allocation and cooling mode impose separate constraints.",
        ),
        choice(
          "explain-power",
          "A 12 kWh battery provides 12 kW indefinitely",
          "Divide stored kWh by discharge kW to get hours, then check the independent discharge rating. Neither number is an unlimited supply.",
        ),
      ];
      break;
    case "week-review":
      options = [
        choice(
          "continue-handover",
          "Record the six-hour exercise outcomes",
          `Served ${s.servedKwh} kWh; deferred ${s.deferredKwh} kWh; unmet critical ${s.unservedCriticalKwh} kWh; cooling water ${s.waterLitres} L. These are the three modeled windows, not whole-week totals. ${s.communityPromise === "promise-water" ? `The 48 L pledge was ${s.waterLitres <= 48 ? "kept" : "exceeded"}.` : `The critical-service pledge was ${s.unservedCriticalKwh === 0 ? "kept" : "missed"}.`}`,
        ),
      ];
      break;
    case "cable-signal":
      options = [
        choice(
          "review-corridor",
          "Trace the outage without guessing its cause",
          "The shared corridor loses connectivity. The cause is unknown; repair access is uncertain. For this authored exercise, access and repair will take 12 hours once the response is selected.",
          0,
          1,
        ),
      ];
      break;
    case "cable-response":
      options = [
        choice(
          "use-diverse",
          "Fail over to the tested independent route",
          "The previously tested physical route maintains full service during the shared-corridor outage.",
          0,
          0,
          s.network !== "diverse" || !s.routeTested
            ? "Requires the physically diverse route and its Chapter 3 test."
            : undefined,
        ),
        choice(
          "order-emergency",
          "Procure a temporary critical-service route",
          "Order a limited 6 kW-equivalent service path: six hours to deliver, then a separate one-hour test. It cannot restore connectivity instantly.",
          8,
        ),
        choice(
          "local-teaching",
          "Switch to a limited local teaching mode",
          "Provide 3 kW-equivalent locally usable teaching service while external access is unavailable. This is controlled degradation, not full continuity.",
          1,
        ),
        choice(
          "wait-repair",
          "Pause remote service while repair is arranged",
          "Preserve capital while accepting interruption. Keep the unknown cause distinct from the scenario repair-access assumption.",
        ),
      ];
      break;
    case "restore-route":
      options = [
        s.cableResponse === "order-emergency"
          ? choice(
              "receive-emergency",
              "Wait six hours for the emergency route",
              "Delivery installs the temporary path; customer traffic must wait for a recovery test.",
              0,
              6 / 24,
            )
          : choice(
              "await-route-repair",
              "Coordinate the twelve-hour repair window",
              "The scenario now grants access and completes repair. The unknown cause remains unknown; the repaired path still needs a functional test.",
              0,
              12 / 24,
            ),
      ];
      break;
    case "recovery-test":
      options = [
        choice(
          "test-recovery",
          "Test the restored path before accepting traffic",
          s.cableResponse === "order-emergency"
            ? "Verify the temporary route for 6 kW-equivalent critical service. Other remote work remains deferred until a future permanent repair."
            : "Verify the repaired original path, alarms and handover before restoring normal remote service.",
          1,
          1 / 24,
        ),
      ];
      break;
    case "continuity-plan":
      options = [
        choice(
          "plan-exercise",
          "Fund an exercised continuity handover",
          "Record physical dependencies, named recovery responsibilities, client updates, critical workload priorities and a funded follow-up exercise. An exercise is not a promise of zero future outages.",
          3,
        ),
        choice(
          "plan-minimum",
          "Hand over the limitations and deferred work",
          "Record tested paths, unresolved dependencies and client commitments. Preserve cash and explicitly leave future improvements unfunded.",
        ),
      ];
      break;
    case "complete":
      return [];
  }
  return options.map((option) =>
    option.cost > s.budget && !option.disabledReason
      ? {
          ...option,
          disabledReason: `Needs ${option.cost} credits; ${s.budget} remain.`,
        }
      : option,
  );
}

const WRONG: Record<string, string> = {
  "promise-hardware":
    "Delivered equipment still requires the shell, grid, installation and commissioning. Opening follows the latest prerequisite plus sequential work.",
  "explain-count":
    "Additional devices can share a single failure domain. Trace the physical paths, and check battery power and energy separately.",
  "explain-add-delays":
    "Parallel delays are not added together. The latest required milestone controls when installation and commissioning can begin.",
  "explain-power":
    "kW measures power and kWh measures energy. Finite energy divided by discharge power gives duration, subject to the battery discharge rating.",
};
function apply(
  s: CampaignState,
  id: string,
): { state: CampaignState; error?: string } {
  const option = campaignChoices(s).find((item) => item.id === id);
  if (!option)
    return {
      state: s,
      error: "That action is not available at this campaign stage.",
    };
  if (option.disabledReason) return { state: s, error: option.disabledReason };
  if (WRONG[id]) return { state: s, error: WRONG[id] };
  const next: CampaignState = structuredClone(s);
  next.budget = round(s.budget - option.cost);
  next.day = round(s.day + option.days);
  let detail = option.detail;
  switch (s.stage) {
    case "requirements":
      next.requirements = id === "requirements-phased" ? "phased" : "full";
      break;
    case "site":
      next.site = id === "site-existing" ? "existing" : "new";
      next.permitDay = round(next.day + (next.site === "existing" ? 4 : 10));
      break;
    case "cooling-design":
      next.cooling = id === "cooling-wet" ? "wet" : "hybrid";
      break;
    case "procurement":
      next.supplier = id === "procurement-standard" ? "standard" : "qualified";
      next.hardwareDay = round(
        next.day + (next.supplier === "qualified" ? 32 : 30),
      );
      next.gridDay = round(next.day + (s.site === "new" ? 34 : 26));
      next.expansionPhase = "ordered";
      break;
    case "groundworks":
      next.shellDay = next.day;
      next.expansionPhase = "foundation";
      break;
    case "promise-review":
      next.promisedDay = round(
        expectedOpening(s) +
          (s.origin.expansionChoice === "phase"
            ? 3
            : s.origin.expansionChoice === "reserve"
              ? 1
              : 0),
      );
      detail += ` Original promise recorded: day ${next.promisedDay}.`;
      break;
    case "network-design":
      next.network = id === "network-diverse" ? "diverse" : "shared";
      break;
    case "power-design":
      next.power =
        id === "power-separated"
          ? "separated"
          : id === "power-battery"
            ? "battery"
            : "shared";
      next.batteryKwh = next.power === "battery" ? BATTERY_CAPACITY : 0;
      break;
    case "maintenance-test":
      next.routeTested = s.network === "diverse";
      next.maintenancePassed = next.routeTested && s.power === "separated";
      if (s.power === "battery")
        next.batteryKwh = round(s.batteryKwh - BATTERY_POWER * 0.25);
      detail += ` Network: ${next.routeTested ? "independent path passed" : "both services failed together"}. Power: ${s.power === "separated" ? "full starter load maintained" : s.power === "battery" ? "4 kW facility bridge only; 1 kWh consumed, full load not maintained" : "shared source interrupted"}.`;
      break;
    case "shipment-signal":
      next.hardwareDay += s.supplier === "qualified" ? 12 : 16;
      next.gridDay += 14;
      break;
    case "shipment-response":
      next.shipmentResponse = id;
      if (id !== "wait-shipment")
        next.hardwareDay = Math.min(
          s.hardwareDay,
          round(
            s.day +
              (id === "reserved-slot"
                ? 4
                : id === "qualified-alternate"
                  ? 6
                  : 10),
          ),
        );
      detail += ` Hardware day ${next.hardwareDay}; grid day ${next.gridDay}.`;
      break;
    case "client-commitment":
      if (id === "promise-revised") next.promisedDay = expectedOpening(s);
      break;
    case "wait-delivery":
      next.expansionPhase = "delivered";
      break;
    case "install-expansion":
      next.expansionPhase = "installed";
      break;
    case "commission-expansion":
      next.expansionPhase = "commissioned";
      break;
    case "open-expansion":
      next.expansionPhase = "online";
      next.actualOpenDay = next.day;
      break;
    case "community-promise":
      next.communityPromise = id;
      break;
    case "shift-one":
    case "shift-two":
    case "shift-three": {
      const result = dispatch(s, id.slice(s.stage.length + 1));
      next.lastDispatch = result;
      next.heatShift = s.heatShift + 1;
      next.batteryKwh = result.batteryRemainingKwh;
      next.waterLitres = round(s.waterLitres + result.waterLph * result.hours);
      next.deferredKwh = round(s.deferredKwh + result.deferredKwh);
      next.unservedCriticalKwh = round(
        s.unservedCriticalKwh + result.unservedCriticalKwh,
      );
      next.servedKwh = round(s.servedKwh + result.servedKw * result.hours);
      detail =
        result.explanation +
        ` Water: ${result.waterLph} L/h against ${result.waterLimitLph} L/h allocation.`;
      break;
    }
    case "cable-response":
      next.cableResponse = id;
      break;
    case "restore-route":
      next.recoveryHours = s.cableResponse === "order-emergency" ? 6 : 12;
      break;
    case "recovery-test":
      next.recoveryHours = s.recoveryHours + 1;
      next.recoveryTested = true;
      detail += ` ${next.recoveryHours} elapsed exercise hours before the recovery test completed. Outage cause: unknown.`;
      break;
    default:
      break;
  }
  next.journal.push({
    chapter: s.chapter,
    stage: s.stage,
    choice: id,
    day: next.day,
    title: option.label,
    detail,
    spent: option.cost,
  });
  const index = CAMPAIGN_STAGES.indexOf(s.stage) + 1;
  next.stage = CAMPAIGN_STAGES[index];
  next.chapter = chapterOf(index);
  return { state: next };
}

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a),
    bk = Object.keys(b);
  return (
    ak.length === bk.length &&
    ak.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        same(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
}
/** Reconstruct all consequences from a validated origin and the authored choice journal. */
export function validateCampaign(value: unknown): CampaignState | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      !Array.isArray(data.journal) ||
      data.journal.length > 32 ||
      JSON.stringify(value).length > 100_000
    )
      return null;
    const origin = validateMission(data.origin);
    if (!origin || origin.stage !== "complete") return null;
    let state = makeInitial(origin);
    for (const item of data.journal) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.choice !== "string" ||
        item.choice.length > 64
      )
        return null;
      const next = apply(state, item.choice);
      if (next.error) return null;
      state = next.state;
    }
    return same(state, value) ? state : null;
  } catch {
    return null;
  }
}
export function transitionCampaign(
  state: CampaignState,
  choiceId: string,
): { state: CampaignState; error?: string } {
  const valid = validateCampaign(state);
  if (!valid)
    return {
      state,
      error:
        "This campaign state could not be validated. Restore a valid checkpoint.",
    };
  if (typeof choiceId !== "string" || choiceId.length > 64)
    return { state, error: "Choose an authored campaign action." };
  const next = apply(valid, choiceId);
  return next.error ? { state, error: next.error } : next;
}
export function replayChapter(
  state: CampaignState,
  chapter: CampaignChapter,
): CampaignState | null {
  const valid = validateCampaign(state);
  if (!valid || ![2, 3, 4, 5, 6].includes(chapter) || chapter > valid.chapter)
    return null;
  let replay = makeInitial(valid.origin);
  for (const record of valid.journal) {
    if (record.chapter >= chapter) break;
    const result = apply(replay, record.choice);
    if (result.error) return null;
    replay = result.state;
  }
  return replay.chapter === chapter ? replay : null;
}

function cableService(s: CampaignState, demand: number): number {
  const index = CAMPAIGN_STAGES.indexOf(s.stage);
  if (index < CAMPAIGN_STAGES.indexOf("cable-response")) return demand;
  if (s.recoveryTested)
    return s.cableResponse === "order-emergency"
      ? Math.min(CRITICAL_KW, demand)
      : demand;
  if (
    s.cableResponse === "use-diverse" &&
    s.routeTested &&
    s.network === "diverse"
  )
    return demand;
  return s.cableResponse === "local-teaching" ? 3 : 0;
}
export function campaignMetrics(s: CampaignState): CampaignMetrics {
  const demandKw = fullDemand(s);
  const heat = s.chapter === 5 && s.heatShift > 0 && s.lastDispatch;
  const serviceKw = heat ? s.lastDispatch!.servedKw : cableService(s, demandKw);
  const facilityKw = heat
    ? s.lastDispatch!.facilityKw
    : serviceKw
      ? round((s.expansionPhase === "online" ? 1 : 0.5) + 1.25 * serviceKw)
      : 0;
  const upcoming =
    s.chapter === 5 && s.heatShift < 3 ? dispatch(s, "critical") : null;
  const gridKw = upcoming
    ? upcoming.gridKw
    : heat
      ? s.lastDispatch!.gridKw
      : s.expansionPhase === "online"
        ? normalGrid(s)
        : 12;
  const waterLph = heat
    ? s.lastDispatch!.waterLph
    : round(serviceKw * (s.cooling === "hybrid" ? 1.4 : 2));
  // Duration at the battery's rated 4 kW output, not a promise of full IT service.
  const reserveMinutes =
    s.power === "battery" ? round((60 * s.batteryKwh) / BATTERY_POWER) : 0;
  const waterKept =
    s.communityPromise === "promise-water" && s.heatShift === 3
      ? s.waterLitres <= 48
      : null;
  let continuityLabel = s.routeTested
    ? "Tested independent network route"
    : "Shared network corridor remains";
  if (s.chapter === 6 && s.cableResponse)
    continuityLabel = s.recoveryTested
      ? s.cableResponse === "order-emergency"
        ? "Temporary critical route tested; other remote work deferred"
        : `Original route recovery tested after ${s.recoveryHours} hours; cause unknown`
      : s.cableResponse === "use-diverse"
        ? "Full service on the tested independent path"
        : s.cableResponse === "local-teaching"
          ? "Limited local teaching while remote connectivity is unavailable"
          : "Remote service awaits delivery/repair and testing";
  return {
    serviceKw,
    criticalKw: Math.min(CRITICAL_KW, demandKw),
    demandKw,
    facilityKw,
    gridKw,
    waterLph,
    waterLimitLph: upcoming
      ? upcoming.waterLimitLph
      : heat
        ? s.lastDispatch!.waterLimitLph
        : 100,
    reserveMinutes,
    expectedOpeningDay: expectedOpening(s),
    openingKept:
      s.actualOpenDay !== null && s.promisedDay !== null
        ? s.actualOpenDay <= s.promisedDay
        : null,
    waterKept,
    continuityLabel,
  };
}
export function campaignSchedule(s: CampaignState): ScheduleTask[] {
  const phase = [
    "planned",
    "ordered",
    "foundation",
    "delivered",
    "installed",
    "commissioned",
    "online",
  ].indexOf(s.expansionPhase);
  const ready = (day: number, complete: boolean): ScheduleTask["status"] =>
    complete ? "complete" : day > 0 && s.day >= day ? "ready" : "pending";
  const start = Math.max(s.day, prerequisiteDay(s));
  const open = expectedOpening(s);
  return [
    {
      id: "permit",
      label: "Expansion permission",
      day: s.permitDay,
      status: ready(s.permitDay, phase >= 2),
      dependency:
        "Survey completed; separate expansion permit effective before groundworks",
    },
    {
      id: "shell",
      label: "Permitted shell",
      day: s.shellDay,
      status: ready(s.shellDay, phase >= 2),
      dependency: `Groundworks only after permit day ${s.permitDay}`,
    },
    {
      id: "hardware",
      label: "Compatible hardware delivery",
      day: s.hardwareDay,
      status: ready(s.hardwareDay, phase >= 3),
      dependency: "Placed compatible order and selected shipment response",
    },
    {
      id: "grid",
      label: "Expansion grid and transformer",
      day: s.gridDay,
      status: ready(s.gridDay, phase >= 3),
      dependency:
        "Independent utility works; hardware substitutes do not move this date",
    },
    {
      id: "installation",
      label: "Install delivered expansion",
      day:
        phase >= 4
          ? s.journal.find((r) => r.stage === "install-expansion")!.day
          : round(start + installDays(s)),
      status: phase >= 4 ? "complete" : phase >= 3 ? "ready" : "pending",
      dependency:
        "Shell AND grid AND compatible hardware, then sequential installation",
    },
    {
      id: "commissioning",
      label: "Commission and accept service",
      day: open,
      status: phase >= 6 ? "complete" : phase >= 5 ? "ready" : "pending",
      dependency:
        "Installed equipment, a separate acceptance test, then explicit customer handover",
    },
  ];
}
export function campaignVisual(s: CampaignState): CampaignVisual {
  const m = campaignMetrics(s);
  return {
    chapter: s.chapter,
    expansionPhase: s.expansionPhase,
    networkDiverse: s.network === "diverse",
    networkTested: s.routeTested || s.recoveryTested,
    powerSeparated: s.power === "separated",
    batteryInstalled: s.power === "battery",
    batteryFraction: s.batteryKwh / BATTERY_CAPACITY,
    hybridCooling: s.cooling === "hybrid",
    heat: s.chapter === 5,
    cableOutage:
      s.chapter === 6 &&
      CAMPAIGN_STAGES.indexOf(s.stage) >= 28 &&
      (!s.recoveryTested || s.cableResponse === "order-emergency"),
    emergencyRoute:
      s.cableResponse === "order-emergency" &&
      CAMPAIGN_STAGES.indexOf(s.stage) >= 30,
    gridLimited: s.chapter === 5,
    serviceFraction: m.demandKw ? m.serviceKw / m.demandKw : 0,
  };
}
function bounded(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, value));
}
export function forecastScenario(
  s: CampaignState,
  assumptions: ScenarioAssumptions,
): ScenarioForecast {
  const a =
    assumptions && typeof assumptions === "object"
      ? assumptions
      : ({} as ScenarioAssumptions);
  const hardwareDelay = bounded(a.hardwareDelayDays, 90),
    gridDelay = bounded(a.gridDelayDays, 90);
  const gridReduction = bounded(a.gridReductionPercent, 100),
    waterReduction = bounded(a.waterReductionPercent, 100);
  const projectedDemand = designedDemand(s);
  const prerequisitesCompleted = [
    "delivered",
    "installed",
    "commissioned",
    "online",
  ].includes(s.expansionPhase);
  const hardware = s.hardwareDay + (prerequisitesCompleted ? 0 : hardwareDelay),
    gridDay = s.gridDay + (prerequisitesCompleted ? 0 : gridDelay);
  const dates: [string, number][] = [
    ["hardware", hardware],
    ["grid", gridDay],
    ["shell", s.shellDay],
    ["current decision day", s.day],
  ];
  const latest = Math.max(...dates.map((entry) => entry[1]));
  const criticalPath = dates
    .filter((entry) => entry[1] === latest)
    .map((entry) => entry[0])
    .join(" + ");
  const openingDay =
    s.actualOpenDay !== null
      ? s.actualOpenDay
      : round(
          latest +
            (s.expansionPhase === "commissioned"
              ? 0
              : s.expansionPhase === "installed"
                ? 1
                : installDays(s) + 1),
        );
  const gridKw = normalGrid(s) * (1 - gridReduction / 100);
  const water = 36 * (1 - waterReduction / 100);
  const wetFactor = s.cooling === "hybrid" ? 1.4 : 2;
  const wet = Math.max(
    0,
    Math.min(projectedDemand, (gridKw - 1) / 1.25, water / wetFactor),
  );
  const dry =
    s.cooling === "hybrid"
      ? Math.max(0, Math.min(projectedDemand, (gridKw - 1) / 1.5))
      : 0;
  const thermalService = Math.max(wet, dry);
  const independent = s.network === "diverse" && s.routeTested;
  const ongoingOutage =
    s.chapter === 6 &&
    CAMPAIGN_STAGES.indexOf(s.stage) >= 28 &&
    (!s.recoveryTested || s.cableResponse === "order-emergency");
  const networkCapacity =
    a.corridorOutage === true || ongoingOutage
      ? independent
        ? projectedDemand
        : s.cableResponse === "order-emergency" && s.recoveryTested
          ? CRITICAL_KW
          : s.cableResponse === "local-teaching"
            ? 3
            : 0
      : projectedDemand;
  const service = Math.min(thermalService, networkCapacity);
  // A power bridge is feasible only if the installed cooling mode can also
  // support critical load under this water allocation and the cable is usable.
  const possibleDeficits = [
    ...(water / wetFactor >= CRITICAL_KW
      ? [Math.max(0, 1 + 1.25 * CRITICAL_KW - gridKw)]
      : []),
    ...(s.cooling === "hybrid"
      ? [Math.max(0, 1 + 1.5 * CRITICAL_KW - gridKw)]
      : []),
  ];
  const deficit = possibleDeficits.length
    ? Math.min(...possibleDeficits)
    : Infinity;
  const networkAvailable = networkCapacity >= CRITICAL_KW;
  const batteryMinutes =
    s.power === "battery" &&
    deficit > 0 &&
    deficit <= BATTERY_POWER &&
    networkAvailable
      ? round((60 * s.batteryKwh) / deficit)
      : 0;
  return {
    openingDay,
    criticalPath:
      s.actualOpenDay !== null
        ? "Already opened; new shipment delays do not disable commissioned hardware"
        : criticalPath,
    serviceKw: round(service),
    criticalServedKw: round(Math.min(CRITICAL_KW, service)),
    batteryMinutes,
    explanation: [
      `Hypothetical inputs only: hardware +${round(hardwareDelay)} days, grid +${round(gridDelay)} days, grid supply −${round(gridReduction)}%, cooling-water allocation −${round(waterReduction)}%. Delays are bounded to 0–90 days and reductions to 0–100%.`,
      `Selected design at commissioning: ${projectedDemand} kW service and ${normalGrid(s)} kW grid capacity. This planning comparison does not turn uncommissioned equipment into live service.`,
      "Hardware, grid and shell are parallel prerequisites. Installation and acceptance testing follow them. New lead-time assumptions do not undo completed delivery/grid milestones or remove operating capacity.",
      `${s.cooling === "hybrid" ? "The selected hybrid design permits comparing wet and dry modes after installation; the higher sustainable service is shown." : "The selected design uses wet cooling."} Sustainable service excludes temporary battery output; battery minutes describe a separate, finite critical-load bridge.`,
      a.corridorOutage === true || ongoingOutage
        ? independent
          ? "The exercised independent corridor can carry traffic."
          : s.cableResponse === "order-emergency" && s.recoveryTested
            ? "The temporary tested route supports 6 kW of critical service; the original corridor remains unrepaired."
            : s.cableResponse === "local-teaching"
              ? "Only the 3 kW-equivalent local teaching mode is available during the corridor outage."
              : "The corridor failure removes remote connectivity; batteries cannot restore a cable."
        : "No corridor outage is assumed.",
    ],
  };
}

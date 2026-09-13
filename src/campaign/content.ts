import type { CampaignStage, CampaignState } from "./types";

export type Guide = "mara" | "ishan" | "leila" | "rafi";
export const GUIDES: Record<
  Guide,
  { name: string; role: string; initials: string; color: string }
> = {
  mara: {
    name: "Mara",
    role: "Facilities lead",
    initials: "M",
    color: "#dcc396",
  },
  ishan: {
    name: "Ishan",
    role: "Procurement lead",
    initials: "I",
    color: "#b0c7d5",
  },
  leila: {
    name: "Leila",
    role: "Network engineer",
    initials: "L",
    color: "#b7c6aa",
  },
  rafi: {
    name: "Rafi",
    role: "Community representative",
    initials: "R",
    color: "#d9b5a1",
  },
};
export const CHAPTERS = [
  {
    number: 1,
    title: "First light",
    subtitle: "One rack. A complete service.",
  },
  {
    number: 2,
    title: "The promise",
    subtitle: "An opening date is a chain of dependencies.",
  },
  {
    number: 3,
    title: "The weak link",
    subtitle: "Two labels can conceal one failure.",
  },
  {
    number: 4,
    title: "The shipment",
    subtitle: "Protect the opening, not just the delivery.",
  },
  {
    number: 5,
    title: "The long week",
    subtitle: "Keep essential services inside physical limits.",
  },
  {
    number: 6,
    title: "The handover",
    subtitle: "Leave a service someone else can recover.",
  },
] as const;

export interface StageCopy {
  title: string;
  instruction: string;
  question: string;
  guide: Guide;
  dialogue: string;
  detail: string;
  target: string;
}
const stage = (
  title: string,
  instruction: string,
  question: string,
  guide: Guide,
  dialogue: string,
  detail: string,
  target: string,
): StageCopy => ({
  title,
  instruction,
  question,
  guide,
  dialogue,
  detail,
  target,
});

const COPY: Record<CampaignStage, StageCopy> = {
  requirements: stage(
    "A larger promise",
    "Define the new client's service before sizing the second hall.",
    "How much should we commit to opening at once?",
    "ishan",
    "The university is online. The board has released a 120-credit expansion grant, added to the budget you carried forward from First Light. A regional research service wants room here. Before I reserve anything, tell me which work must run now and which work can wait.",
    "A smaller first phase lowers the initial obligation. A full launch serves more demand, but the plant, delivery schedule and operating resources must support that promise together.",
    "expansion",
  ),
  site: stage(
    "Permission before concrete",
    "Choose the expansion site and inspect its permit and grid dates.",
    "Which site gives this promise a workable path?",
    "mara",
    "The existing campus has a head start. The new plot gives us another option, with its own approvals. Neither choice makes the utility queue disappear.",
    "The permit, shell, hardware and grid connection are separate prerequisites. Work can happen in parallel. The latest prerequisite governs when installation can begin.",
    "expansion",
  ),
  "cooling-design": stage(
    "Choose the heat's destination",
    "Set the new hall's cooling design before ordering equipment.",
    "Which electricity–water tradeoff can this site support?",
    "rafi",
    "Our water supply serves homes as well as this campus. A cooling choice made today will shape what you can promise during a dry week.",
    "The game's wet and hybrid options use different amounts of electricity and water. Neither is a universal recommendation; later weather and allocation assumptions make the tradeoff visible.",
    "cooling",
  ),
  procurement: stage(
    "A supplier, and an option",
    "Reserve compatible hardware and decide whether to qualify an alternative.",
    "Is the option to switch worth paying for now?",
    "ishan",
    "A second name in my contacts is not a qualified supplier. We would need compatible equipment, checked interfaces and a workable delivery route before switching.",
    "Qualification creates a later response option. It does not remove approvals, transport time, transformer dependencies or commissioning.",
    "delivery",
  ),
  groundworks: stage(
    "Make the site real",
    "Authorize the shell once the site's prerequisites allow the work.",
    "What will exist after this construction step?",
    "mara",
    "We can pour a foundation. We cannot pour an operating service. Watch the shell become visible, then keep the missing dependencies in the schedule.",
    "Physical works create an unfinished hall. Delivery, installation, testing and opening remain distinct stages with their own prerequisites.",
    "expansion",
  ),
  "promise-review": stage(
    "Read the whole promise",
    "Explain what determines the earliest possible opening.",
    "Which date should a project lead watch?",
    "ishan",
    "The new hall is taking shape. Before we carry a date to the client, trace every item still between this shell and a working service.",
    "A hardware date alone cannot establish readiness. The critical path follows unfinished dependencies, including work that must happen after all equipment arrives.",
    "expansion",
  ),
  "trace-routes": stage(
    "Follow the cable",
    "Inspect the physical route serving the current facility.",
    "Where do apparently separate services meet?",
    "leila",
    "These are two service labels on a drawing. Come outside with me. The question is whether they still share the same trench, building entrance or upstream corridor.",
    "Trace logical services to physical infrastructure. Correlated failure survives a second contract when both paths still share the dependency being disrupted.",
    "network",
  ),
  "network-design": stage(
    "Choose the second route",
    "Decide whether the additional connection shares or avoids the corridor.",
    "What independence are we actually buying?",
    "leila",
    "The cheaper route follows the existing corridor. A separated route costs more. I can show you the difference; I cannot promise that any route is immune to every incident.",
    "Diversity is specific to the failure being tested. A physically separate route can survive this corridor exercise, while two services in the same corridor cannot.",
    "network",
  ),
  "power-design": stage(
    "A spare path or stored time",
    "Choose an electrical resilience measure and read what it protects.",
    "Do we need separate on-site switching paths, a battery bridge, or lower capital cost?",
    "mara",
    "Separate on-site switching paths and a battery solve different problems. One avoids the shared switching point during maintenance. The other stores a finite amount of energy. Both still depend on the regional electricity supply.",
    "The battery is limited by both power and remaining energy. Electrical separation is assessed against a shared distribution fault, not a guarantee of extra regional supply.",
    "battery",
  ),
  "maintenance-test": stage(
    "Take the dependency out",
    "Run the planned isolation exercise before relying on your design.",
    "What stays online when the shared dependency is removed?",
    "leila",
    "We have drawn the alternatives. Now isolate the shared dependency in a controlled exercise. A failed exercise is useful information while customers are protected.",
    "The result is derived from your selected network and power paths. Installing a spare does not count as testing it.",
    "network",
  ),
  "maintenance-explain": stage(
    "Count paths, not labels",
    "Explain the exercise result before signing off the design.",
    "What does the maintenance exercise actually establish?",
    "leila",
    "Look at the result we observed. The important distinction is not how many boxes we own. It is which failure each path can tolerate.",
    "A successful test supports a bounded claim about the scenario exercised. It does not certify the whole facility or predict an annual uptime percentage.",
    "network",
  ),
  "weak-link-review": stage(
    "Carry the finding forward",
    "Review the paths tested and the weaknesses you retained.",
    "Which dependency will the next team inherit?",
    "mara",
    "Some risks have been reduced. Others remain because we chose to spend elsewhere. Record both. An honest handover is more useful than a green diagram.",
    "Network and power decisions carry into the later heat and connectivity episodes. Replaying this chapter can test another design from the same checkpoint.",
    "network",
  ),
  "shipment-signal": stage(
    "Two independent delays",
    "Read the procurement update and the transformer schedule separately.",
    "Which dependency is now holding the opening?",
    "ishan",
    "A fictional trade-approval change has delayed selected new hardware. Separately, the transformer supplier has moved its date. The running hall has not lost compute because a future shipment is late.",
    "This is an authored hypothetical incident, not current export law. New-equipment approval and the physical grid connection can delay different paths at the same time.",
    "delivery",
  ),
  "shipment-response": stage(
    "Use an option you prepared",
    "Choose a procurement response that satisfies its actual prerequisites.",
    "Which response changes the binding delay?",
    "ishan",
    "We can wait, use a qualified substitute where available, or change the launch sequence. Read the prerequisites. An option we did not prepare cannot be invented at the loading dock.",
    "The timeline shows the consequences. A faster rack delivery may have no effect on opening if the transformer or shell remains later.",
    "delivery",
  ),
  "client-commitment": stage(
    "Make the date explicit",
    "Tell the client whether the original date still stands.",
    "What can we credibly promise with the dates we have?",
    "ishan",
    "The client can plan around a difficult date. They cannot plan around a date we know is unsupported. The promise you make here will appear in the final record.",
    "A revised commitment does not move physical construction. It changes what the client is told and what the operation will later be judged against.",
    "expansion",
  ),
  "wait-delivery": stage(
    "Wait on the critical path",
    "Advance to the outstanding readiness milestones.",
    "Which work is parallel, and which work must follow?",
    "mara",
    "While the hardware travels, other work can continue. We wait for the last required item, not the sum of every supplier's delay.",
    "The model advances dates explicitly. No real-time wait is required. Hardware, shell, permit and grid readiness must all be satisfied before installation.",
    "delivery",
  ),
  "install-expansion": stage(
    "From delivery to installation",
    "Install the delivered expansion equipment in the completed shell.",
    "Has arrival become usable service yet?",
    "mara",
    "The crate is here. The equipment still needs installation. Keep the new hall out of service until its connections and controls have been tested.",
    "A delivered state is not an online state. The visible hall follows the model's installation, commissioning and opening gates.",
    "expansion",
  ),
  "commission-expansion": stage(
    "Prove the new hall",
    "Run the expansion commissioning step.",
    "What evidence is missing before customer handover?",
    "mara",
    "We tested one rack on your first morning. The larger hall deserves the same discipline: establish that its connected systems can deliver the intended service.",
    "Commissioning is a recorded prerequisite. Finishing a building or purchasing capacity does not by itself demonstrate operational readiness.",
    "expansion",
  ),
  "open-expansion": stage(
    "Open what you have tested",
    "Accept the expansion workload after commissioning.",
    "Which promise are we fulfilling today?",
    "ishan",
    "Now we can call this service. The opening date goes into the record beside the date we promised, with the choices that moved it.",
    "Only an opened hall contributes the expansion workload to later operating episodes. The new load brings both value and resource obligations.",
    "expansion",
  ),
  "shipment-review": stage(
    "Explain the opening date",
    "Identify the schedule mechanism that controlled the launch.",
    "Why wasn't the opening delayed by the sum of every delay?",
    "ishan",
    "Look back at the parallel lines in the schedule. We had more than one problem, but some of those problems consumed the same days.",
    "Parallel prerequisites are governed by the latest required completion. Sequential installation and commissioning work comes after that readiness point.",
    "expansion",
  ),
  "heat-signal": stage(
    "A linked, hypothetical shock",
    "Review heat, constrained cross-border supply and the local water allocation.",
    "What physical resource is binding this week?",
    "mara",
    "The weather raises cooling pressure just as regional power imports become constrained. The electricity contract still exists; the physical supply available to us has changed.",
    "These are fictional episode conditions. Physical grid power, cooling water, workload priorities and stored energy are modeled separately.",
    "cooling",
  ),
  "community-promise": stage(
    "Make room for other needs",
    "Choose an explicit water or essential-service commitment before dispatching.",
    "Which promise can our resources support?",
    "rafi",
    "People outside this fence are making decisions too. Tell us what the campus will use, then make the operating plan match that commitment.",
    "Water allocation is a modeled physical limit. Your commitment is recorded separately so the debrief can compare the promise with actual use.",
    "cooling",
  ),
  "shift-one": stage(
    "Dispatch the first shift",
    "Choose which workload to serve and whether to use stored energy.",
    "Which work must run now?",
    "mara",
    "Protect the essential service first. Research work can sometimes wait. If we use the battery, watch its energy fall; the next shift inherits what is left.",
    "The dispatch calculation constrains service by power, cooling water and finite battery energy. Deferred work is recorded instead of being treated as completed.",
    "battery",
  ),
  "shift-two": stage(
    "The second shift inherits the first",
    "Adjust dispatch using the remaining reserve and accumulated obligations.",
    "What did our first decision leave for this shift?",
    "rafi",
    "The promise from our briefing is still with us. So is the battery's remaining charge. We cannot spend either twice.",
    "All three shifts share the same resource ledger. Each choice records critical service, deferred work, water draw and battery use.",
    "cooling",
  ),
  "shift-three": stage(
    "Keep a margin for the final hours",
    "Choose the final shift's feasible operating plan.",
    "Is the remaining reserve enough for the work we are protecting?",
    "mara",
    "The last hours matter as much as the first. Read the remaining energy and the resource limits before deciding how much load to accept.",
    "A battery's kW capability and kWh energy are different constraints. Once its stored energy is spent, another promise cannot refill it.",
    "battery",
  ),
  "heat-explain": stage(
    "Explain the resource tradeoff",
    "Connect the observed service result to the binding resources.",
    "Why didn't one contract or one battery remove every constraint?",
    "rafi",
    "We can disagree about the tradeoff and still describe it accurately. Tell me what the facility used, what service it protected and what work it postponed.",
    "A conditional model can explain this episode. It cannot decide the community's priorities for them or establish a universal preferred cooling system.",
    "cooling",
  ),
  "week-review": stage(
    "Close the week's ledger",
    "Review service, water and reserve use before the final handover.",
    "Which commitments survived the constrained week?",
    "mara",
    "Keep the operating record as it is. A shortfall needs an explanation and a recovery plan, not a renamed metric.",
    "Unserved critical energy, deferred work and water use carry into the final record. The next chapter tests continuity through a different dependency.",
    "battery",
  ),
  "cable-signal": stage(
    "An outage with an uncertain cause",
    "Identify the affected corridor and the repair-access uncertainty.",
    "What do we know, and what are we only assuming?",
    "leila",
    "Traffic through the corridor has stopped. The cause is not established, and access to the repair area may delay restoration. We should communicate those facts without inventing attribution.",
    "Cable faults can have several causes. This hypothetical episode tests physical route exposure, feasible fallback and recovery coordination; it does not attribute a real incident.",
    "network",
  ),
  "cable-response": stage(
    "Activate a feasible continuity path",
    "Choose a response your installed or available paths can support.",
    "What service can each path carry during this outage?",
    "leila",
    "Now the route diagram matters. If a fallback shares this corridor, it shares the interruption. A smaller independent path may still protect the essential workload.",
    "Continuity is constrained by route independence and usable capacity. A response label does not create an installed route.",
    "network",
  ),
  "restore-route": stage(
    "Restore with access in mind",
    "Choose the restoration step and record its elapsed time.",
    "What has to happen before the failed route can return?",
    "leila",
    "Repair requires more than a spare cable. Access, coordination and available crews shape the window. Keep the temporary service plan active while the route is restored.",
    "The recovery duration is an authored assumption. It is not a forecast for a real cable repair or a claim about responsibility for the fault.",
    "network",
  ),
  "recovery-test": stage(
    "Test the restored path",
    "Verify the restored route before accepting the recovery claim.",
    "Is a repaired route the same as a tested service?",
    "mara",
    "A status light can tell us that a path is present. We still need to test that the service can use it. Make that evidence part of the handover.",
    "Restoration and recovery testing are separate gates. This repeats the first chapter's lesson at the scale of the whole campus.",
    "network",
  ),
  "continuity-plan": stage(
    "Hand over the dependencies",
    "Choose the continuity statement supported by your operating record.",
    "What should the next team know before it takes responsibility?",
    "leila",
    "Leave them the paths, priorities, resource limits and test results. They need an operation they can understand, including the risks we decided to retain.",
    "A continuity plan should distinguish evidence from assumption, identify service priorities, and say what must be retested after a material change.",
    "network",
  ),
  complete: stage(
    "A service, with a history",
    "Review the choices that shaped this campus and its final operating record.",
    "What would you keep, and what would you change?",
    "mara",
    "On your first morning, this was an empty hall. Now every route and every commitment has a history. The next team's first tool is the record you leave behind.",
    "This ending reports several outcomes rather than one universal score. Use a chapter checkpoint to explore another strategy from the same earlier decisions.",
    "expansion",
  ),
};

export function stageCopy(state: CampaignState): StageCopy {
  let copy = COPY[state.stage];
  if (
    state.cableResponse === "order-emergency" &&
    state.stage === "restore-route"
  )
    copy = {
      ...copy,
      title: "Receive the temporary route",
      instruction:
        "Advance through the six-hour delivery window for the limited temporary route.",
      question:
        "What will this delivery restore, and what will remain unresolved?",
      dialogue:
        "The temporary route needs six hours to arrive. It is sized for 6 kW of critical service, and it still needs a separate test before carrying that workload. The primary corridor's repair remains outstanding.",
      detail:
        "Delivery creates an available temporary path. The next one-hour recovery test gates critical service on that path. Neither step repairs the primary corridor or restores all remote workload.",
    };
  if (
    state.cableResponse === "order-emergency" &&
    state.stage === "recovery-test"
  )
    copy = {
      ...copy,
      title: "Test the temporary critical route",
      instruction:
        "Run the one-hour test before accepting critical service on the delivered temporary path.",
      question: "Which limited recovery claim can this test support?",
      dialogue:
        "The temporary path has arrived. Test its 6 kW critical-service capacity, alarms and handover. After the test, essential remote service can resume; other remote work stays deferred and primary-corridor repair remains outstanding.",
      detail:
        "The recorded seven-hour response consists of six hours for delivery and one hour for testing. This establishes a tested temporary critical route, not full service restoration or a repaired primary corridor.",
    };
  let memory = "";
  if (state.stage === "shipment-response")
    memory =
      state.supplier === "qualified"
        ? " You funded supplier qualification earlier; that option is now available if its other prerequisites hold."
        : " Earlier, you kept the standard supplier. The unqualified alternate is not an immediate escape route.";
  if (state.stage === "maintenance-explain")
    memory = state.maintenancePassed
      ? " Your installed paths passed the modeled exercise. Keep the scope of that result explicit."
      : " Your installed paths did not pass every part of the exercise. The recorded dependency remains a planning constraint.";
  if (state.stage === "shift-two" || state.stage === "shift-three")
    memory = ` The reserve entering this decision is ${state.batteryKwh.toFixed(1)} kWh.`;
  if (state.stage === "cable-response")
    memory =
      state.network === "diverse"
        ? " You chose physical route separation in The weak link. We can now assess that prepared path."
        : " The added service still follows the shared corridor you selected in The weak link.";
  return { ...copy, dialogue: copy.dialogue + memory };
}

export const PHASE_LABELS = {
  planned: "Design in preparation",
  ordered: "Equipment ordered",
  foundation: "Shell ready · equipment pending",
  delivered: "Equipment delivered",
  installed: "Installed · not commissioned",
  commissioned: "Commissioned · not open",
  online: "Open for service",
} as const;

export const LESSONS = [
  {
    id: "construction",
    chapter: 2,
    title: "A building is not a service",
    principle:
      "Requirements, electrical supply, cooling, connectivity and commissioning form a chain. Completing one element does not prove the whole chain is ready.",
    simplification:
      "Fixed game costs and explicit day advances replace real permits, engineering design and construction contracts.",
    sources: [
      {
        title: "DOE FEMP · Data center design guide",
        date: "26 July 2024",
        url: "https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design",
      },
      {
        title: "DOE FEMP · Commissioning in Federal Buildings",
        date: "Undated guidance",
        url: "https://www.energy.gov/cmei/femp/commissioning-federal-buildings",
      },
    ],
  },
  {
    id: "dependencies",
    chapter: 3,
    title: "Redundancy depends on the failure",
    principle:
      "Trace apparently separate services to their physical dependencies, then test the failure you intend to withstand. Recovery priorities and tested alternatives matter more than equipment counts alone.",
    simplification:
      "The exercise isolates a small set of authored failure domains. Passing it is not facility certification or an uptime prediction.",
    sources: [
      {
        title: "NIST SP 800-34 Rev. 1 · Contingency planning",
        date: "2010",
        url: "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
      },
      {
        title: "NIST SP 800-84 · Tests, training and exercises",
        date: "September 2006",
        url: "https://csrc.nist.gov/pubs/sp/800/84/final",
      },
    ],
  },
  {
    id: "schedule",
    chapter: 4,
    title: "Read the critical path",
    principle:
      "Supply concentration and grid-connection constraints can affect separate prerequisites. Parallel delays are not simply added; downstream installation and testing still require time.",
    simplification:
      "All supplier options, approval changes, delivery dates and costs are fictional. No choice represents current export law or legal advice.",
    sources: [
      {
        title: "IEA · AI and energy security",
        date: "2025",
        url: "https://www.iea.org/reports/energy-and-ai/ai-and-energy-security",
      },
      {
        title: "DOE FEMP · Commissioning in Federal Buildings",
        date: "Undated guidance",
        url: "https://www.energy.gov/cmei/femp/commissioning-federal-buildings",
      },
    ],
  },
  {
    id: "resources",
    chapter: 5,
    title: "Power, energy and water are different limits",
    principle:
      "Contracted electricity is distinct from physical supply. Cooling design affects water and electricity demand, while a battery's stored energy bounds how long it can support a load.",
    simplification:
      "Three two-hour exercise windows use fixed hypothetical power, water and cooling assumptions. Totals cover these six hours, not the entire week. There is no live weather, grid or community-allocation feed.",
    sources: [
      {
        title: "DOE FEMP · Cooling water efficiency",
        date: "Undated guidance",
        url: "https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers",
      },
      {
        title: "IEA · Energy supply for AI",
        date: "2025",
        url: "https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai",
      },
    ],
  },
  {
    id: "recovery",
    chapter: 6,
    title: "Communicate uncertainty; test recovery",
    principle:
      "Continuity depends on route diversity, access to repairs, usable fallback capacity and recovery testing. An unknown cause should remain unknown until evidence supports an attribution.",
    simplification:
      "The corridor, incident, repair-access window and outcomes are authored scenarios. They predict neither a real outage nor responsibility for one.",
    sources: [
      {
        title: "ITU · Submarine-cable resilience report",
        date: "10 July 2026",
        url: "https://www.itu.int/en/mediacentre/Pages/PR-2026-07-10-Submarine-cable-resilience-report.aspx",
      },
      {
        title: "NIST SP 800-34 Rev. 1 · Contingency planning",
        date: "2010",
        url: "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
      },
    ],
  },
] as const;

export function equipmentSummary(
  id: string,
  state: CampaignState,
): { title: string; rows: [string, string][]; detail: string } {
  const phase = PHASE_LABELS[state.expansionPhase];
  const power =
    state.power === "battery"
      ? "12 kWh battery · 4 kW discharge limit"
      : state.power === "separated"
        ? "Separated on-site switching"
        : state.power === "shared"
          ? "Shared electrical path"
          : "Not chosen";
  const tested = state.journal.some(
    (record) => record.stage === "maintenance-test",
  );
  switch (id) {
    case "expansion":
      return {
        title: "Hall B · expansion",
        rows: [
          ["Physical state", phase],
          [
            "Site",
            state.site === "existing"
              ? "Existing campus extension"
              : state.site === "new"
                ? "New extension parcel"
                : "Not chosen",
          ],
          [
            "Opening",
            state.actualOpenDay === null
              ? "Not open"
              : `Day ${Number(state.actualOpenDay.toFixed(2))}`,
          ],
        ],
        detail:
          "The new hall only accepts workload after installation, commissioning and opening. Check the schedule for each remaining prerequisite.",
      };
    case "battery":
      return {
        title: "Electrical reserve",
        rows: [
          ["Design", power],
          ["Stored energy", `${state.batteryKwh.toFixed(1)} kWh`],
          [
            "Maintenance exercise",
            tested
              ? state.maintenancePassed
                ? "Full service maintained in exercise"
                : "Weakness recorded"
              : "Not run",
          ],
        ],
        detail:
          "Stored energy provides a finite bridge. Separate on-site switching paths avoid the shared maintenance point; they do not create independent regional electricity supplies.",
      };
    case "cooling":
    case "controls":
      return {
        title: "Cooling plant",
        rows: [
          [
            "Expansion design",
            state.cooling === "hybrid"
              ? "Wet and dry hybrid plant"
              : state.cooling === "wet"
                ? "Wet cooling plant"
                : "Not chosen",
          ],
          [
            "Water used · heat exercises",
            `${Number(state.waterLitres.toFixed(1)).toLocaleString()} L`,
          ],
          [
            "Community commitment",
            state.communityPromise === "promise-water"
              ? "At most 48 L across six hours"
              : state.communityPromise === "promise-critical"
                ? "Protect all 36 critical kWh"
                : "Not recorded",
          ],
        ],
        detail:
          "Heat must leave the IT load. The selected cooling design changes the modeled power and water requirements. Dispatch choices must fit both limits.",
      };
    case "network":
      return {
        title: "Network paths",
        rows: [
          [
            "Physical route",
            state.network === "diverse"
              ? "Separated corridor"
              : state.network === "shared"
                ? "Shared corridor"
                : "Not assessed",
          ],
          [
            "Recovery test",
            state.recoveryTested ? "Completed" : "Not completed",
          ],
          ["Recovery time", `${state.recoveryHours} hours`],
        ],
        detail:
          "Follow the path beyond the contract label. The corridor outage tests that specific exposure; its cause is left uncertain.",
      };
    case "delivery":
      return {
        title: "Procurement and delivery",
        rows: [
          [
            "Supplier",
            state.supplier === "qualified"
              ? "Primary with qualified alternate"
              : state.supplier === "standard"
                ? "Standard compatible supplier"
                : "Not selected",
          ],
          [
            "Hardware milestone",
            state.hardwareDay > 0
              ? `Day ${Number(state.hardwareDay.toFixed(2))}`
              : "Not scheduled",
          ],
          ["Current phase", phase],
        ],
        detail:
          "A late new-equipment shipment affects expansion timing. It does not retroactively disable the equipment already operating in Hall A.",
      };
    case "power":
      return {
        title: "Electrical supply",
        rows: [
          ["Resilience design", power],
          [
            "Grid milestone",
            state.gridDay > 0
              ? `Day ${Number(state.gridDay.toFixed(2))}`
              : "Not scheduled",
          ],
          ["Battery energy", `${state.batteryKwh.toFixed(1)} kWh`],
        ],
        detail:
          "A utility commitment, a completed connection and physically available power are separate conditions. Inspect all three before accepting more load.",
      };
    default:
      return {
        title: "Hall A · original service",
        rows: [
          ["Starter service", "Commissioned in First light"],
          [
            "Starter rack",
            `Bay ${String.fromCharCode(65 + (state.origin.bay ?? 0))}`,
          ],
          ["Expansion", phase],
        ],
        detail:
          "Your original commissioning record carries into this campaign. Later expansion and disruptions add obligations to that foundation.",
      };
  }
}

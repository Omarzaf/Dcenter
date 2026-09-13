import type { Bay, MissionCommand, MissionResult, MissionStage, MissionState, Utility } from './types.ts';

export interface BayDefinition {
  id: Bay;
  name: string;
  description: string;
  installCost: number;
  routeMetres: Record<Utility, number>;
  connectionCosts: Record<Utility, number>;
}

/** Authored routing examples inside an existing, prepared hall; not construction estimates. */
export const BAYS: BayDefinition[] = [
  {
    id: 0, name: 'Bay A', installCost: 8,
    description: 'Closest to the electrical room and cooling manifold; the network route is longer. All three paths must reach this bay.',
    routeMetres: { power: 4, cooling: 6, network: 12 },
    connectionCosts: { power: 2, cooling: 4.5, network: 3 },
  },
  {
    id: 1, name: 'Bay B', installCost: 8,
    description: 'A central position with three equal-length routes. The same equipment has a different connection budget here.',
    routeMetres: { power: 8, cooling: 8, network: 8 },
    connectionCosts: { power: 4, cooling: 6, network: 2 },
  },
  {
    id: 2, name: 'Bay C', installCost: 8,
    description: 'Closest to the network entry, with longer electrical and cooling routes. Shorter cable distance does not imply a measured latency advantage.',
    routeMetres: { power: 14, cooling: 10, network: 4 },
    connectionCosts: { power: 7, cooling: 7.5, network: 1 },
  },
];

const STAGES: MissionStage[] = ['arrival', 'survey', 'placement', 'power', 'cooling', 'network', 'commissioning', 'fault', 'retest', 'handover', 'reflection', 'expansion', 'complete'];
const UTILITIES: Utility[] = ['power', 'cooling', 'network'];
const INITIAL_BUDGET = 50;
const SOURCE_IDS: Record<Utility, string> = { power: 'power-source', cooling: 'cooling-source', network: 'network-source' };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const EXPANSIONS = {
  phase: {
    cost: 4, title: 'Expansion scoped in phases',
    detail: 'Committed 4 planning credits to a scoped expansion study. Next assignment: verify surveys, grid capacity, procurement dates, and a smaller first opening before promising more service. No new equipment or capacity has been delivered.',
  },
  reserve: {
    cost: 6, title: 'A provisional delivery option reserved',
    detail: 'Committed 6 planning credits to hold a provisional alternate delivery slot. Next assignment: verify supplier compatibility and the delivery window before exercising the option. A reservation is not delivered equipment or a guaranteed opening date.',
  },
  rush: {
    cost: 0, title: 'An early opening requested',
    detail: 'Recorded an earliest-opening request without spending planning credits. Next assignment: test that request against grid, supplier, and commissioning dates. The request adds no capacity and makes no guaranteed delivery or service promise.',
  },
} as const;

export interface DependencyEdge {
  utility: Utility;
  source: string;
  target: 'rack';
  connected: boolean;
  ready: boolean;
  routeMetres: number;
  cost: number;
}

export interface MissionCondition {
  id: Utility | 'handover';
  label: string;
  status: 'pending' | 'passed' | 'failed';
  detail: string;
}

export interface MissionMetrics {
  installed: boolean;
  allConnected: boolean;
  readyForTest: boolean;
  readyForService: boolean;
  online: boolean;
  /** Live customer rack load, in kW. This is zero during every commissioning stage. */
  serviceKw: number;
  /** Illustrative design IT load: 6 kW rack plus 0.2 kW networking. */
  designITKw: number;
  facilityDrawKw: number;
  rackPowerKw: number;
  networkPowerKw: number;
  coolingPowerKw: number;
  distributionLossKw: number;
  /** Connected electrical capacity is distinct from current consumption. */
  connectedPowerKw: number;
  coolingDemandKw: number;
  /** Available after the control is corrected; before testing, this is unverified capacity. */
  availableCoolingKw: number;
  networkMbps: number;
  requiredNetworkMbps: number;
  /** The completed exercise used a 6 kW rack test load; no test continues in the background. */
  lastTestLoadKw: number;
  /** Illustrative instantaneous ratio with a consistent IT boundary, not annual PUE. */
  pue: number | null;
  edges: DependencyEdge[];
  conditions: MissionCondition[];
  blockers: string[];
}

export function createMission(): MissionState {
  return {
    version: 1, stage: 'arrival', bay: null, inspected: false,
    connections: { power: false, cooling: false, network: false },
    controlFixed: false, commissioned: false, serviceOnline: false,
    budget: INITIAL_BUDGET, timeMinutes: 0, testRuns: 0,
    reflection: null, expansionChoice: null, log: [],
  };
}

/** Derived physical paths and teaching metrics. All capacities and work durations are illustrative. */
export function missionMetrics(state: MissionState): MissionMetrics {
  const installed = state.bay !== null && BAYS.some((bay) => bay.id === state.bay);
  const bay = installed ? BAYS.find((entry) => entry.id === state.bay)! : null;
  const edges: DependencyEdge[] = UTILITIES.map((utility) => ({
    utility, source: SOURCE_IDS[utility], target: 'rack',
    connected: installed && state.connections[utility],
    ready: installed && state.connections[utility] && (utility !== 'cooling' || state.controlFixed),
    routeMetres: bay?.routeMetres[utility] ?? 0,
    cost: bay?.connectionCosts[utility] ?? 0,
  }));
  const allConnected = installed && edges.every((edge) => edge.connected);
  const readyForService = allConnected && state.controlFixed && state.commissioned && state.testRuns === 2;
  const online = readyForService && state.serviceOnline;
  const blockers: string[] = [];
  if (!installed) blockers.push('Inspect and install the delivered rack.');
  for (const edge of edges) if (installed && !edge.connected) blockers.push(`Complete the ${edge.utility} path from its source to the rack.`);
  if (allConnected && state.testRuns === 0) blockers.push('Run the controlled commissioning test before customer handover.');
  if (state.testRuns === 1 && !state.controlFixed) blockers.push('The cooling control did not respond to the test load. Correct its configuration.');
  if (state.controlFixed && !state.commissioned) blockers.push('Rerun the controlled test to verify the repair.');
  const conditions: MissionCondition[] = [
    {
      id: 'power', label: 'Electrical path', status: state.testRuns > 0 ? 'passed' : 'pending',
      detail: state.testRuns > 0 ? 'The source-to-rack electrical path carried the illustrative test load.' : state.connections.power ? 'Path connected; a functional test is still required.' : 'The electrical room is ready; connect its path to the installed rack.',
    },
    {
      id: 'cooling', label: 'Cooling control response',
      status: state.commissioned ? 'passed' : state.testRuns === 1 && !state.controlFixed ? 'failed' : 'pending',
      detail: state.commissioned ? 'The corrected control responded during the retest.' : state.testRuns === 1 && !state.controlFixed ? 'The control failed to call for cooling under a 6 kW rack test load. The exercise stopped before customer handover.' : state.controlFixed ? 'Configuration corrected; verify its response with a fresh test.' : state.connections.cooling ? 'Cooling path connected; control response is not yet verified.' : 'Connect the cooling source to the installed rack.',
    },
    {
      id: 'network', label: 'Client network path', status: state.testRuns > 0 ? 'passed' : 'pending',
      detail: state.testRuns > 0 ? 'The test verified the required client network path.' : state.connections.network ? 'Path connected; verification is still required.' : 'Connect the network entry to the installed rack.',
    },
    {
      id: 'handover', label: 'Customer service', status: online ? 'passed' : 'pending',
      detail: online ? 'The university workload is live after the successful retest and explicit handover.' : readyForService ? 'Tests passed. Accept the university workload to bring service online.' : 'No customer workload is running. Complete and verify all dependencies first.',
    },
  ];
  const rackPowerKw = online ? 6 : 0;
  const networkPowerKw = online ? 0.2 : 0;
  const coolingPowerKw = online ? 1.5 : 0;
  const distributionLossKw = online ? 0.3 : 0;
  const facilityDrawKw = round(rackPowerKw + networkPowerKw + coolingPowerKw + distributionLossKw);
  return {
    installed, allConnected,
    readyForTest: allConnected && (state.stage === 'commissioning' && state.testRuns === 0 || state.stage === 'retest' && state.controlFixed && state.testRuns === 1),
    readyForService, online, serviceKw: rackPowerKw, designITKw: 6.2,
    facilityDrawKw, rackPowerKw, networkPowerKw, coolingPowerKw, distributionLossKw,
    connectedPowerKw: edges[0].connected ? 12 : 0,
    coolingDemandKw: online ? 6.2 : 0,
    availableCoolingKw: edges[1].ready ? 8 : 0,
    networkMbps: edges[2].connected ? 1000 : 0,
    requiredNetworkMbps: 100,
    lastTestLoadKw: state.testRuns > 0 ? 6 : 0,
    pue: online ? round(facilityDrawKw / (rackPowerKw + networkPowerKw)) : null,
    edges, conditions, blockers,
  };
}

function reject(state: MissionState, error: string): MissionResult { return { state, error }; }

function record(state: MissionState, patch: Partial<MissionState>, minutes: number, cost: number, title: string, detail: string): MissionResult {
  if (state.budget < cost) return reject(state, 'The commissioning budget cannot cover this action. Restore an earlier checkpoint.');
  const timeMinutes = round(state.timeMinutes + minutes);
  return {
    state: {
      ...state, ...patch, budget: round(state.budget - cost), timeMinutes,
      connections: { ...state.connections, ...patch.connections },
      log: [...state.log, { id: state.log.length + 1, minute: timeMinutes, title, detail }],
    },
  };
}

/** Executes a validated command on canonical state; also used by the save replay validator. */
function execute(state: MissionState, command: MissionCommand): MissionResult {
  const metrics = missionMetrics(state);
  switch (command.type) {
    case 'enter':
      if (state.stage !== 'arrival') return reject(state, 'The facility has already been entered. Continue the current assignment.');
      return record(state, { stage: 'survey' }, 0.25, 0, 'The university assignment', 'Entered the existing, prepared hall. The delivered rack is already purchased; 50 fictional credits remain for installation, connections, testing, and the next planning commitment. Durations are illustrative work minutes, not elapsed play time.');
    case 'inspect':
      if (state.stage !== 'survey') return reject(state, 'Inspect the delivered rack after entering the facility, before choosing a bay.');
      return record(state, { stage: 'placement', inspected: true }, 0.75, 0, 'Delivery inspected', 'Confirmed the delivered rack and its illustrative 6 kW client workload. Trace electrical, cooling, and network connections before handover. Inspection alone does not make service available.');
    case 'install': {
      if (state.stage !== 'placement' || !state.inspected || state.bay !== null) return reject(state, 'Inspect the delivery first, then install it once in an available bay.');
      const bay = BAYS.find((entry) => entry.id === command.bay);
      if (!bay) return reject(state, 'Choose Bay A, B, or C.');
      return record(state, { stage: 'power', bay: bay.id }, 1.25, bay.installCost, `Rack installed in ${bay.name}`, `Installation used ${bay.installCost} credits. Routes to this bay: power ${bay.routeMetres.power} m, cooling ${bay.routeMetres.cooling} m, network ${bay.routeMetres.network} m. These lengths affect connection expense, not simulated airflow or measured latency. The rack remains offline.`);
    }
    case 'connect': {
      if (state.stage !== command.utility || !metrics.installed) return reject(state, `Follow the current assignment before making the ${command.utility} connection.`);
      if (state.connections[command.utility]) return reject(state, 'That path is already connected. A duplicate connection does not create independent capacity.');
      const bay = BAYS.find((entry) => entry.id === state.bay)!;
      const cost = bay.connectionCosts[command.utility];
      const metres = bay.routeMetres[command.utility];
      const duration = round((command.utility === 'cooling' ? 0.4 : 0.3) + metres * 0.05);
      const next: Record<Utility, MissionStage> = { power: 'cooling', cooling: 'network', network: 'commissioning' };
      return record(state, { stage: next[command.utility], connections: { ...state.connections, [command.utility]: true } }, duration, cost, `${command.utility[0].toUpperCase() + command.utility.slice(1)} path connected`, `${SOURCE_IDS[command.utility]} → rack in ${bay.name}: ${metres} m, ${cost} credits. The physical path is installed; functional testing is still required before customer service.`);
    }
    case 'test':
      if (!metrics.readyForTest) return reject(state, 'Connect every utility path and follow the test assignment. A failed test must be corrected before a retest.');
      if (state.stage === 'commissioning') {
        return record(state, { stage: 'fault', testRuns: 1 }, 1.5, 1, 'Commissioning test stopped safely', 'Applied an illustrative 6 kW rack test load, separate from customer service. Power and network checks passed, but the cooling control did not respond. Stopped the exercise and removed the test load. No customer service was activated; correct the control before retesting.');
      }
      return record(state, { stage: 'handover', testRuns: 2, commissioned: true }, 1.25, 1, 'Retest passed', 'Reapplied the illustrative 6 kW rack test load. The corrected cooling control responded and the required power, cooling, and network checks passed. Removed the test load. The facility is ready for an explicit client handover; no customer workload is live yet.');
    case 'repair':
      if (state.stage !== 'fault' || state.testRuns !== 1 || state.controlFixed) return reject(state, 'Diagnose the failed commissioning test before correcting the cooling control.');
      return record(state, { stage: 'retest', controlFixed: true }, 0.75, 4, 'Cooling control corrected', 'Used 4 credits of fictional commissioning labor to correct the cooling-control configuration. A connected cooling path did not guarantee a working control. The change must pass a fresh test before handover.');
    case 'activate':
      if (state.stage !== 'handover' || !metrics.readyForService || state.serviceOnline) return reject(state, 'Customer service requires complete utility paths, a corrected cooling control, and a passing retest.');
      return record(state, { stage: 'reflection', serviceOnline: true }, 0.25, 0, 'First light for the university', 'Accepted the first university workload after testing. Illustrative live draw: rack 6 kW, network 0.2 kW, cooling 1.5 kW, distribution losses 0.3 kW; total 8 kW. The service commitment is now live. These teaching values are not a professional commissioning certificate.');
    case 'reflect':
      if (state.stage !== 'reflection') return reject(state, 'Bring the tested service online before reflecting on the commissioning result.');
      if (command.answer !== 'controls') return reject(state, 'Power and network passed. The cooling control failed to respond, so adding racks or bandwidth would not repair the cause. Choose the explanation about verifying controls, then try again; no credits or time are lost.');
      return record(state, { stage: 'expansion', reflection: 'controls' }, 0.25, 0, 'The lesson: connected is not commissioned', 'Explained that a complete set of connected equipment still needs functional tests. The control fault was corrected, the same test was rerun, and only then was customer service accepted. Next, apply that sequence to an expansion with uncertain delivery dates.');
    case 'expansion': {
      if (state.stage !== 'expansion' || state.reflection !== 'controls' || !metrics.online) return reject(state, 'Complete the handover and reflection before committing to the next planning step.');
      const choice = EXPANSIONS[command.choice as keyof typeof EXPANSIONS];
      if (!choice) return reject(state, 'Choose phased planning, a provisional reservation, or an early-opening request.');
      return record(state, { stage: 'complete', expansionChoice: command.choice }, 0.25, choice.cost, choice.title, choice.detail);
    }
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function validCommand(value: unknown): value is MissionCommand {
  if (!object(value) || typeof value.type !== 'string') return false;
  if (['enter', 'inspect', 'test', 'repair', 'activate'].includes(value.type)) return keys(value, ['type']);
  if (value.type === 'install') return keys(value, ['type', 'bay']) && (value.bay === 0 || value.bay === 1 || value.bay === 2);
  if (value.type === 'connect') return keys(value, ['type', 'utility']) && UTILITIES.includes(value.utility as Utility);
  if (value.type === 'reflect') return keys(value, ['type', 'answer']) && ['controls', 'more-racks', 'bandwidth'].includes(value.answer as string);
  if (value.type === 'expansion') return keys(value, ['type', 'choice']) && typeof value.choice === 'string' && Object.prototype.hasOwnProperty.call(EXPANSIONS, value.choice);
  return false;
}

/** Atomic and immutable. Invalid or out-of-order commands never spend money, time, or progress. */
export function transition(state: MissionState, command: MissionCommand): MissionResult {
  if (!validCommand(command)) return reject(state, 'Unknown mission action. Use the controls for the current assignment.');
  if (!validateMission(state)) return reject(state, 'This mission state is inconsistent. Restore a validated save or start a new mission.');
  if (state.stage === 'complete') return reject(state, 'First Light is complete. Your service and next planning commitment are saved.');
  return execute(state, command);
}

/** Replays the only legitimate path to a stage, retaining the selected bay and final commitment. */
export function validateMission(value: unknown): MissionState | null {
  if (!object(value) || !keys(value, ['version', 'stage', 'bay', 'inspected', 'connections', 'controlFixed', 'commissioned', 'serviceOnline', 'budget', 'timeMinutes', 'testRuns', 'reflection', 'expansionChoice', 'log'])) return null;
  if (value.version !== 1 || !STAGES.includes(value.stage as MissionStage)) return null;
  if (value.bay !== null && value.bay !== 0 && value.bay !== 1 && value.bay !== 2) return null;
  if (!object(value.connections) || !keys(value.connections, UTILITIES)) return null;
  if (!Array.isArray(value.log) || value.log.length > 12) return null;
  const stageIndex = STAGES.indexOf(value.stage as MissionStage);
  if (value.log.length !== stageIndex) return null;
  if (stageIndex >= 3 && value.bay === null) return null;
  if (stageIndex === 12 && (typeof value.expansionChoice !== 'string' || !Object.prototype.hasOwnProperty.call(EXPANSIONS, value.expansionChoice))) return null;
  const commands: MissionCommand[] = [
    { type: 'enter' }, { type: 'inspect' }, { type: 'install', bay: (value.bay ?? 0) as Bay },
    { type: 'connect', utility: 'power' }, { type: 'connect', utility: 'cooling' }, { type: 'connect', utility: 'network' },
    { type: 'test' }, { type: 'repair' }, { type: 'test' }, { type: 'activate' },
    { type: 'reflect', answer: 'controls' }, { type: 'expansion', choice: value.expansionChoice as string },
  ];
  let canonical = createMission();
  for (let index = 0; index < stageIndex; index++) {
    const result = execute(canonical, commands[index]);
    if (result.error) return null;
    canonical = result.state;
  }
  for (const key of ['version', 'stage', 'bay', 'inspected', 'controlFixed', 'commissioned', 'serviceOnline', 'budget', 'timeMinutes', 'testRuns', 'reflection', 'expansionChoice'] as const) {
    if (value[key] !== canonical[key]) return null;
  }
  for (const utility of UTILITIES) if (value.connections[utility] !== canonical.connections[utility]) return null;
  for (let index = 0; index < canonical.log.length; index++) {
    const actual: unknown = value.log[index];
    const expected = canonical.log[index];
    if (!object(actual) || !keys(actual, ['id', 'minute', 'title', 'detail'])) return null;
    if (actual.id !== expected.id || actual.minute !== expected.minute || actual.title !== expected.title || actual.detail !== expected.detail) return null;
  }
  return canonical;
}

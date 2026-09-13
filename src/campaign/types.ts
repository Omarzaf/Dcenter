import type { MissionState } from "../firstlight/types";

export type CampaignChapter = 2 | 3 | 4 | 5 | 6;
export type CampaignStage =
  | "requirements"
  | "site"
  | "cooling-design"
  | "procurement"
  | "groundworks"
  | "promise-review"
  | "trace-routes"
  | "network-design"
  | "power-design"
  | "maintenance-test"
  | "maintenance-explain"
  | "weak-link-review"
  | "shipment-signal"
  | "shipment-response"
  | "client-commitment"
  | "wait-delivery"
  | "install-expansion"
  | "commission-expansion"
  | "open-expansion"
  | "shipment-review"
  | "heat-signal"
  | "community-promise"
  | "shift-one"
  | "shift-two"
  | "shift-three"
  | "heat-explain"
  | "week-review"
  | "cable-signal"
  | "cable-response"
  | "restore-route"
  | "recovery-test"
  | "continuity-plan"
  | "complete";
export type ExpansionPhase =
  | "planned"
  | "ordered"
  | "foundation"
  | "delivered"
  | "installed"
  | "commissioned"
  | "online";
export interface CampaignChoice {
  id: string;
  label: string;
  detail: string;
  cost: number;
  days: number;
  disabledReason?: string;
}
export interface CampaignRecord {
  chapter: CampaignChapter;
  stage: CampaignStage;
  choice: string;
  day: number;
  title: string;
  detail: string;
  spent: number;
}
export interface CampaignState {
  version: 1;
  origin: MissionState;
  stage: CampaignStage;
  chapter: CampaignChapter;
  day: number;
  budget: number;
  requirements: "phased" | "full" | null;
  site: "existing" | "new" | null;
  cooling: "wet" | "hybrid" | null;
  supplier: "standard" | "qualified" | null;
  network: "shared" | "diverse" | null;
  power: "shared" | "separated" | "battery" | null;
  routeTested: boolean;
  maintenancePassed: boolean;
  expansionPhase: ExpansionPhase;
  permitDay: number;
  gridDay: number;
  hardwareDay: number;
  shellDay: number;
  promisedDay: number | null;
  actualOpenDay: number | null;
  shipmentResponse: string | null;
  communityPromise: string | null;
  batteryKwh: number;
  waterLitres: number;
  deferredKwh: number;
  unservedCriticalKwh: number;
  servedKwh: number;
  heatShift: number;
  lastDispatch: DispatchResult | null;
  cableResponse: string | null;
  recoveryHours: number;
  recoveryTested: boolean;
  journal: CampaignRecord[];
}
export interface DispatchResult {
  hours: number;
  requestedKw: number;
  servedKw: number;
  criticalKw: number;
  criticalServedKw: number;
  gridKw: number;
  facilityKw: number;
  batteryUsedKwh: number;
  batteryRemainingKwh: number;
  waterLph: number;
  waterLimitLph: number;
  deferredKwh: number;
  unservedCriticalKwh: number;
  explanation: string;
}
export interface CampaignMetrics {
  serviceKw: number;
  criticalKw: number;
  demandKw: number;
  facilityKw: number;
  gridKw: number;
  waterLph: number;
  waterLimitLph: number;
  reserveMinutes: number;
  expectedOpeningDay: number;
  openingKept: boolean | null;
  waterKept: boolean | null;
  continuityLabel: string;
}
export interface ScheduleTask {
  id: string;
  label: string;
  day: number;
  status: "pending" | "ready" | "complete";
  dependency: string;
}
export interface ScenarioAssumptions {
  hardwareDelayDays: number;
  gridDelayDays: number;
  gridReductionPercent: number;
  waterReductionPercent: number;
  corridorOutage: boolean;
}
export interface ScenarioForecast {
  openingDay: number;
  criticalPath: string;
  serviceKw: number;
  criticalServedKw: number;
  batteryMinutes: number;
  explanation: string[];
}
export interface CampaignVisual {
  chapter: CampaignChapter;
  expansionPhase: ExpansionPhase;
  networkDiverse: boolean;
  networkTested: boolean;
  powerSeparated: boolean;
  batteryInstalled: boolean;
  batteryFraction: number;
  hybridCooling: boolean;
  heat: boolean;
  cableOutage: boolean;
  emergencyRoute: boolean;
  gridLimited: boolean;
  serviceFraction: number;
}

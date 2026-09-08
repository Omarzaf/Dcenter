export type UnitType = "rack" | "cool" | "power" | "fiber";

export interface UnitDef {
  id: UnitType;
  name: string;
  code: string;
  color: string;
  dim: string;
  /** power consumed from the bus */
  draw: number;
  /** heat emitted per second (negative = it vents heat instead) */
  heat: number;
  /** cooling units: heat removed per second inside radius */
  vent?: number;
  /** power units: bus capacity supplied */
  capacity?: number;
  blurb: string;
}

export const COLS = 8;
export const ROWS = 8;
export const CELLS = COLS * ROWS;

/** starting bus capacity before any PDU is built */
export const BASE_CAPACITY = 16;

export const UNITS: Record<UnitType, UnitDef> = {
  rack: {
    id: "rack",
    name: "SERVER RACK",
    code: "CPU",
    color: "#4aa8ff",
    dim: "#123a63",
    draw: 3,
    heat: 1.15,
    blurb: "Pushes throughput. Link 3+ to form a POD.",
  },
  cool: {
    id: "cool",
    name: "COOLANT ARRAY",
    code: "HVAC",
    color: "#2ee6d6",
    dim: "#0d4c4a",
    draw: 4,
    heat: 0,
    vent: 3.4,
    blurb: "Vents heat in a 3×3 block. Keeps the core alive.",
  },
  power: {
    id: "power",
    name: "POWER BUS",
    code: "PDU",
    color: "#ffb020",
    dim: "#5c3d05",
    draw: 0.5,
    heat: 0.4,
    capacity: 8,
    blurb: "+8 bus capacity. Overload the bus and everything browns out.",
  },
  fiber: {
    id: "fiber",
    name: "FIBER SWITCH",
    code: "NET",
    color: "#ff5fa2",
    dim: "#5c1737",
    draw: 1,
    heat: 0.2,
    blurb: "×1.8 throughput for every POD touching it.",
  },
};

export const UNIT_ORDER: UnitType[] = ["rack", "cool", "power", "fiber"];

export interface Cell {
  unit: UnitType | null;
  /** local hot-spot temperature 0..130 */
  heat: number;
  /** seconds since placed */
  age: number;
  /** id of the POD (orthogonal rack cluster) this cell belongs to, else -1 */
  pod: number;
  /** pod size */
  podSize: number;
  /** boosted by an adjacent fiber switch */
  boosted: boolean;
  /** power unit knocked offline by a surge until rebooted */
  offline: number;
  /** placement pop animation timer */
  pop: number;
  /** throttle amount 0..1 from local overheating */
  throttle: number;
}

export const makeCell = (): Cell => ({
  unit: null,
  heat: 0,
  age: 0,
  pod: -1,
  podSize: 0,
  boosted: false,
  offline: 0,
  pop: 0,
  throttle: 0,
});

export interface LogLine {
  id: number;
  text: string;
  kind: "info" | "good" | "warn" | "bad";
}

export type AchievementId =
  | "first_pod"
  | "pods_5"
  | "pods_10"
  | "no_scrape_3"
  | "core_99"
  | "phases_3"
  | "combo_5";

export interface Achievement {
  id: AchievementId;
  label: string;
  desc: string;
}

export interface Snapshot {
  state: GameState;
  score: number;
  data: number;
  throughput: number;
  coreTemp: number;
  ambient: number;
  load: number;
  capacity: number;
  demand: number;
  combo: number;
  comboMult: number;
  comboLeft: number;
  phase: number;
  phaseLeft: number;
  time: number;
  queue: UnitType[];
  selected: number;
  pods: number;
  rackCount: number;
  log: LogLine[];
  modifier: { label: string; color: string; left: number; total: number; kind: string } | null;
  reboot: number;
  best: number;
  danger: boolean;
  shift: number;
  shiftName: string;
  scrambled: number;
  humid: number;
  settings: PublicSettings;
  newAchievement: AchievementId | null;
  achievements: AchievementId[];
  scoredPods: number;
}

export interface PublicSettings {
  muted: boolean;
  shake: number; // 0..1
  palette: "classic" | "deuteranopia" | "tritanopia";
}

export type GameState = "idle" | "running" | "paused" | "over";

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_pod: { id: "first_pod", label: "FIRST POD", desc: "Linked your first POD." },
  pods_5: { id: "pods_5", label: "FLEET", desc: "Five PODs online at once." },
  pods_10: { id: "pods_10", label: "HYPERSCALE", desc: "Ten PODs online at once." },
  no_scrape_3: { id: "no_scrape_3", label: "PRECISION OPS", desc: "Reached phase 3 without scrapping." },
  core_99: { id: "core_99", label: "REDLINE", desc: "Hit 99° core temperature and lived." },
  phases_3: { id: "phases_3", label: "VETERAN", desc: "Survived three phase shifts." },
  combo_5: { id: "combo_5", label: "LINK CHAIN", desc: "Reached a ×5 combo." },
};

export const SHIFTS = [
  { name: "DAY SHIFT", tint: "#ffe6a8", accent: "#4aa8ff" },
  { name: "EVENING", tint: "#ff7a3d", accent: "#ff5fa2" },
  { name: "NIGHT", tint: "#2ee6d6", accent: "#7d93ad" },
  { name: "GRAVEYARD", tint: "#ff3b47", accent: "#ffb020" },
];

export type MissionStage =
  | "arrival"
  | "survey"
  | "placement"
  | "power"
  | "cooling"
  | "network"
  | "commissioning"
  | "fault"
  | "retest"
  | "handover"
  | "reflection"
  | "expansion"
  | "complete";
export type Utility = "power" | "cooling" | "network";
export type Bay = 0 | 1 | 2;
export type CameraView = "campus" | "hall" | "plant";
export type TimeMode = "cycle" | "day" | "night";
export interface MissionLog {
  id: number;
  minute: number;
  title: string;
  detail: string;
}
export interface MissionState {
  version: 1;
  stage: MissionStage;
  bay: Bay | null;
  inspected: boolean;
  connections: Record<Utility, boolean>;
  controlFixed: boolean;
  commissioned: boolean;
  serviceOnline: boolean;
  budget: number;
  timeMinutes: number;
  testRuns: number;
  reflection: string | null;
  expansionChoice: string | null;
  log: MissionLog[];
}
export type MissionCommand =
  | { type: "enter" }
  | { type: "inspect" }
  | { type: "install"; bay: Bay }
  | { type: "connect"; utility: Utility }
  | { type: "test" }
  | { type: "repair" }
  | { type: "activate" }
  | { type: "reflect"; answer: string }
  | { type: "expansion"; choice: string };
export interface MissionResult {
  state: MissionState;
  error?: string;
}

export interface FacilitySceneProps {
  campaign?: import("../campaign/types").CampaignVisual;
  cameraView: CameraView;
  timeMode: TimeMode;
  paused: boolean;
  onTimeChange?: (hour: number) => void;
  viewControlsOpen: boolean;
  onCloseViewControls: () => void;
  onCameraViewChange: (view: CameraView) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  rackBay: Bay | null;
  powerConnected: boolean;
  coolingConnected: boolean;
  networkConnected: boolean;
  fault: boolean;
  live: boolean;
  testRunning: boolean;
  selectedTarget: string | null;
  placementMode: boolean;
  reducedMotion: boolean;
  intro: boolean;
  overlay: Utility | "none";
  onSelect: (target: string) => void;
  onReady?: (ready: boolean) => void;
}

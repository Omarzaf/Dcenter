import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  Camera,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  Droplets,
  Expand,
  ExternalLink,
  Flag,
  Layers3,
  MapPin,
  Maximize2,
  Network,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Truck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { BAYS, missionMetrics, transition } from "./model";
import { CHAPTERS, LESSONS, OBJECTIVES, STAGES, TARGET_NAMES } from "./content";
import { chooseDialogue, startDialogue } from "./narrative";
import {
  decodeSession,
  encodeSession,
  freshSession,
  loadSession,
  SAVE_KEY,
  type Session,
} from "./persistence";
import { MaraPortrait } from "./MaraPortrait";
import { createCampaign } from "../campaign/model";
import { decodeCampaign } from "../campaign/persistence";
import type { CampaignState } from "../campaign/types";
import {
  formatSiteTime,
  loadPresentation,
  savePresentation,
} from "./presentation";
import type { Bay, MissionCommand, Utility } from "./types";
import "./firstLight.css";
import "./immersion.css";

function SceneDownloadFallback() {
  return (
    <section className="fl-world-fallback" role="status">
      <p>
        The facility view could not be downloaded. You can still complete the
        mission using the assignment’s Find controls.
      </p>
      <button onClick={() => location.reload()}>Reload facility view</button>
    </section>
  );
}
const FacilityScene = lazy(() =>
  import("./FacilityScene").catch(() => ({ default: SceneDownloadFallback })),
);
type Panel = "pause" | "notebook" | "chapters" | "restart" | null;

function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`fl-dialog ${wide ? "fl-dialog-wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="fl-dialog-heading">
        <div>
          <span className="fl-eyebrow">CORE / FIRST LIGHT</span>
          <h2>{title}</h2>
        </div>
        <button
          className="fl-icon"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function UtilityIcon({
  utility,
  size = 18,
}: {
  utility: Utility;
  size?: number;
}) {
  return utility === "power" ? (
    <Zap size={size} />
  ) : utility === "cooling" ? (
    <Droplets size={size} />
  ) : (
    <Network size={size} />
  );
}

function downloadSession(session: Session) {
  const url = URL.createObjectURL(
    new Blob([encodeSession(session)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "core-first-light-save.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FirstLightApp({
  onCampaignReady,
  initialSession,
  startupNotice = "",
}: {
  onCampaignReady?: (campaign: CampaignState) => void;
  initialSession?: Session;
  startupNotice?: string;
}) {
  const [loaded] = useState(loadSession);
  const [session, setSession] = useState(initialSession ?? loaded.session);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [entry, setEntry] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [inspect, setInspect] = useState(false);
  const [notice, setNotice] = useState(startupNotice || loaded.notice);
  const [saveIssue, setSaveIssue] = useState(false);
  const [overlay, setOverlay] = useState<Utility | "none">("none");
  const [presentation, setPresentation] = useState(loadPresentation);
  const [systemMotion, setSystemMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reducedMotion = presentation.reducedMotion ?? systemMotion;
  const [viewControlsOpen, setViewControlsOpen] = useState(false);
  const [siteHour, setSiteHour] = useState(6 + 40 / 60);
  const viewButton = useRef<HTMLButtonElement>(null);
  const [testBeat, setTestBeat] = useState<number | null>(null);
  const [hidden, setHidden] = useState(document.hidden);
  const [sceneReady, setSceneReady] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [notebookTab, setNotebookTab] = useState<"lessons" | "log">("lessons");
  const importRef = useRef<HTMLInputElement>(null);
  const mission = session.mission;
  const objective = OBJECTIVES[mission.stage];
  const metrics = missionMetrics(mission);
  const chapterComplete = mission.stage === "complete";
  const stageNumber = STAGES.indexOf(mission.stage);
  const bay = mission.bay === null ? null : BAYS[mission.bay];
  const active = !entry;

  useEffect(() => {
    if (chapterComplete)
      void import("../campaign/CampaignApp").catch(() => undefined);
  }, [chapterComplete]);
  function continueCampaign() {
    if (!chapterComplete || !onCampaignReady) return;
    onCampaignReady(createCampaign(mission));
  }

  useEffect(() => {
    savePresentation(presentation);
  }, [presentation]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setSystemMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  function closeViewControls() {
    setViewControlsOpen(false);
    viewButton.current?.focus();
  }

  useEffect(() => {
    document.title = "CORE: First Light — A data center story";
    document.body.classList.add("firstlight-body");
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.body.classList.remove("firstlight-body");
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, encodeSession(session));
      setSaveIssue(false);
    } catch {
      setSaveIssue(true);
    }
  }, [session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        if (viewControlsOpen) closeViewControls();
        else if (inspect) setInspect(false);
        else setPanel("pause");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect, viewControlsOpen]);

  function act(command: MissionCommand) {
    const current = sessionRef.current;
    const result = transition(current.mission, command);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    const next = {
      mission: result.state,
      dialogue: startDialogue(result.state.stage, current.dialogue),
    };
    sessionRef.current = next;
    setSession(next);
    setNotice("");
    setInspect(false);
    setTarget(null);
    setGuideOpen(
      !["reflection", "expansion", "complete"].includes(result.state.stage),
    );
    if (command.type === "connect") setOverlay(command.utility);
    if (command.type === "test" && result.state.stage === "fault")
      setOverlay("cooling");
  }

  useEffect(() => {
    if (testBeat === null || panel || hidden) return;
    const timer = setTimeout(
      () => {
        if (testBeat < 2) setTestBeat(testBeat + 1);
        else {
          act({ type: "test" });
          setTestBeat(null);
        }
      },
      reducedMotion ? 450 : 1250,
    );
    return () => clearTimeout(timer);
  }, [testBeat, panel, hidden, reducedMotion]);

  function selectTarget(next: string) {
    setViewControlsOpen(false);
    setTarget(next);
    setInspect(true);
  }
  function enter() {
    setViewControlsOpen(false);
    if (mission.stage === "arrival") act({ type: "enter" });
    setEntry(false);
    setGuideOpen(true);
  }
  function newMission() {
    setSession(freshSession());
    setEntry(true);
    setTarget(null);
    setInspect(false);
    setPanel(null);
    setTestBeat(null);
    setNotice("");
    setOverlay("none");
  }
  function runTest() {
    setInspect(false);
    setTestBeat(0);
    setOverlay("cooling");
  }
  function toggleFullscreen() {
    const result = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.();
    result?.catch(() =>
      setNotice(
        "Fullscreen is unavailable here. The game already fills the browser window.",
      ),
    );
  }
  async function importSave(file?: File) {
    if (!file) return;
    if (file.size > 200_000) {
      setNotice("This file is too large to be a chapter save.");
      return;
    }
    const raw = await file.text();
    const campaignSave = decodeCampaign(raw);
    if (campaignSave && onCampaignReady) {
      onCampaignReady(campaignSave);
      return;
    }
    const restored = decodeSession(raw);
    if (!restored) {
      setNotice(
        "That save could not be validated. Your current mission is unchanged.",
      );
      return;
    }
    setSession(restored);
    setEntry(true);
    setPanel(null);
    setInspect(false);
    setTestBeat(null);
    setNotice("Progress restored. Continue when you are ready.");
  }

  const selectedBay = target?.startsWith("bay-")
    ? BAYS[Number(target.slice(4)) as Bay]
    : null;
  const utility: Utility | null =
    target === "power" || target === "cooling" || target === "network"
      ? target
      : null;
  const isCurrentUtility = utility === mission.stage;
  const utilities: Utility[] = ["power", "cooling", "network"];

  return (
    <main
      className={`fl-game ${entry ? "fl-is-entry" : ""} ${["reflection", "expansion", "complete"].includes(mission.stage) ? "fl-conversation-scene" : ""} ${guideOpen ? "" : "fl-guide-minimized"} ${reducedMotion ? "fl-reduced-motion" : ""}`}
      aria-label="CORE First Light game"
    >
      <Suspense
        fallback={
          <div className="fl-world-loading">
            <span className="fl-loading-ring" />
            <p>Opening the facility…</p>
          </div>
        }
      >
        <FacilityScene
          rackBay={mission.bay}
          powerConnected={mission.connections.power}
          coolingConnected={mission.connections.cooling}
          networkConnected={mission.connections.network}
          fault={
            mission.stage === "fault" ||
            (testBeat !== null && !mission.controlFixed)
          }
          live={mission.serviceOnline}
          testRunning={testBeat !== null}
          selectedTarget={target}
          placementMode={mission.stage === "placement" && active}
          reducedMotion={reducedMotion}
          paused={hidden || panel !== null}
          cameraView={presentation.cameraView}
          timeMode={presentation.timeMode}
          onTimeChange={setSiteHour}
          viewControlsOpen={viewControlsOpen}
          onCloseViewControls={closeViewControls}
          onCameraViewChange={(cameraView) => {
            setTarget(null);
            setInspect(false);
            setPresentation((current) => ({ ...current, cameraView }));
          }}
          onTimeModeChange={(timeMode) =>
            setPresentation((current) => ({ ...current, timeMode }))
          }
          intro={entry}
          overlay={overlay}
          onSelect={selectTarget}
          onReady={setSceneReady}
        />
      </Suspense>
      <div className="fl-vignette" aria-hidden="true" />

      <header className="fl-topbar">
        <button
          className="fl-brand"
          onClick={() => setPanel("chapters")}
          aria-label="Open chapter map"
        >
          <span className="fl-brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            CORE<span className="fl-brand-sub">FIRST LIGHT</span>
          </span>
        </button>
        <div className="fl-location">
          <MapPin size={13} />
          <span>
            MERIDIAN CAMPUS <b>/</b>{" "}
            <span className="fl-scene-clock" aria-label="Scene lighting time">
              {formatSiteTime(siteHour)}
            </span>
          </span>
          <i />
        </div>
        <div className="fl-top-actions">
          <button
            ref={viewButton}
            className="fl-icon fl-view-toggle"
            disabled={!sceneReady}
            onClick={() => {
              setInspect(false);
              setTarget(null);
              setViewControlsOpen((open) => !open);
            }}
            aria-label="View and lighting controls"
            aria-expanded={viewControlsOpen}
            aria-controls="fl-view-console"
          >
            <Camera size={19} />
            <span>Explore</span>
          </button>
          {active && (
            <button
              className="fl-icon"
              onClick={() => {
                setNotebookTab("lessons");
                setPanel("notebook");
              }}
              aria-label="Open field notebook"
            >
              <BookOpen size={19} />
            </button>
          )}
          <button
            className="fl-icon fl-fullscreen"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
          >
            <Expand size={18} />
          </button>
          <button
            className="fl-icon"
            onClick={() => setPanel("pause")}
            aria-label="Pause and settings"
          >
            {active ? <Pause size={19} /> : <Settings2 size={19} />}
          </button>
        </div>
      </header>

      {entry ? (
        <>
          <section className="fl-entry-content" aria-labelledby="entry-title">
            <div className="fl-chapter-label">
              <span /> A DATA CENTER STORY
            </div>
            <h1 id="entry-title" aria-label="First light.">
              First
              <br />
              <em>light.</em>
            </h1>
            <p className="fl-entry-intro">
              {mission.serviceOnline
                ? "The hall is online."
                : mission.bay !== null
                  ? "The first connections."
                  : "An empty hall."}
              <br />
              {mission.serviceOnline
                ? "Your first promise kept."
                : mission.bay !== null
                  ? "A promise in progress."
                  : "A delivery at the gate."}
              <br />
              {mission.stage === "arrival"
                ? "A promise to keep."
                : "Your story continues."}
            </p>
            <p className="fl-entry-copy">
              You’re the new project lead. Build the connections, test your
              decisions, and bring this place to life.
            </p>
            <button className="fl-primary fl-enter" onClick={enter}>
              {mission.stage === "arrival"
                ? "Enter the facility"
                : "Continue your story"}
              <ArrowRight size={20} />
            </button>
            {mission.stage !== "arrival" && (
              <p className="fl-resume-line">Saved at: {objective.title}</p>
            )}
            <div className="fl-entry-meta">
              <span>CHAPTER 01</span>
              <i />
              <span>PLAY AT YOUR PACE</span>
              <i />
              <span>SAVES ON THIS DEVICE</span>
            </div>
          </section>
          <div className="fl-entry-scene-label">
            <span className="fl-coordinate">35° 14′ N / FICTIONAL SETTING</span>
            <span>
              MERIDIAN
              <span className="fl-label-line" />
              {formatSiteTime(siteHour)}
            </span>
          </div>
          <footer className="fl-entry-footer">
            <span>Fictional campus. Real infrastructure questions.</span>
            <button onClick={() => setPanel("chapters")}>
              Explore the story <ChevronRight size={14} />
            </button>
          </footer>
        </>
      ) : (
        <>
          <div className="fl-mission-hud">
            <section className="fl-assignment" aria-label="Current assignment">
              <div className="fl-assignment-kicker">
                <span>01 / FIRST LIGHT</span>
                <span>
                  {Math.min(stageNumber, 12).toString().padStart(2, "0")} / 12
                </span>
              </div>
              <div className="fl-progress-track">
                <span style={{ width: `${(stageNumber / 12) * 100}%` }} />
              </div>
              <h1>{objective.title}</h1>
              <p>{objective.instruction}</p>
              {!chapterComplete &&
                !["reflection", "expansion"].includes(mission.stage) && (
                  <button
                    className="fl-text-action"
                    onClick={() => selectTarget(objective.target)}
                  >
                    <MapPin size={14} />
                    {objective.label}
                    <ArrowRight size={14} />
                  </button>
                )}
              {chapterComplete && (
                <button
                  className="fl-text-action"
                  onClick={() => {
                    setNotebookTab("log");
                    setPanel("notebook");
                  }}
                >
                  <ClipboardCheck size={15} />
                  Read your operations record
                  <ArrowRight size={14} />
                </button>
              )}
            </section>

            <section className="fl-status-strip" aria-label="Facility status">
              <div>
                <span
                  className={`fl-status-dot ${mission.serviceOnline ? "online" : ""}`}
                />
                <span>
                  {mission.serviceOnline
                    ? "SERVICE ONLINE"
                    : "CLIENT DISCONNECTED"}
                </span>
              </div>
              <div>
                <strong>{mission.budget}</strong>
                <span>credits</span>
              </div>
              <div className="fl-work-time">
                <strong>{mission.timeMinutes}</strong>
                <span>work min</span>
              </div>
            </section>

            <div className="fl-system-readiness" aria-label="Connected systems">
              {utilities.map((item) => (
                <button
                  key={item}
                  className={`fl-system-chip ${mission.connections[item] ? "is-connected" : ""} ${item}`}
                  onClick={() => {
                    setOverlay(overlay === item ? "none" : item);
                    selectTarget(item);
                  }}
                  aria-label={`Inspect ${item} system`}
                >
                  <UtilityIcon utility={item} />
                  <span>{item}</span>
                  {mission.connections[item] ? (
                    <Check size={13} />
                  ) : (
                    <span className="fl-empty-dot" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {inspect && target && (
            <section className="fl-inspector" aria-label="Equipment inspection">
              <div className="fl-inspector-header">
                <span className="fl-eyebrow">INSPECT / HALL 01</span>
                <button
                  className="fl-icon"
                  aria-label="Close inspection"
                  onClick={() => setInspect(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <h2>{TARGET_NAMES[target] ?? "Equipment"}</h2>
              {target === "delivery" && (
                <>
                  <div className="fl-equipment-symbol">
                    <Truck size={34} />
                    <span>RACK / 01</span>
                  </div>
                  <p>
                    One rack for the university’s teaching services. Purchased
                    before your arrival; delivered and ready for inspection.
                  </p>
                  <dl className="fl-specs">
                    <div>
                      <dt>Illustrative rack load</dt>
                      <dd>6 kW</dd>
                    </div>
                    <div>
                      <dt>Client connection</dt>
                      <dd>100 Mbps</dd>
                    </div>
                    <div>
                      <dt>Installation</dt>
                      <dd>8 credits</dd>
                    </div>
                  </dl>
                  <div className="fl-callout">
                    The building shell and incoming utilities are ready. You are
                    commissioning its first service.
                  </div>
                  {mission.stage === "survey" && (
                    <button
                      className="fl-primary"
                      onClick={() => act({ type: "inspect" })}
                    >
                      Inspect delivery
                      <ArrowRight size={17} />
                    </button>
                  )}
                </>
              )}
              {selectedBay && (
                <>
                  {mission.stage === "placement" && (
                    <div
                      className="fl-bay-choices"
                      role="group"
                      aria-label="Compare rack bays"
                    >
                      {BAYS.map((option) => (
                        <button
                          key={option.id}
                          aria-label={`Inspect Bay ${String.fromCharCode(65 + option.id)}`}
                          aria-pressed={selectedBay.id === option.id}
                          onClick={() => selectTarget(`bay-${option.id}`)}
                        >
                          Bay {String.fromCharCode(65 + option.id)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="fl-equipment-symbol">
                    <Layers3 size={32} />
                    <span>BUILDABLE BAY</span>
                  </div>
                  <p>{selectedBay.description}</p>
                  <dl className="fl-specs">
                    {utilities.map((item) => (
                      <div key={item}>
                        <dt>
                          <UtilityIcon utility={item} size={13} />
                          {item} route
                        </dt>
                        <dd>
                          {selectedBay.routeMetres[item]} m{" "}
                          <span>/ {selectedBay.connectionCosts[item]} cr</span>
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt>Installation</dt>
                      <dd>{selectedBay.installCost} credits</dd>
                    </div>
                  </dl>
                  <div className="fl-callout">
                    Same rack. Different connection lengths. Confirming installs
                    the rack here; utility routes are connected next.
                  </div>
                  {mission.stage === "placement" && (
                    <button
                      className="fl-primary"
                      onClick={() =>
                        act({ type: "install", bay: selectedBay.id })
                      }
                    >
                      Install in Bay {String.fromCharCode(65 + selectedBay.id)}
                      <ArrowRight size={17} />
                    </button>
                  )}
                </>
              )}
              {utility && (
                <>
                  <div className={`fl-equipment-symbol ${utility}`}>
                    <UtilityIcon utility={utility} size={34} />
                    <span>
                      {mission.connections[utility]
                        ? "CONNECTED TO YOUR BAY"
                        : "AVAILABLE SOURCE"}
                    </span>
                  </div>
                  <p>
                    {utility === "power"
                      ? "The electrical room has a ready distribution circuit. Connect it to the rack’s actual location."
                      : utility === "cooling"
                        ? "The plant can remove heat from this hall. Its route and its operating control both need to work."
                        : "This first fiber connection serves the university. A connection’s availability matters as well as its bandwidth."}
                  </p>
                  <dl className="fl-specs">
                    <div>
                      <dt>Illustrative capacity</dt>
                      <dd>
                        {utility === "power"
                          ? "12 kW"
                          : utility === "cooling"
                            ? "8 kW of heat"
                            : "1,000 Mbps"}
                      </dd>
                    </div>
                    {bay && (
                      <>
                        <div>
                          <dt>Route to {bay.name}</dt>
                          <dd>{bay.routeMetres[utility]} m</dd>
                        </div>
                        <div>
                          <dt>Connection cost</dt>
                          <dd>{bay.connectionCosts[utility]} credits</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  {isCurrentUtility && (
                    <button
                      className="fl-primary"
                      onClick={() => act({ type: "connect", utility })}
                    >
                      Connect{" "}
                      {utility === "network"
                        ? "fiber route"
                        : `${utility} circuit`}
                      <ArrowRight size={17} />
                    </button>
                  )}
                  {mission.connections[utility] && (
                    <div className="fl-connected-note">
                      <Check size={16} />
                      Physical path connected
                      {utility === "cooling" && !mission.commissioned
                        ? " · response unverified"
                        : ""}
                    </div>
                  )}
                </>
              )}
              {target === "controls" && (
                <>
                  <div
                    className={`fl-equipment-symbol ${mission.controlFixed ? "cooling" : "fault"}`}
                  >
                    <Settings2 size={34} />
                    <span>
                      {mission.controlFixed
                        ? "AUTOMATIC RESPONSE"
                        : "MANUAL STANDBY"}
                    </span>
                  </div>
                  <p>
                    The cooling plant is physically connected. Its controller
                    must call for cooling when the load rises.
                  </p>
                  <div className="fl-control-diagram">
                    <span>Rack load</span>
                    <ArrowRight size={16} />
                    <strong className={mission.controlFixed ? "" : "fault"}>
                      {mission.controlFixed ? "AUTO" : "STANDBY"}
                    </strong>
                    <ArrowRight size={16} />
                    <span>Cooling</span>
                  </div>
                  {mission.stage === "fault" && (
                    <>
                      <div className="fl-callout fl-warning">
                        The test detected no automatic cooling response.
                        Customer service was never connected.
                      </div>
                      <button
                        className="fl-primary"
                        onClick={() => act({ type: "repair" })}
                      >
                        Enable automatic control
                        <Check size={17} />
                      </button>
                    </>
                  )}
                  {mission.controlFixed && (
                    <div className="fl-connected-note">
                      <Check size={16} />
                      Control corrected
                      {!mission.commissioned
                        ? " · retest required"
                        : " · test passed"}
                    </div>
                  )}
                </>
              )}
              {target === "rack" && (
                <>
                  <div className="fl-equipment-symbol">
                    <Layers3 size={34} />
                    <span>
                      {mission.serviceOnline
                        ? "UNIVERSITY SERVICE / LIVE"
                        : mission.commissioned
                          ? "READY FOR HANDOVER"
                          : "CUSTOMER SERVICE / OFFLINE"}
                    </span>
                  </div>
                  <dl className="fl-specs">
                    <div>
                      <dt>Installed at</dt>
                      <dd>{bay?.name ?? "Not installed"}</dd>
                    </div>
                    <div>
                      <dt>Service load</dt>
                      <dd>{metrics.serviceKw} / 6 kW</dd>
                    </div>
                    <div>
                      <dt>Facility power now</dt>
                      <dd>{metrics.facilityDrawKw} kW</dd>
                    </div>
                  </dl>
                  <ul className="fl-check-list">
                    {metrics.conditions.map((condition) => (
                      <li key={condition.id} className={condition.status}>
                        {condition.status === "passed" ? (
                          <Check size={15} />
                        ) : condition.status === "failed" ? (
                          <X size={15} />
                        ) : (
                          <span className="fl-check-pending" />
                        )}
                        <span>
                          {condition.label}
                          <small>{condition.detail}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {["commissioning", "retest"].includes(mission.stage) && (
                    <button className="fl-primary" onClick={runTest}>
                      <ClipboardCheck size={17} />
                      Run commissioning test
                    </button>
                  )}
                  {mission.stage === "handover" && (
                    <button
                      className="fl-primary"
                      onClick={() => act({ type: "activate" })}
                    >
                      Bring service online
                      <Zap size={17} />
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {mission.stage === "reflection" && (
            <section
              className="fl-decision fl-reflection"
              aria-labelledby="reflection-title"
            >
              <div className="fl-success-banner">
                <CheckCheck size={19} />
                UNIVERSITY SERVICE CONNECTED
              </div>
              <span className="fl-eyebrow">A MOMENT TO REFLECT</span>
              <h2 id="reflection-title">
                What actually stopped the first test?
              </h2>
              <p>
                There is no penalty for reconsidering. Follow the cause through
                the system.
              </p>
              <div className="fl-choice-list">
                {[
                  {
                    id: "controls",
                    text: "The cooling control did not respond to the load.",
                  },
                  {
                    id: "more-racks",
                    text: "We needed more servers in the hall.",
                  },
                  {
                    id: "bandwidth",
                    text: "The network connection was too small.",
                  },
                ].map((choice, index) => (
                  <button
                    key={choice.id}
                    onClick={() => act({ type: "reflect", answer: choice.id })}
                  >
                    <span>{index + 1}</span>
                    {choice.text}
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {mission.stage === "expansion" && (
            <section
              className="fl-decision fl-expansion"
              aria-labelledby="expansion-title"
            >
              <div className="fl-letter-head">
                <span className="fl-letter-avatar">IP</span>
                <div>
                  <strong>Ishan Patel</strong>
                  <small>Procurement lead / new message</small>
                </div>
                <span className="fl-eyebrow">FICTIONAL SCENARIO</span>
              </div>
              <h2 id="expansion-title">
                The next hall needs more than a date.
              </h2>
              <p>
                “The university wants more capacity next term. An export review
                may delay our next shipment. Their first service is safe. What
                do we prepare before making the next promise?”
              </p>
              <div className="fl-choice-list">
                {[
                  {
                    id: "phase",
                    title: "Plan a phased opening",
                    text: "Fund a study of the grid, delivery, and testing dates. Start with what we can verify.",
                    cost: "4 cr",
                  },
                  {
                    id: "reserve",
                    title: "Hold an alternate delivery slot",
                    text: "Reserve an option while compatibility and timing are checked. No hardware is delivered yet.",
                    cost: "6 cr",
                  },
                  {
                    id: "rush",
                    title: "Request the earliest opening",
                    text: "Record an ambitious target for a feasibility review. The date is still unconfirmed.",
                    cost: "0 cr",
                  },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() =>
                      act({ type: "expansion", choice: choice.id })
                    }
                  >
                    <div>
                      <strong>{choice.title}</strong>
                      <small>{choice.text}</small>
                    </div>
                    <span className="fl-choice-cost">{choice.cost}</span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
              <small className="fl-footnote">
                Your preparation is recorded. Its later consequences belong to
                the next chapter.
              </small>
            </section>
          )}

          {chapterComplete && !inspect && (
            <section
              className="fl-completion"
              aria-labelledby="completion-title"
            >
              <span className="fl-complete-icon">
                <Flag size={26} />
              </span>
              <span className="fl-eyebrow">CHAPTER 01 COMPLETE</span>
              <h2 id="completion-title">
                A promise
                <br />
                <em>kept.</em>
              </h2>
              <p>
                You installed a rack, connected its dependencies, found a
                control fault, and verified the correction before handover.
              </p>
              <div className="fl-completion-metrics">
                <div>
                  <strong>
                    6 <small>kW</small>
                  </strong>
                  <span>CLIENT LOAD ONLINE</span>
                </div>
                <div>
                  <strong>{mission.testRuns}</strong>
                  <span>TESTS / FAULT RESOLVED</span>
                </div>
                <div>
                  <strong>{mission.budget}</strong>
                  <span>CREDITS REMAINING</span>
                </div>
              </div>
              <div className="fl-next-note">
                <span className="fl-eyebrow">YOUR NEXT COMMITMENT</span>
                <p>{mission.log.at(-1)?.detail}</p>
              </div>
              <button className="fl-primary" onClick={continueCampaign}>
                Continue to Chapter 02
                <ArrowRight size={17} />
              </button>
              <button
                className="fl-text-action"
                onClick={() => {
                  setNotebookTab("log");
                  setPanel("notebook");
                }}
              >
                Read your debrief
                <ArrowRight size={17} />
              </button>
              <button
                className="fl-text-action"
                onClick={() => setPanel("chapters")}
              >
                See the campaign ahead
                <ChevronRight size={16} />
              </button>
              <small className="fl-footnote">
                Your hall, remaining credits, and preparation carry into the
                next chapter.
              </small>
            </section>
          )}

          {testBeat !== null && (
            <section
              className="fl-test-overlay"
              aria-label="Commissioning test in progress"
              aria-live="polite"
            >
              <div className="fl-test-header">
                <ClipboardCheck size={24} />
                <div>
                  <span className="fl-eyebrow">
                    CONTROLLED ACCEPTANCE EXERCISE
                  </span>
                  <h2>
                    {
                      [
                        "Checking the power path",
                        "Applying the 6 kW rack test load",
                        "Verifying cooling response",
                      ][testBeat]
                    }
                  </h2>
                </div>
              </div>
              <div className="fl-test-steps">
                {["Power available", "Network ready", "Cooling response"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className={index <= testBeat ? "active" : ""}
                    >
                      <span>
                        {index < testBeat ? <Check size={14} /> : index + 1}
                      </span>
                      {label}
                    </div>
                  ),
                )}
              </div>
              <p>
                Customer service remains disconnected.{" "}
                {panel || hidden
                  ? "Exercise paused."
                  : "Watch the equipment; the result arrives shortly."}
              </p>
            </section>
          )}

          <section
            className={`fl-mentor ${!guideOpen ? "is-collapsed" : ""} ${["reflection", "expansion", "complete"].includes(mission.stage) ? "fl-mentor-compact" : ""}`}
            aria-label="Mara, your facilities guide"
          >
            <button
              className="fl-mentor-toggle"
              onClick={() => setGuideOpen(!guideOpen)}
              aria-expanded={guideOpen}
              aria-label={
                guideOpen ? "Minimize Mara’s guidance" : "Open Mara’s guidance"
              }
            >
              <MaraPortrait />
              <span className="fl-mentor-presence" />
            </button>
            {guideOpen ? (
              <div className="fl-mentor-body">
                <div className="fl-mentor-byline">
                  <strong>MARA</strong>
                  <span>FACILITIES LEAD</span>
                  <button
                    className="fl-icon"
                    aria-label="Minimize guidance"
                    onClick={() => setGuideOpen(false)}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <div className="fl-mentor-lines" aria-live="polite">
                  {session.dialogue.lines.map((line, index) => (
                    <p key={`${mission.stage}-${index}-${line.slice(0, 10)}`}>
                      {line}
                    </p>
                  ))}
                </div>
                <div className="fl-mentor-choices">
                  {session.dialogue.choices.map((choice) => (
                    <button
                      key={choice.index}
                      onClick={() =>
                        setSession({
                          ...session,
                          dialogue: chooseDialogue(
                            session.dialogue,
                            choice.index,
                          ),
                        })
                      }
                    >
                      <CircleHelp size={13} />
                      {choice.text}
                    </button>
                  ))}
                  {!session.dialogue.choices.length && !chapterComplete && (
                    <button
                      onClick={() =>
                        setSession({
                          ...session,
                          dialogue: startDialogue(
                            mission.stage,
                            session.dialogue,
                          ),
                        })
                      }
                    >
                      <ArrowLeft size={13} />
                      Back to briefing
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="fl-guide-collapsed"
                onClick={() => setGuideOpen(true)}
              >
                Ask Mara
                <CircleHelp size={16} />
              </button>
            )}
          </section>

          <footer className="fl-game-footer">
            <span>
              {saveIssue
                ? "SESSION ONLY · EXPORT TO KEEP PROGRESS"
                : "PROGRESS SAVED ON THIS DEVICE"}
            </span>
            <button
              onClick={() => {
                setNotebookTab("lessons");
                setPanel("notebook");
              }}
            >
              <BookOpen size={13} />
              Field notebook
            </button>
            <span className="fl-floor-coordinate">
              HALL 01 / {sceneReady ? "FACILITY VIEW" : "FACILITY CONTROLS"}
            </span>
          </footer>
        </>
      )}

      {notice && (
        <div className="fl-notice" role="status">
          <CircleHelp size={17} />
          <span>{notice}</span>
          <button
            className="fl-icon"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {saveIssue && entry && (
        <div className="fl-storage-note" role="status">
          Storage unavailable. You can export progress from the pause menu.
        </div>
      )}

      {panel === "pause" && (
        <Dialog
          title={entry ? "Your game" : "Take a breath."}
          onClose={() => setPanel(null)}
        >
          <p className="fl-dialog-intro">
            Your mission waits for you. Decisions and dialogue advance at your
            pace.
          </p>
          <div className="fl-pause-actions">
            <button className="fl-primary" onClick={() => setPanel(null)}>
              <Play size={16} />
              Return to the facility
            </button>
            <button
              className="fl-secondary"
              onClick={() => setPanel("chapters")}
            >
              <Layers3 size={17} />
              Chapter map
              <ChevronRight size={16} />
            </button>
            <button
              className="fl-secondary"
              onClick={() => {
                setNotebookTab("lessons");
                setPanel("notebook");
              }}
            >
              <BookOpen size={17} />
              Field notebook
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="fl-settings">
            <label>
              <span>
                <strong>Reduced motion</strong>
                <small>Keep the camera and environment calmer.</small>
              </span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) =>
                  setPresentation((current) => ({
                    ...current,
                    reducedMotion: event.target.checked,
                  }))
                }
              />
            </label>
            <button className="fl-secondary" onClick={toggleFullscreen}>
              <Maximize2 size={16} />
              Toggle fullscreen
            </button>
          </div>
          <div className="fl-save-actions">
            <button onClick={() => downloadSession(session)}>
              <Download size={16} />
              Export progress
            </button>
            <button onClick={() => importRef.current?.click()}>
              <Upload size={16} />
              Import progress
            </button>
            <button onClick={() => setPanel("restart")}>
              <RotateCcw size={16} />
              Start again
            </button>
          </div>
          <p className="fl-footnote">
            Controls: select scene markers or “Find” in the assignment. Use the
            view controls to pan and zoom. Escape closes inspection or pauses.
            All essential actions also work with Tab and Enter.
          </p>
          <a className="fl-legacy-link" href="?mode=legacy">
            Open the earlier strategy prototype
            <ExternalLink size={12} />
          </a>
          <a
            className="fl-legacy-link"
            href="third-party-notices.txt"
            target="_blank"
            rel="noreferrer"
          >
            Software credits and licenses <ExternalLink size={12} />
          </a>
        </Dialog>
      )}

      {panel === "restart" && (
        <Dialog
          title="Start a new first day?"
          onClose={() => setPanel("pause")}
        >
          <p className="fl-dialog-intro">
            This replaces this chapter’s local save. Export your progress first
            if you want to keep it. Earlier prototype saves stay separate.
          </p>
          <button
            className="fl-secondary"
            onClick={() => downloadSession(session)}
          >
            <Download size={16} />
            Export current progress
          </button>
          <div className="fl-dialog-buttons">
            <button className="fl-secondary" onClick={() => setPanel("pause")}>
              Keep playing
            </button>
            <button className="fl-primary" onClick={newMission}>
              Start new mission
              <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}

      {panel === "chapters" && (
        <Dialog
          title="A facility. A bigger world."
          onClose={() => setPanel(null)}
          wide
        >
          <p className="fl-dialog-intro">
            From the first connection to the dependencies beyond your gates.
          </p>
          <ol className="fl-chapter-map">
            {CHAPTERS.map((chapter) => (
              <li
                key={chapter.number}
                className={
                  chapter.number === "01" ||
                  (chapterComplete && chapter.number === "02")
                    ? "available"
                    : ""
                }
              >
                <span>{chapter.number}</span>
                <div>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.description}</p>
                </div>
                <small>
                  {chapter.number === "01"
                    ? chapterComplete
                      ? "COMPLETED"
                      : "CURRENT"
                    : chapterComplete && chapter.number === "02"
                      ? "READY"
                      : "UNLOCKS IN STORY"}
                </small>
                {chapter.number === "01" ? (
                  <Flag size={17} />
                ) : (
                  <span className="fl-chapter-dot" />
                )}
              </li>
            ))}
          </ol>
          <p className="fl-footnote">
            Six connected chapters. Finish each assignment to unlock the next;
            decisions, construction, and tested recovery paths carry forward.
          </p>
          {chapterComplete && (
            <button className="fl-primary" onClick={continueCampaign}>
              Continue to Chapter 02 <ArrowRight size={17} />
            </button>
          )}
          <button
            className="fl-primary"
            onClick={() => {
              setPanel(null);
              if (entry) enter();
            }}
          >
            {mission.stage === "arrival"
              ? "Begin First light"
              : "Return to First light"}
            <ArrowRight size={17} />
          </button>
        </Dialog>
      )}

      {panel === "notebook" && (
        <Dialog title="The field notebook" onClose={() => setPanel(null)} wide>
          <div className="fl-notebook-tabs">
            <button
              className={notebookTab === "lessons" ? "active" : ""}
              onClick={() => setNotebookTab("lessons")}
            >
              <BookOpen size={16} />
              Principles & sources
            </button>
            <button
              className={notebookTab === "log" ? "active" : ""}
              onClick={() => setNotebookTab("log")}
            >
              <ClipboardCheck size={16} />
              Operations record
            </button>
          </div>
          {notebookTab === "lessons" ? (
            <div className="fl-lessons">
              {LESSONS.filter(
                (lesson) => lesson.unlock <= stageNumber || entry,
              ).map((lesson) => (
                <article key={lesson.id}>
                  <span className="fl-eyebrow">
                    FIELD NOTE / {lesson.id.toUpperCase()}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.principle}</p>
                  <p className="fl-lesson-here">{lesson.here}</p>
                  <a href={lesson.url} target="_blank" rel="noreferrer">
                    {lesson.publisher}
                    <ExternalLink size={13} />
                    <small>{lesson.source}</small>
                  </a>
                </article>
              ))}
              {stageNumber < 1 && !entry && (
                <p>Field notes appear as you encounter each system.</p>
              )}
              <div className="fl-method-note">
                <ShieldCheck size={20} />
                <p>
                  Sources reviewed 12 September 2026. Characters, costs,
                  durations, equipment values, and policy events are fictional
                  teaching parameters. This exercise is not engineering
                  certification or current legal guidance.
                </p>
              </div>
            </div>
          ) : (
            <div className="fl-operation-log">
              {mission.log.length ? (
                mission.log.map((item) => (
                  <article key={item.id}>
                    <span>
                      {item.minute.toString().padStart(3, "0")}{" "}
                      <small>WORK MIN</small>
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p>Your record starts when you enter the facility.</p>
              )}
              <p className="fl-footnote">
                Work minutes are illustrative project effort. They advance with
                decisions, not time spent reading. All credit values are
                fictional.
              </p>
            </div>
          )}
        </Dialog>
      )}
      <input
        ref={importRef}
        className="fl-file-input"
        type="file"
        accept="application/json,.json"
        aria-label="Import chapter save file"
        onChange={(event) => {
          void importSave(event.target.files?.[0]).catch(() =>
            setNotice(
              "The file could not be read. Your current mission is unchanged.",
            ),
          );
          event.currentTarget.value = "";
        }}
      />
    </main>
  );
}

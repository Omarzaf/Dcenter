import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  Expand,
  FlaskConical,
  Layers3,
  Map,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  campaignChoices,
  campaignMetrics,
  campaignSchedule,
  campaignVisual,
  forecastScenario,
  replayChapter,
  transitionCampaign,
} from "./model";
import { decodeCampaign, encodeCampaign, saveCampaign } from "./persistence";
import {
  CHAPTERS,
  GUIDES,
  LESSONS,
  PHASE_LABELS,
  equipmentSummary,
  stageCopy,
} from "./content";
import type {
  CampaignChapter,
  CampaignState,
  ScenarioAssumptions,
} from "./types";
import {
  formatSiteTime,
  loadPresentation,
  savePresentation,
} from "../firstlight/presentation";
import type { Utility } from "../firstlight/types";
import "../firstlight/firstLight.css";
import "../firstlight/immersion.css";
import "./campaign.css";

function SceneFallback() {
  return (
    <section className="fl-world-fallback" role="status">
      <p>
        The facility view is unavailable. Every campaign decision and equipment
        inspection is still available below.
      </p>
    </section>
  );
}
const FacilityScene = lazy(() =>
  import("../firstlight/FacilityScene").catch(() => ({
    default: SceneFallback,
  })),
);
type Panel = "menu" | "notebook" | "chapters" | "planner" | "equipment" | null;
type Confirmation =
  | { kind: "chapter"; chapter: CampaignChapter }
  | { kind: "firstlight" }
  | { kind: "import"; state: CampaignState };
const BASELINE: ScenarioAssumptions = {
  hardwareDelayDays: 0,
  gridDelayDays: 0,
  gridReductionPercent: 0,
  waterReductionPercent: 0,
  corridorOutage: false,
};
const EQUIPMENT = [
  { id: "expansion", label: "Hall B" },
  { id: "rack", label: "Hall A" },
  { id: "power", label: "Power" },
  { id: "cooling", label: "Cooling" },
  { id: "battery", label: "Battery" },
  { id: "network", label: "Network" },
  { id: "delivery", label: "Delivery" },
];
const money = (value: number) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`;
const quantity = (value: number) => Number(value.toFixed(1)).toLocaleString();
const day = (value: number) => `Day ${quantity(value)}`;
const elapsed = (days: number) =>
  days * 24 < 1
    ? `${Math.max(1, Math.round(days * 1440))} minutes`
    : days < 1
      ? `${quantity(days * 24)} hours`
      : `${quantity(days)} ${days === 1 ? "day" : "days"}`;

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
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`cp-dialog ${wide ? "cp-dialog-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="cp-dialog-heading">
        <div>
          <span className="cp-eyebrow">CORE / FIELD OPERATIONS</span>
          <h2>{title}</h2>
        </div>
        <button
          className="cp-icon"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          <X size={20} />
        </button>
      </header>
      <div className="cp-dialog-body">{children}</div>
    </dialog>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="cp-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function NetworkRoutes({ state }: { state: CampaignState }) {
  const diverse = state.network === "diverse";
  const corridorOut =
    state.chapter === 6 &&
    state.stage !== "cable-signal" &&
    (!state.recoveryTested || state.cableResponse === "order-emergency");
  const emergency =
    state.cableResponse === "order-emergency" && state.recoveryTested;
  return (
    <figure className="cp-route-figure">
      <svg
        viewBox="0 0 326 224"
        role="img"
        aria-labelledby="campaign-route-title campaign-route-description"
      >
        <title id="campaign-route-title">
          Your physical network dependencies
        </title>
        <desc id="campaign-route-description">
          {diverse
            ? "Two services enter through separate physical corridors before reaching the campus."
            : "Two service contracts share Corridor A, so losing that corridor interrupts both paths."}
          {corridorOut ? " Corridor A is currently unavailable." : ""}
          {emergency
            ? " A temporary, tested route now carries only critical service; the original corridor remains unavailable."
            : ""}
        </desc>
        <g className="cp-route-lines">
          <path d={diverse ? "M68 48 V87" : "M68 48 V67 H163 V88"} />
          <path d={diverse ? "M258 48 V87" : "M258 48 V67 H163"} />
          <path
            d={
              diverse
                ? "M68 124 V149 H163 V176 M258 124 V149 H163"
                : "M163 124 V176"
            }
          />
        </g>
        <g className="cp-route-node">
          <rect x="14" y="14" width="108" height="34" rx="4" />
          <text x="68" y="35">
            Service A
          </text>
          <rect x="204" y="14" width="108" height="34" rx="4" />
          <text x="258" y="35">
            Service B
          </text>
        </g>
        {diverse ? (
          <>
            <g className={`cp-route-node ${corridorOut ? "is-outage" : ""}`}>
              <rect x="7" y="88" width="123" height="36" rx="4" />
              <text x="68" y="110">
                Corridor A{corridorOut ? " · out" : ""}
              </text>
            </g>
            <g
              className={`cp-route-node ${state.routeTested ? "is-tested" : ""}`}
            >
              <rect x="196" y="88" width="123" height="36" rx="4" />
              <text x="258" y="110">
                Corridor B
              </text>
            </g>
          </>
        ) : (
          <g className={`cp-route-node ${corridorOut ? "is-outage" : ""}`}>
            <rect x="78" y="88" width="170" height="36" rx="4" />
            <text x="163" y="110">
              Shared Corridor A{corridorOut ? " · out" : ""}
            </text>
          </g>
        )}
        <g className="cp-route-node">
          <rect x="79" y="176" width="168" height="34" rx="4" />
          <text x="163" y="197">
            Campus service
          </text>
        </g>
      </svg>
      <figcaption>
        {diverse
          ? `${state.routeTested ? "Exercised" : "Installed, not yet exercised"} route separation avoids the shared-corridor failure.`
          : "A second contract still shares the same physical point of failure."}
        {emergency
          ? " Temporary critical-service route added after delivery and testing; original-corridor repair remains outstanding."
          : ""}
      </figcaption>
    </figure>
  );
}

function OperatingRecord({ state }: { state: CampaignState }) {
  const metrics = campaignMetrics(state);
  return (
    <>
      <p className="cp-muted">
        A record of this timeline. The resource totals cover three two-hour heat
        exercises; the corridor recovery is a separate episode.
      </p>
      <dl className="cp-record-metrics">
        <Metric
          label="Expansion opened"
          value={
            state.actualOpenDay === null
              ? "Not yet open"
              : day(state.actualOpenDay)
          }
        />
        <Metric
          label="Client commitment"
          value={
            metrics.openingKept === null
              ? state.promisedDay === null
                ? "Not recorded"
                : `${day(state.promisedDay)} · awaiting opening`
              : metrics.openingKept
                ? "Date kept"
                : "Date missed"
          }
        />
        <Metric
          label="Critical energy unserved"
          value={`${quantity(state.unservedCriticalKwh)} kWh`}
        />
        <Metric
          label="Research work deferred"
          value={`${quantity(state.deferredKwh)} kWh`}
        />
        <Metric
          label="Cooling water · heat exercises"
          value={`${quantity(state.waterLitres)} L`}
        />
        <Metric
          label="Water commitment"
          value={
            metrics.waterKept === null
              ? state.communityPromise === "promise-water"
                ? "48 L pledge · assessment pending"
                : "No water pledge"
              : metrics.waterKept
                ? "Kept"
                : "Exceeded"
          }
        />
        <Metric
          label="Corridor response elapsed"
          value={`${quantity(state.recoveryHours)} h`}
        />
        <Metric
          label="Recovery test"
          value={state.recoveryTested ? "Completed" : "Not completed"}
        />
      </dl>
      <p className="cp-record-statement">{metrics.continuityLabel}</p>
      <h3>How this campus got here</h3>
      <ol className="cp-journal">
        <li>
          <span>CHAPTER 01 / FIRST LIGHT</span>
          <h4>Original service commissioned</h4>
          <p>
            Bay {String.fromCharCode(65 + (state.origin.bay ?? 0))}, with
            electrical supply, cooling and network connected.{" "}
            {state.origin.testRuns} commissioning test
            {state.origin.testRuns === 1 ? "" : "s"} recorded.
          </p>
        </li>
        <li>
          <span>CHAPTER 02 / EXPANSION FUNDING</span>
          <h4>Board grant released: 120 credits</h4>
          <p>
            {money(state.origin.budget)} carried forward from First Light, plus
            the 120-credit board grant, established an opening campaign budget
            of {money(state.origin.budget + 120)}. The expenditure record below
            explains the remaining {money(state.budget)}.
          </p>
        </li>
        {state.journal.map((record, index) => (
          <li key={`${record.stage}-${index}`}>
            <span>
              CHAPTER {String(record.chapter).padStart(2, "0")} /{" "}
              {day(record.day)}
              {record.spent > 0 ? ` / ${money(record.spent)}` : ""}
            </span>
            <h4>{record.title}</h4>
            <p>{record.detail}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function Planner({ state }: { state: CampaignState }) {
  const [draft, setDraft] = useState<ScenarioAssumptions>({ ...BASELINE });
  const baseline = forecastScenario(state, BASELINE);
  const forecast = forecastScenario(state, draft);
  const scheduleDefined = state.supplier !== null && state.shellDay > 0;
  const fields: {
    key: Exclude<keyof ScenarioAssumptions, "corridorOutage">;
    label: string;
    max: number;
    unit: string;
  }[] = [
    {
      key: "hardwareDelayDays",
      label: "Additional hardware delay",
      max: 60,
      unit: "days",
    },
    {
      key: "gridDelayDays",
      label: "Additional grid delay",
      max: 60,
      unit: "days",
    },
    {
      key: "gridReductionPercent",
      label: "Physical grid power reduction",
      max: 90,
      unit: "%",
    },
    {
      key: "waterReductionPercent",
      label: "Cooling water allocation reduction",
      max: 90,
      unit: "%",
    },
  ];
  return (
    <>
      <p className="cp-planner-note">
        <FlaskConical size={18} /> Practice only. These assumptions do not
        change your campaign or install new equipment.
      </p>
      <p className="cp-muted">
        Compare the current design under a baseline with no added disruption
        against an explicit hypothetical. Outputs are conditional calculations,
        not predictions or probabilities.
      </p>
      {!scheduleDefined && (
        <p className="cp-inline-notice">
          The expansion schedule is incomplete. Choose its scope, site, supplier
          and shell works before comparing opening dates. Service calculations
          use only the design selected so far.
        </p>
      )}
      <div className="cp-scenario-fields">
        {fields.map((field) => (
          <label key={field.key} className="cp-slider">
            <span>
              {field.label}
              <strong>
                {draft[field.key]} {field.unit}
              </strong>
            </span>
            <input
              type="range"
              min={0}
              max={field.max}
              step={1}
              value={draft[field.key]}
              aria-label={field.label}
              aria-valuetext={`${draft[field.key]} ${field.unit}`}
              onChange={(event) =>
                setDraft({ ...draft, [field.key]: Number(event.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <label className="cp-checkbox">
        <input
          type="checkbox"
          checked={draft.corridorOutage}
          onChange={(event) =>
            setDraft({ ...draft, corridorOutage: event.target.checked })
          }
        />{" "}
        Shared corridor unavailable
      </label>
      <div className="cp-table-wrap">
        <table className="cp-forecast">
          <caption>
            Conditional comparison for your installed and selected design
          </caption>
          <thead>
            <tr>
              <th scope="col">Outcome</th>
              <th scope="col">Baseline</th>
              <th scope="col">Hypothetical</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Earliest opening</th>
              <td>
                {scheduleDefined ? day(baseline.openingDay) : "Not scheduled"}
              </td>
              <td>
                {scheduleDefined ? day(forecast.openingDay) : "Not scheduled"}
              </td>
            </tr>
            <tr>
              <th scope="row">Binding schedule item</th>
              <td>
                {scheduleDefined
                  ? baseline.criticalPath
                  : "Define the prerequisites"}
              </td>
              <td>
                {scheduleDefined
                  ? forecast.criticalPath
                  : "Define the prerequisites"}
              </td>
            </tr>
            <tr>
              <th scope="row">IT service</th>
              <td>{quantity(baseline.serviceKw)} kW</td>
              <td>{quantity(forecast.serviceKw)} kW</td>
            </tr>
            <tr>
              <th scope="row">Critical service</th>
              <td>{quantity(baseline.criticalServedKw)} kW</td>
              <td>{quantity(forecast.criticalServedKw)} kW</td>
            </tr>
            <tr>
              <th scope="row">Battery bridge</th>
              <td>{quantity(baseline.batteryMinutes)} min</td>
              <td>{quantity(forecast.batteryMinutes)} min</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Why the result changes</h3>
      <ul className="cp-explanation-list">
        {forecast.explanation.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
      <button
        className="cp-secondary"
        onClick={() => setDraft({ ...BASELINE })}
      >
        <RotateCcw size={16} /> Reset assumptions
      </button>
    </>
  );
}

export default function CampaignApp({
  initialState,
  onReturnToFirstLight,
}: {
  initialState: CampaignState;
  onReturnToFirstLight: () => void;
}) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [panel, setPanel] = useState<Panel>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState("");
  const [saveIssue, setSaveIssue] = useState(false);
  const [target, setTarget] = useState<string | null>(
    stageCopy(initialState).target,
  );
  const [overlay, setOverlay] = useState<Utility | "none">("none");
  const [presentation, setPresentation] = useState(loadPresentation);
  const [systemMotion, setSystemMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [sceneReady, setSceneReady] = useState(false);
  const [viewControlsOpen, setViewControlsOpen] = useState(false);
  const [siteHour, setSiteHour] = useState(6 + 40 / 60);
  const [guideOpen, setGuideOpen] = useState(true);
  const [notebookTab, setNotebookTab] = useState<"lessons" | "record">(
    "lessons",
  );
  const viewButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const focusNextAssignment = useRef(false);
  const reducedMotion = presentation.reducedMotion ?? systemMotion;
  const copy = stageCopy(state);
  const guide = GUIDES[copy.guide];
  const chapter = CHAPTERS[state.chapter - 1];
  const choices = campaignChoices(state);
  const metrics = campaignMetrics(state);
  const schedule = campaignSchedule(state);
  const lastRecord = state.journal[state.journal.length - 1];
  const complete = state.stage === "complete";
  const equipment = equipmentSummary(target ?? copy.target, state);

  useEffect(() => {
    mounted.current = true;
    document.body.classList.add("firstlight-body");
    const visibility = () => setHidden(document.hidden);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setSystemMotion(media.matches);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", motion);
    return () => {
      mounted.current = false;
      document.body.classList.remove("firstlight-body");
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", motion);
    };
  }, []);
  useEffect(() => {
    document.title = `CORE — ${chapter.title}`;
  }, [chapter.title]);
  useEffect(() => {
    setSaveIssue(!saveCampaign(state));
  }, [state]);
  useEffect(() => {
    if (focusNextAssignment.current) {
      focusNextAssignment.current = false;
      heading.current?.focus({ preventScroll: true });
    }
  }, [state]);
  useEffect(() => {
    savePresentation(presentation);
  }, [presentation]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]"))
        return;
      if (viewControlsOpen) closeViewControls();
      else setPanel("menu");
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [viewControlsOpen]);

  function closeViewControls() {
    setViewControlsOpen(false);
    viewButton.current?.focus({ preventScroll: true });
  }
  function openPanel(next: Panel) {
    setViewControlsOpen(false);
    setPanel(next);
  }
  function act(id: string) {
    const result = transitionCampaign(stateRef.current, id);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    stateRef.current = result.state;
    focusNextAssignment.current = true;
    setState(result.state);
    setTarget(stageCopy(result.state).target);
    setNotice("");
    setGuideOpen(true);
  }
  function selectTarget(next: string) {
    setTarget(next);
    openPanel("equipment");
  }
  function exportSave() {
    const url = URL.createObjectURL(
      new Blob([encodeCampaign(stateRef.current)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "core-campaign-save.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Campaign export prepared. Keep the JSON file to restore this timeline.",
    );
  }
  async function importSave(file?: File) {
    if (!file) return;
    if (file.size > 200_000) {
      setNotice(
        "That file is too large to be a campaign save. Your current timeline is unchanged.",
      );
      return;
    }
    try {
      const decoded = decodeCampaign(await file.text());
      if (!mounted.current) return;
      if (!decoded) {
        setNotice(
          "This campaign save could not be validated. Your current timeline is unchanged.",
        );
        return;
      }
      setConfirmation({ kind: "import", state: decoded });
    } catch {
      if (mounted.current)
        setNotice(
          "The file could not be read. Your current timeline is unchanged.",
        );
    }
  }
  function confirmReplacement() {
    if (!confirmation) return;
    if (confirmation.kind === "firstlight") {
      onReturnToFirstLight();
      return;
    }
    const next =
      confirmation.kind === "import"
        ? confirmation.state
        : replayChapter(stateRef.current, confirmation.chapter);
    if (!next) {
      setNotice(
        "That chapter checkpoint is unavailable. Your timeline is unchanged.",
      );
      setConfirmation(null);
      return;
    }
    stateRef.current = next;
    focusNextAssignment.current = true;
    setState(next);
    setTarget(stageCopy(next).target);
    setConfirmation(null);
    setPanel(null);
    setGuideOpen(true);
    setNotice(
      "Timeline restored. Later decisions follow from this checkpoint.",
    );
  }
  function toggleFullscreen() {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.();
    if (!request) {
      setNotice(
        "Fullscreen is unavailable here. The campaign already fills this window.",
      );
      return;
    }
    request.catch(() =>
      setNotice(
        "Fullscreen is unavailable here. The campaign already fills this window.",
      ),
    );
  }
  function openRecord() {
    setNotebookTab("record");
    openPanel("notebook");
  }

  return (
    <main
      className={`fl-game cp-game ${reducedMotion ? "fl-reduced-motion" : ""} ${viewControlsOpen ? "cp-exploring" : ""}`}
      aria-label="CORE infrastructure campaign"
    >
      <Suspense
        fallback={
          <div className="fl-world-loading">
            <span className="fl-loading-ring" />
            <p>Opening the campus…</p>
          </div>
        }
      >
        <FacilityScene
          rackBay={state.origin.bay}
          powerConnected={true}
          coolingConnected={true}
          networkConnected={true}
          fault={false}
          live={metrics.serviceKw > 0}
          testRunning={false}
          placementMode={false}
          intro={false}
          selectedTarget={target}
          overlay={overlay}
          onSelect={selectTarget}
          onReady={setSceneReady}
          campaign={campaignVisual(state)}
          reducedMotion={reducedMotion}
          paused={hidden || !!panel || !!confirmation}
          cameraView={presentation.cameraView}
          timeMode={presentation.timeMode}
          onTimeChange={setSiteHour}
          viewControlsOpen={viewControlsOpen}
          onCloseViewControls={closeViewControls}
          onCameraViewChange={(cameraView) => {
            setTarget(null);
            setPresentation({ ...presentation, cameraView });
          }}
          onTimeModeChange={(timeMode) =>
            setPresentation({ ...presentation, timeMode })
          }
        />
      </Suspense>
      <div className="fl-vignette" aria-hidden="true" />
      <header className="cp-header">
        <button
          className="cp-brand"
          onClick={() => openPanel("chapters")}
          aria-label="CORE campaign chapter map"
        >
          CORE<span>FIELD OPERATIONS</span>
        </button>
        <dl className="cp-hud" aria-label="Campaign status">
          <Metric label="Campaign" value={day(state.day)} />
          <Metric label="Available" value={money(state.budget)} />
          <Metric
            label="IT service"
            value={`${quantity(metrics.serviceKw)} kW`}
          />
          <Metric label="Site time · visual" value={formatSiteTime(siteHour)} />
        </dl>
        <div className="cp-header-actions">
          <button
            ref={viewButton}
            className="cp-icon cp-explore-button"
            disabled={!sceneReady}
            aria-label="Explore facility camera"
            aria-expanded={viewControlsOpen}
            onClick={() => {
              setTarget(null);
              setViewControlsOpen(!viewControlsOpen);
            }}
          >
            <Camera size={18} />
            <span>Explore</span>
          </button>
          <button
            className="cp-icon"
            aria-label="Pause and campaign menu"
            onClick={() => openPanel("menu")}
          >
            <Pause size={18} />
          </button>
        </div>
      </header>
      <section className="cp-chapter-caption" aria-label="Current chapter">
        <span className="cp-eyebrow">
          CHAPTER {String(state.chapter).padStart(2, "0")} / 06 ·{" "}
          {day(state.day)}
        </span>
        <h1>{chapter.title}</h1>
        <p>{chapter.subtitle}</p>
        <span
          className={`cp-hall-status ${state.expansionPhase === "online" ? "is-online" : ""}`}
        >
          <i aria-hidden="true" />
          Hall B · {PHASE_LABELS[state.expansionPhase]}
        </span>
      </section>
      {!viewControlsOpen && (
        <div className="cp-panels">
          <section className="cp-decision" aria-labelledby="campaign-objective">
            <div className="cp-decision-intro">
              <span className="cp-eyebrow">
                {complete ? "CAMPAIGN COMPLETE" : "CURRENT ASSIGNMENT"}
              </span>
              <h2 id="campaign-objective" tabIndex={-1} ref={heading}>
                {copy.title}
              </h2>
              <p>{copy.instruction}</p>
            </div>
            <div className="cp-feedback" aria-live="polite">
              {saveIssue && (
                <p className="cp-storage-warning">
                  Automatic saving is unavailable.{" "}
                  <button onClick={exportSave}>Export progress</button> before
                  leaving.
                </p>
              )}
              {notice && (
                <p className="cp-notice">
                  {notice}
                  <button
                    aria-label="Dismiss notice"
                    onClick={() => setNotice("")}
                  >
                    <X size={15} />
                  </button>
                </p>
              )}
            </div>
            <div className="cp-decision-content" key={state.stage}>
              {complete ? (
                <>
                  <p className="cp-ending">
                    {state.unservedCriticalKwh === 0 && state.recoveryTested
                      ? "Essential work protected through the heat exercises. Recovery demonstrated."
                      : "A working campus, and a record of its limits."}
                  </p>
                  <dl className="cp-ending-metrics">
                    <Metric
                      label="Client opening"
                      value={
                        metrics.openingKept ? "Promise kept" : "Promise missed"
                      }
                    />
                    <Metric
                      label="Essential work lost · heat"
                      value={`${quantity(state.unservedCriticalKwh)} kWh`}
                    />
                    <Metric
                      label="Corridor response"
                      value={`${quantity(state.recoveryHours)} hours`}
                    />
                  </dl>
                  <p>{metrics.continuityLabel}</p>
                  <p className="cp-muted">
                    Your earlier choices determined which alternatives existed,
                    when Hall B opened, and what could stay online. The
                    operating record preserves those causes.
                  </p>
                  <button className="cp-primary" onClick={openRecord}>
                    <ClipboardList size={17} /> Read your operating record
                  </button>
                  <button
                    className="cp-secondary"
                    onClick={() => openPanel("chapters")}
                  >
                    <RotateCcw size={16} /> Explore another chapter outcome
                  </button>
                </>
              ) : (
                <>
                  <p className="cp-risk-question">{copy.question}</p>
                  {state.chapter === 5 && (
                    <div
                      className="cp-resource-readout"
                      aria-label={
                        state.heatShift < 3
                          ? "Next exercise window resources"
                          : "Final exercise resources"
                      }
                    >
                      <span>
                        Grid <strong>{quantity(metrics.gridKw)} kW</strong>
                      </span>
                      <span>
                        Water limit{" "}
                        <strong>{quantity(metrics.waterLimitLph)} L/h</strong>
                      </span>
                      <span>
                        Battery{" "}
                        <strong>{quantity(state.batteryKwh)} kWh</strong>
                      </span>
                      <small>
                        {state.heatShift < 3
                          ? "Next exercise window"
                          : "Final exercise window"}{" "}
                        · 2 hours · {state.heatShift}/3 completed
                      </small>
                    </div>
                  )}
                  <div className="cp-choices">
                    {choices.map((choice) => (
                      <div
                        className={`cp-choice-wrap ${choice.disabledReason ? "is-unavailable" : ""}`}
                        key={choice.id}
                      >
                        <button
                          className="cp-choice"
                          disabled={!!choice.disabledReason}
                          onClick={() => act(choice.id)}
                          data-testid={`choice-${choice.id}`}
                          aria-describedby={
                            choice.disabledReason
                              ? `reason-${choice.id}`
                              : undefined
                          }
                        >
                          <span className="cp-choice-title">
                            {choice.label}
                            <ArrowRight size={17} aria-hidden="true" />
                          </span>
                          <span className="cp-choice-detail">
                            {choice.detail}
                          </span>
                          {(choice.cost > 0 || choice.days > 0) && (
                            <span className="cp-choice-cost">
                              {choice.cost > 0
                                ? money(choice.cost)
                                : "No added capital cost"}
                              {choice.days > 0
                                ? ` · ${elapsed(choice.days)}`
                                : ""}
                            </span>
                          )}
                        </button>
                        {choice.disabledReason && (
                          <p
                            id={`reason-${choice.id}`}
                            className="cp-disabled-reason"
                          >
                            Unavailable: {choice.disabledReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {lastRecord && (
                <details className="cp-last-action">
                  <summary>
                    <Check size={14} /> Last consequence{" "}
                    <ChevronDown size={14} />
                  </summary>
                  <strong>{lastRecord.title}</strong>
                  <p>{lastRecord.detail}</p>
                </details>
              )}
              {state.lastDispatch && state.chapter >= 5 && (
                <details className="cp-dispatch">
                  <summary>
                    Last dispatch · {quantity(state.lastDispatch.hours)} hours{" "}
                    <ChevronDown size={14} />
                  </summary>
                  <dl className="cp-detail-rows">
                    <Metric
                      label="Critical service"
                      value={`${quantity(state.lastDispatch.criticalServedKw)} / ${quantity(state.lastDispatch.criticalKw)} kW`}
                    />
                    <Metric
                      label="Total service"
                      value={`${quantity(state.lastDispatch.servedKw)} kW`}
                    />
                    <Metric
                      label="Battery used"
                      value={`${quantity(state.lastDispatch.batteryUsedKwh)} kWh`}
                    />
                    <Metric
                      label="Water draw / limit"
                      value={`${quantity(state.lastDispatch.waterLph)} / ${quantity(state.lastDispatch.waterLimitLph)} L/h`}
                    />
                  </dl>
                  <p>{state.lastDispatch.explanation}</p>
                </details>
              )}
              <details className="cp-schedule">
                <summary>
                  <Layers3 size={14} /> Hall B timeline{" "}
                  <ChevronDown size={14} />
                </summary>
                <p className="cp-schedule-date">
                  {state.actualOpenDay !== null
                    ? `Opened: ${day(state.actualOpenDay)}`
                    : state.supplier !== null && state.shellDay > 0
                      ? `Earliest modeled opening: ${day(metrics.expectedOpeningDay)}`
                      : "Opening not scheduled · define the remaining prerequisites"}
                  {state.promisedDay !== null
                    ? ` · promised ${day(state.promisedDay)}`
                    : ""}
                </p>
                <ol>
                  {schedule.map((task) => (
                    <li key={task.id} data-status={task.status}>
                      <span className="cp-schedule-dot" aria-hidden="true" />
                      <div>
                        <strong>{task.label}</strong>
                        <span>
                          {task.day > 0 &&
                          (state.supplier !== null ||
                            !["installation", "commissioning"].includes(
                              task.id,
                            ))
                            ? day(task.day)
                            : "Not scheduled"}{" "}
                          · {task.status}
                        </span>
                        <p>{task.dependency}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
              <button
                className="cp-find"
                onClick={() => selectTarget(copy.target)}
              >
                <Map size={15} /> Inspect{" "}
                {equipmentSummary(copy.target, state).title}
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
          <aside
            className={`cp-guide ${guideOpen ? "" : "is-collapsed"}`}
            aria-label={`${guide.name}, ${guide.role}`}
          >
            <button
              className="cp-guide-heading"
              onClick={() => setGuideOpen(!guideOpen)}
              aria-expanded={guideOpen}
              aria-controls="campaign-guide-dialogue"
            >
              <span
                className="cp-portrait"
                style={{ backgroundColor: guide.color }}
                aria-hidden="true"
              >
                {guide.initials}
              </span>
              <span>
                <strong>{guide.name}</strong>
                <small>{guide.role}</small>
              </span>
              <ChevronDown size={17} />
            </button>
            {guideOpen && (
              <div id="campaign-guide-dialogue" className="cp-guide-body">
                <p>{copy.dialogue}</p>
                <details key={state.stage}>
                  <summary>Why this matters</summary>
                  <p>{copy.detail}</p>
                  <button
                    onClick={() => {
                      setNotebookTab("lessons");
                      openPanel("notebook");
                    }}
                  >
                    Open the field notebook <ArrowRight size={13} />
                  </button>
                </details>
              </div>
            )}
          </aside>
        </div>
      )}
      <nav className="cp-toolbar" aria-label="Campaign tools">
        <button onClick={() => openPanel("chapters")}>
          <Map size={17} />
          <span>Chapters</span>
        </button>
        <button onClick={() => openPanel("equipment")}>
          <Layers3 size={17} />
          <span>Equipment</span>
        </button>
        <button onClick={() => openPanel("planner")}>
          <FlaskConical size={17} />
          <span>What if?</span>
        </button>
        <button
          onClick={() => {
            setNotebookTab("lessons");
            openPanel("notebook");
          }}
        >
          <BookOpen size={17} />
          <span>Notebook</span>
        </button>
      </nav>
      <input
        ref={importInput}
        className="cp-file-input"
        type="file"
        accept="application/json,.json"
        aria-label="Import campaign save"
        tabIndex={-1}
        onChange={(event) => {
          void importSave(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {confirmation ? (
        <Dialog
          title={
            confirmation.kind === "import"
              ? "Replace this timeline?"
              : confirmation.kind === "firstlight"
                ? "Replay First Light?"
                : `Replay Chapter ${String(confirmation.chapter).padStart(2, "0")}?`
          }
          onClose={() => setConfirmation(null)}
        >
          <p>
            {confirmation.kind === "import"
              ? `The validated save resumes ${CHAPTERS[confirmation.state.chapter - 1].title} on ${day(confirmation.state.day)}. It will replace your currently saved campaign.`
              : confirmation.kind === "firstlight"
                ? "This starts a fresh First Light mission and clears the saved campaign. Your current campus and later decisions will be replaced."
                : "This restores the start of this chapter using the same earlier choices. Decisions from this chapter onward will be removed from the active timeline."}
          </p>
          <p className="cp-muted">
            Export the current campaign first if you want to keep both outcomes.
          </p>
          <div className="cp-confirm-actions">
            <button className="cp-secondary" onClick={exportSave}>
              <Download size={16} /> Export current timeline
            </button>
            <button className="cp-primary" onClick={confirmReplacement}>
              {confirmation.kind === "import"
                ? "Replace with imported save"
                : "Confirm replay"}
              <ArrowRight size={16} />
            </button>
            <button
              className="cp-text-button"
              onClick={() => setConfirmation(null)}
            >
              Keep this timeline
            </button>
          </div>
        </Dialog>
      ) : panel === "menu" ? (
        <Dialog title="Campaign paused" onClose={() => setPanel(null)}>
          <p className="cp-muted">
            The scene is paused. Campaign time advances only when you take a
            decision.
          </p>
          {saveIssue && (
            <p className="cp-inline-warning">
              Browser storage is unavailable. Export a save to keep your
              progress.
            </p>
          )}
          {notice && (
            <p className="cp-inline-notice" role="status">
              {notice}
            </p>
          )}
          <div className="cp-menu-actions">
            <button className="cp-primary" onClick={() => setPanel(null)}>
              <Play size={17} /> Resume campaign
            </button>
            <button className="cp-secondary" onClick={exportSave}>
              <Download size={17} /> Export campaign
            </button>
            <button
              className="cp-secondary"
              onClick={() => importInput.current?.click()}
            >
              <Upload size={17} /> Import campaign
            </button>
            <button className="cp-secondary" onClick={toggleFullscreen}>
              <Expand size={17} /> Toggle fullscreen
            </button>
          </div>
          <label className="cp-checkbox">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) =>
                setPresentation({
                  ...presentation,
                  reducedMotion: event.target.checked,
                })
              }
            />{" "}
            Reduce scene motion
          </label>
          <button
            className="cp-text-button"
            onClick={() =>
              setPresentation({ ...presentation, reducedMotion: null })
            }
          >
            Use device motion preference
            {presentation.reducedMotion === null ? " · active" : ""}
          </button>
          <div className="cp-menu-divider">
            <button
              className="cp-text-button"
              onClick={() =>
                setConfirmation({ kind: "chapter", chapter: state.chapter })
              }
            >
              <RotateCcw size={15} /> Replay current chapter
            </button>
            <button
              className="cp-text-button"
              onClick={() => setConfirmation({ kind: "firstlight" })}
            >
              Replay First Light
            </button>
          </div>
        </Dialog>
      ) : panel === "chapters" ? (
        <Dialog title="The campaign" onClose={() => setPanel(null)}>
          <p className="cp-muted">
            Six chapters. One evolving campus. A replay keeps your earlier
            choices and replaces the decisions that follow.
          </p>
          <ol className="cp-chapter-map">
            {CHAPTERS.map((item) => {
              const completed =
                item.number < state.chapter || (item.number === 6 && complete);
              const current = item.number === state.chapter && !complete;
              const locked = item.number > state.chapter;
              return (
                <li key={item.number} className={current ? "is-current" : ""}>
                  <span className="cp-chapter-number">
                    {completed ? (
                      <Check size={18} />
                    ) : (
                      String(item.number).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                    <span className="cp-chapter-state">
                      {completed
                        ? "Completed"
                        : current
                          ? "Current chapter"
                          : "Locked · complete the preceding chapter"}
                    </span>
                  </div>
                  {!locked && (
                    <button
                      className="cp-icon"
                      aria-label={`Replay ${item.title}`}
                      onClick={() =>
                        setConfirmation(
                          item.number === 1
                            ? { kind: "firstlight" }
                            : {
                                kind: "chapter",
                                chapter: item.number as CampaignChapter,
                              },
                        )
                      }
                    >
                      <RotateCcw size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </Dialog>
      ) : panel === "planner" ? (
        <Dialog
          title="What if the conditions changed?"
          wide
          onClose={() => setPanel(null)}
        >
          <Planner state={state} />
        </Dialog>
      ) : panel === "equipment" ? (
        <Dialog title="Inspect the campus" onClose={() => setPanel(null)}>
          <div className="cp-equipment-tabs" aria-label="Equipment to inspect">
            {EQUIPMENT.map((item) => (
              <button
                key={item.id}
                aria-pressed={target === item.id}
                onClick={() => setTarget(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <h3>{equipment.title}</h3>
          <dl className="cp-detail-rows">
            {equipment.rows.map(([label, value]) => (
              <Metric key={label} label={label} value={value} />
            ))}
          </dl>
          <p>{equipment.detail}</p>
          {target === "network" && <NetworkRoutes state={state} />}
          <h3>Show utility routes</h3>
          <div className="cp-equipment-tabs">
            {(["none", "power", "cooling", "network"] as const).map(
              (utility) => (
                <button
                  key={utility}
                  aria-pressed={overlay === utility}
                  onClick={() => setOverlay(utility)}
                >
                  {utility === "none"
                    ? "All routes"
                    : utility[0].toUpperCase() + utility.slice(1)}
                </button>
              ),
            )}
          </div>
          <button className="cp-primary" onClick={() => setPanel(null)}>
            Return to the facility <ArrowRight size={16} />
          </button>
        </Dialog>
      ) : panel === "notebook" ? (
        <Dialog title="Field notebook" wide onClose={() => setPanel(null)}>
          <div className="cp-notebook-tabs">
            <button
              aria-pressed={notebookTab === "lessons"}
              onClick={() => setNotebookTab("lessons")}
            >
              Lessons & sources
            </button>
            <button
              aria-pressed={notebookTab === "record"}
              onClick={() => setNotebookTab("record")}
            >
              Operating record
            </button>
          </div>
          {notebookTab === "record" ? (
            <>
              <OperatingRecord state={state} />
              <button className="cp-secondary" onClick={exportSave}>
                <Download size={16} /> Export full campaign
              </button>
            </>
          ) : (
            <>
              <p className="cp-notebook-scope">
                A fictional learning scenario. Characters, facility, costs,
                timings and incidents are authored. Sources explain real
                mechanisms; they do not validate the game's numerical outputs,
                certify a facility, or state current trade law.
              </p>
              <p className="cp-source-date">
                Sources reviewed 12 September 2026.
              </p>
              {LESSONS.map((lesson) => (
                <details
                  className="cp-lesson"
                  key={lesson.id}
                  open={lesson.chapter === state.chapter}
                >
                  <summary>
                    <span>
                      CHAPTER {String(lesson.chapter).padStart(2, "0")}
                    </span>
                    <strong>{lesson.title}</strong>
                    <ChevronDown size={17} />
                  </summary>
                  <p>{lesson.principle}</p>
                  <p className="cp-muted">
                    <strong>In this game:</strong> {lesson.simplification}
                  </p>
                  <ul>
                    {lesson.sources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                          <span aria-hidden="true"> ↗</span>
                        </a>
                        <small>{source.date} · opens a new tab</small>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </>
          )}
        </Dialog>
      ) : null}
    </main>
  );
}

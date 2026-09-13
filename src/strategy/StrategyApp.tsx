import { useEffect, useRef, useState } from "react";
import Arcade from "../App";
import { Campus } from "./Campus";
import { ASSETS, SCENARIOS, SITES, UPGRADES } from "./content.ts";
import {
  advanceQuarter,
  assetCost,
  build,
  createGame,
  currentEvent,
  invest,
  metrics,
  previewQuarter,
  validateSave,
  type AssetType,
  type ScenarioId,
  type SiteId,
} from "./model.ts";
import "./strategy.css";

type Game = ReturnType<typeof createGame>;
type Tab = "campus" | "planner" | "journal" | "fieldguide";
type IconName =
  | "arrow"
  | "grid"
  | "globe"
  | "book"
  | "chart"
  | "chip"
  | "bolt"
  | "drop"
  | "network"
  | "shield"
  | "close"
  | "help"
  | "check"
  | "download";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    globe:
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
    book: "M12 5v16M3 3l9 2 9-2v16l-9 2-9-2z",
    chart: "M3 3v18h18M6 15l4-5 5 3 6-8",
    chip: "M6 6h12v12H6zM9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4",
    bolt: "M13 2 4 14h7l-1 8 10-13h-7z",
    drop: "M12 2C9 7 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8-7-13z",
    network: "M8 3h8v6H8zM3 16h6v5H3zM15 16h6v5h-6zM12 9v4H6v3m6-3h6v3",
    shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 12l3 3 5-6",
    close: "M6 6l12 12M6 18 18 6",
    help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1",
    check: "M5 12l4 4L19 6",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const ASSET_ICONS: Record<AssetType, IconName> = {
  compute: "chip",
  cooling: "drop",
  power: "bolt",
  network: "network",
  battery: "shield",
  recycling: "drop",
};
const SAVE_KEY = "core.strategy.v1";
const money = (value: number) =>
  `${value < 0 ? "−" : ""}$${Math.abs(value).toFixed(0)}m`;
const percent = (value: number) => `${Math.round(value)}%`;
const number = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

function readSession(): {
  game: Game | null;
  checkpoint: Game | null;
  comparison: Game | null;
  notice: string;
} {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw)
      return { game: null, checkpoint: null, comparison: null, notice: "" };
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || !("game" in data))
      throw new Error("Invalid save");
    const game = validateSave(data.game);
    if (!game) throw new Error("Invalid save");
    return {
      game,
      checkpoint: "checkpoint" in data ? validateSave(data.checkpoint) : null,
      comparison: "comparison" in data ? validateSave(data.comparison) : null,
      notice: "",
    };
  } catch {
    return {
      game: null,
      checkpoint: null,
      comparison: null,
      notice:
        "Saved progress could not be read. You can still play a new campaign.",
    };
  }
}

const SOURCES = [
  {
    id: "iea",
    organization: "International Energy Agency",
    title: "Energy and AI · 2025",
    href: "https://www.iea.org/reports/energy-and-ai/executive-summary",
    text: "Explores data center electricity demand and the local constraints created by concentrated infrastructure.",
  },
  {
    id: "berkeley",
    organization: "Lawrence Berkeley National Laboratory",
    title: "US Data Center Energy Usage Report · 2024",
    href: "https://bies.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report",
    text: "Examines energy use, cooling systems, and water consumption. Efficiency has several dimensions.",
  },
  {
    id: "itu",
    organization: "International Telecommunication Union",
    title: "Submarine cable resilience",
    href: "https://www.itu.int/digital-resilience/submarine-cables/",
    text: "Explains why resilient connectivity requires coordination and geographically diverse infrastructure.",
  },
  {
    id: "unctad",
    organization: "UN Trade and Development",
    title: "Transport disruption and resilience · 2025",
    href: "https://sdgpulse.unctad.org/sustainable-transport/",
    text: "Documents how maritime disruptions reshape routes and expose supply chain dependencies.",
  },
  {
    id: "bis",
    organization: "US Bureau of Industry and Security",
    title: "Semiconductor export controls · historical example",
    href: "https://www.bis.gov/press-release/commerce-strengthens-export-controls-restrict-chinas-capability-produce-advanced-semiconductors-military",
    text: "A historical example of technology access becoming a policy instrument. Scenario rules do not describe current export law.",
  },
  {
    id: "uptime",
    organization: "Uptime Institute",
    title: "Understanding Tier classifications",
    href: "https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/",
    text: "Tier levels describe infrastructure topology. The current standard does not assign uptime percentages to Tiers.",
  },
];

function Help({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="core-dialog"
      aria-labelledby="help-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close play guide"
        onClick={close}
      >
        <Icon name="close" />
      </button>
      <span className="eyebrow">OPERATOR'S MANUAL / 01</span>
      <h2 id="help-title">
        Every connection
        <br />
        is a dependency.
      </h2>
      <p>
        You run a data center through 12 simulated quarters. Your job is to
        serve growing demand without exhausting your cash or losing your
        customers' trust.
      </p>
      <ol className="help-steps">
        <li>
          <strong>Pick your exposure.</strong> Choose a regional archetype and a
          scenario. All locations, costs, and shocks are fictional teaching
          assumptions.
        </li>
        <li>
          <strong>Build before you need it.</strong> Select a module, then an
          empty campus lot. Compute earns revenue only when power, cooling, and
          connectivity support it.
        </li>
        <li>
          <strong>Read the quarter.</strong> Forecasts include the visible
          shock. Choose a response when a briefing requires one, then advance
          time. Nothing happens while you read.
        </li>
        <li>
          <strong>Test a different decision.</strong> Use the Scenario lab to
          stress-test your campus, save a checkpoint, and replay a branch under
          the same event schedule.
        </li>
        <li>
          <strong>Learn from the result.</strong> The journal records actual
          service, cash flow, and lessons. Your debrief explains whether your
          infrastructure held up.
        </li>
      </ol>
      <p className="fine-print">
        Keyboard: Tab to the map, arrow keys between lots, Enter to build. The
        original real-time game is available in Floor lab.
      </p>
      <button className="primary-button" onClick={close}>
        Let's build <Icon name="arrow" />
      </button>
    </dialog>
  );
}

function Gauge({
  label,
  used,
  capacity,
  suffix = "units",
}: {
  label: string;
  used: number;
  capacity: number;
  suffix?: string;
}) {
  const value = capacity > 0 ? used / capacity : used > 0 ? 2 : 0;
  return (
    <div className="capacity-gauge">
      <div>
        <span>{label}</span>
        <strong>
          {number(used)}{" "}
          <em>
            / {number(capacity)} {suffix}
          </em>
        </strong>
      </div>
      <div className="gauge-track">
        <span
          className={value > 1 ? "danger" : value > 0.85 ? "tight" : ""}
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Trend({ values }: { values: number[] }) {
  if (!values.length)
    return (
      <div className="trend-empty">
        Your quarterly results will appear here.
      </div>
    );
  const points = values
    .map((v, i) => `${16 + i * (408 / 11)},${88 - v * 0.65}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 440 110"
      className="service-trend"
      role="img"
      aria-label={`Service delivered by quarter: ${values.map(percent).join(", ")}`}
    >
      <path
        d="M16 23h408M16 56h408M16 88h408"
        stroke="#dfe3dd"
        strokeDasharray="3 5"
      />
      <polyline
        points={points}
        stroke="#397968"
        strokeWidth="2.5"
        fill="none"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={16 + i * (408 / 11)}
          cy={88 - v * 0.65}
          r="3"
          fill="#397968"
        />
      ))}
      <text x="16" y="107">
        Q1
      </text>
      <text x="409" y="107">
        Q12
      </text>
    </svg>
  );
}

export default function StrategyApp() {
  const [initial] = useState(readSession);
  const [game, setGame] = useState(
    () => initial.game ?? createGame("atlantic", "balanced", 42),
  );
  const [started, setStarted] = useState(!!initial.game);
  const [hasSession, setHasSession] = useState(!!initial.game);
  const [siteId, setSiteId] = useState<SiteId>(
    initial.game?.siteId ?? "atlantic",
  );
  const [scenarioId, setScenarioId] = useState<ScenarioId>(
    initial.game?.scenarioId ?? "balanced",
  );
  const [seed, setSeed] = useState(initial.game?.seed ?? 42);
  const [tab, setTab] = useState<Tab>("campus");
  const [selected, setSelected] = useState<AssetType | null>("compute");
  const [choice, setChoice] = useState<string>("");
  const [help, setHelp] = useState(false);
  const [arcade, setArcade] = useState(false);
  const [notice, setNotice] = useState(initial.notice);
  const [saveStatus, setSaveStatus] = useState(
    initial.game ? "Progress restored" : "Saved on this device",
  );
  const [checkpoint, setCheckpoint] = useState<Game | null>(initial.checkpoint);
  const [comparison, setComparison] = useState<Game | null>(initial.comparison);
  const [sourceTarget, setSourceTarget] = useState("");
  const shown = started ? game : createGame(siteId, scenarioId, seed);
  const site = SITES.find((s) => s.id === shown.siteId)!;
  const scenario = SCENARIOS.find((s) => s.id === shown.scenarioId)!;
  const event = currentEvent(shown);
  const preview = started && choice ? previewQuarter(shown, choice) : null;
  const data = metrics(preview && !preview.error ? preview.state : shown);
  const responseCost =
    preview && !preview.error
      ? (event?.options.find((option) => option.id === choice)?.cost ?? 0)
      : 0;
  const ended = started && game.status !== "playing";
  const average = shown.history.length
    ? shown.history.reduce((sum, h) => sum + h.service, 0) /
      shown.history.length
    : 0;
  const latest = shown.history.at(-1);

  useEffect(() => {
    if (tab === "fieldguide" && sourceTarget) {
      const source = document.getElementById(`source-${sourceTarget}`);
      source?.scrollIntoView({ block: "center" });
      source?.focus({ preventScroll: true });
    }
  }, [tab, sourceTarget]);

  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ game, checkpoint, comparison }),
      );
      setSaveStatus("All changes saved locally");
    } catch {
      setSaveStatus("Storage unavailable · keep this tab open");
    }
  }, [game, checkpoint, comparison, started]);

  function apply(result: { state: Game; error?: string }, message: string) {
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setGame(result.state);
    setNotice(message);
  }
  function start() {
    setHasSession(true);
    setGame(createGame(siteId, scenarioId, seed));
    setStarted(true);
    setChoice("");
    setCheckpoint(null);
    setComparison(null);
    setTab("campus");
    setNotice(
      "Campus commissioned. Select a module and an empty lot to expand, or advance your first quarter.",
    );
  }
  function place(index: number) {
    if (!started) {
      setNotice("Start your campaign to build on this campus.");
      return;
    }
    const existing = game.board[index];
    if (existing) {
      setNotice(`${ASSETS[existing].name}: ${ASSETS[existing].description}`);
      return;
    }
    if (selected)
      apply(
        build(game, selected, index),
        `${ASSETS[selected].name} built. Review your updated forecast before advancing.`,
      );
  }
  function advance() {
    const result = advanceQuarter(game, choice || undefined);
    apply(
      result,
      result.error
        ? ""
        : `Quarter ${game.quarter} settled. ${result.state.history.at(-1)?.lesson ?? ""}`,
    );
    if (!result.error) setChoice("");
  }
  function exportJournal() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            title: "CORE campaign journal",
            model: "Fictional educational simulation v1; not a forecast.",
            exportedAt: new Date().toISOString(),
            game,
            comparison,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `core-${game.siteId}-q${game.quarter}-journal.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (arcade)
    return (
      <div className="floor-mode">
        <div className="floor-return">
          <button onClick={() => setArcade(false)}>
            ← Return to strategy campaign
          </button>
          <span>FLOOR LAB · REAL-TIME OPERATIONS PRACTICE</span>
        </div>
        <Arcade />
      </div>
    );

  return (
    <div
      className={`core-app ${started ? "campaign-active" : "campaign-setup"}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to game
      </a>
      <header className="core-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("campus");
          }}
          aria-label="CORE campus"
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>CORE</strong>
          <span className="brand-descriptor">
            INFRASTRUCTURE
            <br />
            UNDER PRESSURE
          </span>
        </a>
        <nav className="header-links" aria-label="Game modes">
          <span className="mode-active">Strategy campaign</span>
          {started && (
            <button
              onClick={() => {
                setStarted(false);
                setTab("campus");
                setNotice(
                  "Your current campaign is saved. Resume it, or start a new campaign to replace it.",
                );
              }}
            >
              New campaign
            </button>
          )}
          <button onClick={() => setArcade(true)}>
            Floor lab <span>↗</span>
          </button>
        </nav>
        <button
          className="help-button"
          aria-label="How to play"
          onClick={() => setHelp(true)}
        >
          <Icon name="help" />
          <span>How to play</span>
        </button>
      </header>

      <div className="status-strip">
        <span>
          <i className="live-dot" /> A PLAYABLE LAB FOR THE DIGITAL WORLD
        </span>
        <span>
          12 QUARTERS <b> / </b> ONE CONNECTED SYSTEM
        </span>
      </div>

      <main id="main-content" className="core-main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="orange-tick" />{" "}
              {started
                ? `${site.name.toUpperCase()} / OPERATIONS DESK`
                : "THE INFRASTRUCTURE STRATEGY GAME"}
            </div>
            <h1>
              {ended
                ? "Every decision leaves a trace."
                : started
                  ? "Keep the future running."
                  : "Build for an uncertain world."}
            </h1>
            <p>
              {started
                ? `${scenario.name}. Your choices shape what this campus can withstand.`
                : "Build a data center. Navigate a changing world. Understand what keeps us connected."}
            </p>
          </div>
          <div className="edition-badge">
            <Icon name="globe" size={24} />
            <span>
              SIMULATION 01
              <br />
              <strong>
                {started
                  ? `QUARTER ${game.quarter} / 12`
                  : "THE CONNECTED CAMPUS"}
              </strong>
            </span>
          </div>
        </div>

        {started && (
          <nav className="mobile-game-nav" aria-label="Quick game navigation">
            <a href="#construction">Build</a>
            <a href="#campus-workspace">Campus</a>
            <a href="#mission">Briefing & advance</a>
          </nav>
        )}
        <div className="game-layout">
          <aside
            id="construction"
            className="build-sidebar"
            aria-label={
              started ? "Construction and resilience" : "Campaign setup"
            }
          >
            {!started ? (
              <>
                <div className="panel-title">
                  <span>01 / CHOOSE YOUR GROUND</span>
                  <Icon name="globe" size={16} />
                </div>
                <div className="site-list">
                  {SITES.map((s, i) => (
                    <button
                      key={s.id}
                      className={`site-option ${siteId === s.id ? "selected" : ""}`}
                      aria-pressed={siteId === s.id}
                      onClick={() => {
                        setSiteId(s.id);
                        setNotice("");
                      }}
                    >
                      <span className="site-number">0{i + 1}</span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.region}</small>
                      </span>
                      <span className="radio-mark">
                        {siteId === s.id && <i />}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="site-details">
                  <span className="eyebrow">REGIONAL ARCHETYPE</span>
                  <p>{site.description}</p>
                  <dl>
                    <div>
                      <dt>Climate</dt>
                      <dd>{site.climate}</dd>
                    </div>
                    <div>
                      <dt>Energy cost / unit</dt>
                      <dd>${site.powerCost.toFixed(2)}m</dd>
                    </div>
                    <div>
                      <dt>Water stress index</dt>
                      <dd>{site.waterStress}</dd>
                    </div>
                  </dl>
                  <small>
                    Fictional profiles. Compare tradeoffs, not country rankings.
                  </small>
                </div>
                <div className="panel-title second-title">
                  <span>02 / CHOOSE THE PRESSURE</span>
                  <Icon name="chart" size={16} />
                </div>
                <div className="scenario-options">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      className={`scenario-option ${scenarioId === s.id ? "selected" : ""}`}
                      aria-pressed={scenarioId === s.id}
                      onClick={() => setScenarioId(s.id)}
                    >
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.description}</small>
                      </span>
                      <span className="radio-mark">
                        {scenarioId === s.id && <i />}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="panel-title">
                  <span>BUILD YOUR CAMPUS</span>
                  <Icon name="grid" size={16} />
                </div>
                <p className="sidebar-intro">
                  Select a module. Place it on an empty lot.
                </p>
                <div className="asset-list">
                  {(Object.keys(ASSETS) as AssetType[]).map((key) => (
                    <button
                      key={key}
                      className={`asset-option ${selected === key ? "selected" : ""}`}
                      aria-pressed={selected === key}
                      disabled={ended || game.cash < assetCost(game, key)}
                      onClick={() => {
                        setSelected(key);
                        setNotice(ASSETS[key].description);
                      }}
                    >
                      <span className={`asset-icon ${key}`}>
                        <Icon name={ASSET_ICONS[key]} />
                      </span>
                      <span>
                        <strong>{ASSETS[key].name}</strong>
                        <small>{ASSETS[key].short}</small>
                      </span>
                      <b>{money(assetCost(game, key))}</b>
                    </button>
                  ))}
                </div>
                <div className="selected-description">
                  <span className="eyebrow">
                    {selected ? ASSETS[selected].name : "CONSTRUCTION NOTE"}
                  </span>
                  <p>
                    {selected
                      ? ASSETS[selected].description
                      : "Select a module to see its effect."}
                  </p>
                  <small>
                    Construction is immediate. Costs are simulated millions.
                  </small>
                </div>
                <details className="resilience-details">
                  <summary className="panel-title second-title">
                    <span>RESILIENCE INVESTMENTS</span>
                    <Icon name="shield" size={16} />
                  </summary>
                  <div className="upgrade-list">
                    {UPGRADES.map((upgrade) => (
                      <button
                        key={upgrade.id}
                        disabled={
                          ended ||
                          game.upgrades.includes(upgrade.id) ||
                          game.cash < upgrade.cost
                        }
                        onClick={() =>
                          apply(
                            invest(game, upgrade.id),
                            `${upgrade.name} secured. ${upgrade.description}`,
                          )
                        }
                      >
                        <span>
                          <strong>{upgrade.name}</strong>
                          <small>{upgrade.description}</small>
                        </span>
                        <b>
                          {game.upgrades.includes(upgrade.id) ? (
                            <Icon name="check" />
                          ) : (
                            money(upgrade.cost)
                          )}
                        </b>
                      </button>
                    ))}
                  </div>
                </details>
              </>
            )}
            <div className="sidebar-foot">
              <Icon name="book" size={16} />
              <p>
                The lesson is in the tradeoff.
                <br />
                <button onClick={() => setTab("fieldguide")}>
                  Explore the field guide ↗
                </button>
              </p>
            </div>
          </aside>

          <section
            id="campus-workspace"
            className="workspace"
            aria-label="Simulation workspace"
          >
            <nav className="workspace-tabs" aria-label="Workspace views">
              {(
                [
                  { id: "campus", name: "Campus", icon: "grid" },
                  { id: "planner", name: "Scenario lab", icon: "chart" },
                  { id: "journal", name: "Journal", icon: "book" },
                  { id: "fieldguide", name: "Field guide", icon: "globe" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  aria-current={tab === t.id ? "page" : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <Icon name={t.icon} size={15} />
                  <span>{t.name}</span>
                </button>
              ))}
            </nav>

            {tab === "campus" && (
              <>
                <div className="campus-topline">
                  <div>
                    <span className="live-dot" />
                    <strong>
                      {started ? "CAMPUS ONLINE" : "CAMPUS PREVIEW"}
                    </strong>
                  </div>
                  <span>
                    {site.name} <b>/</b> {shown.board.filter(Boolean).length}{" "}
                    modules
                  </span>
                </div>
                <div className="campus-stats">
                  <div>
                    <span>AVAILABLE CAPITAL</span>
                    <strong>{money(shown.cash)}</strong>
                    <small>
                      {started
                        ? `${money(data.profit - responseCost)} projected / quarter`
                        : "Your starting construction budget"}
                    </small>
                  </div>
                  <div>
                    <span>DEMAND SERVED</span>
                    <strong
                      className={data.service < 80 ? "metric-warning" : ""}
                    >
                      {percent(data.service)}
                      <em> / 100%</em>
                    </strong>
                    <small>
                      {number(data.served)} of {number(data.demand)} compute
                      units
                    </small>
                  </div>
                  <div>
                    <span>CUSTOMER TRUST</span>
                    <strong>
                      {Math.round(shown.trust)}
                      <em> / 100</em>
                    </strong>
                    <small>Earned by keeping services online</small>
                  </div>
                </div>
                <Campus
                  board={shown.board}
                  selected={selected}
                  editable={started && !ended}
                  onPlace={place}
                />
                <div className="map-caption">
                  <span>
                    <Icon name={started ? "chip" : "globe"} size={15} />
                    {started
                      ? `${selected ? ASSETS[selected].name : "Module"} selected · choose an empty lot`
                      : "A small campus. A much bigger world."}
                  </span>
                  <span>
                    {started
                      ? "ARROW KEYS + ENTER"
                      : "STARTER FACILITY INCLUDED"}
                  </span>
                </div>
                <div className="capacity-section">
                  <div className="section-heading">
                    <h2>Know your limits.</h2>
                    <span>LIVE SYSTEM CAPACITY</span>
                  </div>
                  <Gauge
                    label="Power draw"
                    used={data.power}
                    capacity={data.powerCapacity}
                  />
                  <Gauge
                    label="Cooling demand"
                    used={data.cooling}
                    capacity={data.coolingCapacity}
                  />
                  <div className="small-metrics">
                    <div>
                      <span>Modeled PUE</span>
                      <strong>
                        {data.pue === null ? "—" : data.pue.toFixed(2)}
                        <em> total / IT power</em>
                      </strong>
                    </div>
                    <div>
                      <span>Water use index</span>
                      <strong>
                        {number(data.water)}
                        <em> relative units</em>
                      </strong>
                    </div>
                    <div>
                      <span>Resilience index</span>
                      <strong>
                        {Math.round(data.resilience)}
                        <em> / 100</em>
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "planner" && (
              <div className="workspace-page">
                <span className="eyebrow">THE SCENARIO LAB</span>
                <h2>What if the world changes?</h2>
                <p>
                  Apply a hypothetical shock to this exact campus. Each row
                  holds your infrastructure and demand constant, changing one
                  pressure. These are stress tests, not probability forecasts.
                </p>
                <div className="table-scroll">
                  <table className="core-table">
                    <caption>
                      Current campus under independent hypothetical shocks
                    </caption>
                    <thead>
                      <tr>
                        <th>Test condition</th>
                        <th>Service</th>
                        <th>Cash flow / Q</th>
                        <th>Water index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          "none",
                          "energy",
                          "water",
                          "network",
                          "supply",
                        ] as const
                      ).map((shock) => {
                        const result = metrics(
                          { ...shown, decisions: [] },
                          shock,
                        );
                        return (
                          <tr key={shock}>
                            <th>
                              {
                                {
                                  none: "No disruption",
                                  energy: "Energy squeeze",
                                  water: "Water restrictions",
                                  network: "Cable outage",
                                  supply: "Technology restrictions",
                                }[shock]
                              }
                            </th>
                            <td
                              className={
                                result.service < 80
                                  ? "text-danger"
                                  : "text-green"
                              }
                            >
                              {percent(result.service)}
                            </td>
                            <td>{money(result.profit)}</td>
                            <td>{number(result.water)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="fine-print">
                  One shock at a time. Response costs and mitigations are
                  applied when you commit an event decision. This table does not
                  simulate cascading events.
                </p>
                <div className="branch-box">
                  <Icon name="network" size={26} />
                  <div>
                    <h3>Same starting point. Different decisions.</h3>
                    <p>
                      Save a checkpoint, play your first plan, then branch from
                      that checkpoint to try another approach. The original
                      outcome stays available for comparison.
                    </p>
                  </div>
                  <div className="branch-actions">
                    <button
                      className="secondary-button"
                      disabled={!started || ended}
                      onClick={() => {
                        setCheckpoint(structuredClone(game));
                        setComparison(null);
                        setNotice(
                          `Checkpoint saved at quarter ${game.quarter}. Play your first plan, then return here to branch.`,
                        );
                      }}
                    >
                      Save checkpoint
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!started || !checkpoint}
                      onClick={() => {
                        if (checkpoint) {
                          setComparison(structuredClone(game));
                          setGame(structuredClone(checkpoint));
                          setChoice("");
                          setNotice(
                            `Restored quarter ${checkpoint.quarter}. Your previous branch is preserved below.`,
                          );
                        }
                      }}
                    >
                      Branch from checkpoint <Icon name="arrow" size={14} />
                    </button>
                  </div>
                  {checkpoint && (
                    <span className="checkpoint-note">
                      CHECKPOINT · Q{checkpoint.quarter} ·{" "}
                      {money(checkpoint.cash)} · SEED {checkpoint.seed}
                    </span>
                  )}
                </div>
                {comparison && (
                  <>
                    <h3 className="comparison-title">Your two branches</h3>
                    <p className="fine-print">
                      Compare at the same settled quarter for a fair reading.
                      Different horizons are labeled.
                    </p>
                    <div className="table-scroll">
                      <table className="core-table">
                        <thead>
                          <tr>
                            <th>Outcome</th>
                            <th>Previous branch</th>
                            <th>Current branch</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th>Quarters settled</th>
                            <td>{comparison.history.length}</td>
                            <td>{game.history.length}</td>
                          </tr>
                          <tr>
                            <th>Capital</th>
                            <td>{money(comparison.cash)}</td>
                            <td>{money(game.cash)}</td>
                          </tr>
                          <tr>
                            <th>Trust</th>
                            <td>{Math.round(comparison.trust)}</td>
                            <td>{Math.round(game.trust)}</td>
                          </tr>
                          <tr>
                            <th>Latest service</th>
                            <td>
                              {comparison.history.length
                                ? percent(comparison.history.at(-1)!.service)
                                : "Not settled"}
                            </td>
                            <td>
                              {game.history.length
                                ? percent(game.history.at(-1)!.service)
                                : "Not settled"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "journal" && (
              <div className="workspace-page">
                <span className="eyebrow">THE DECISION JOURNAL</span>
                <h2>A record of cause and effect.</h2>
                <p>
                  Each settled quarter records what your infrastructure
                  delivered, what it cost, and the lesson behind the outcome.
                </p>
                <div className="journal-summary">
                  <div>
                    <span>Average service</span>
                    <strong>
                      {shown.history.length ? percent(average) : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Quarters settled</span>
                    <strong>
                      {shown.history.length}
                      <em> / 12</em>
                    </strong>
                  </div>
                  <div>
                    <span>Decisions made</span>
                    <strong>{shown.decisions.length}</strong>
                  </div>
                </div>
                <Trend values={shown.history.map((h) => h.service)} />
                {!shown.history.length ? (
                  <div className="empty-journal">
                    <Icon name="book" size={32} />
                    <h3>Your first chapter is unwritten.</h3>
                    <p>
                      Start the campaign and advance a quarter to record your
                      first result.
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => setTab("campus")}
                    >
                      Return to campus <Icon name="arrow" size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="journal-entries">
                      {[...shown.history].reverse().map((h) => (
                        <article key={h.quarter}>
                          <span className="quarter-marker">Q{h.quarter}</span>
                          <div>
                            <div className="journal-entry-title">
                              <h3>
                                {h.eventId
                                  ? h.eventId.replace(/-/g, " ")
                                  : "Operations report"}
                              </h3>
                              <span>
                                {percent(h.service)} served · {money(h.profit)}
                              </span>
                            </div>
                            <p>{h.lesson}</p>
                            <small>
                              Capital {money(h.cash)} · Trust{" "}
                              {Math.round(h.trust)}
                              {h.choiceId
                                ? ` · Response: ${h.choiceId.replace(/-/g, " ")}`
                                : ""}
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                    <button
                      className="secondary-button"
                      onClick={exportJournal}
                    >
                      <Icon name="download" size={16} /> Export campaign journal
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === "fieldguide" && (
              <div className="workspace-page">
                <span className="eyebrow">THE FIELD GUIDE</span>
                <h2>
                  Real connections.
                  <br />
                  Explicit assumptions.
                </h2>
                <p>
                  Digital infrastructure depends on energy, water, trade, and
                  policy. This game makes those dependencies playable through a
                  deliberately simplified model.
                </p>
                <div className="model-note">
                  <h3>How to read this simulation</h3>
                  <p>
                    All three regional archetypes are fictional. Dollar amounts,
                    capacity units, water and resilience indices, demand curves,
                    shock sizes, and event schedules are authored game rules.
                    They are not measured forecasts, engineering specifications,
                    country risk ratings, or legal advice.
                  </p>
                  <p>
                    Power and cooling are campus-wide capacity pools; placement
                    is spatial planning, not an airflow or electrical topology
                    simulation. Construction is immediate, and each incident
                    lasts one quarter. PUE is a simplified total-to-IT power
                    ratio; the resilience index is a game score, not a Tier
                    certification.
                  </p>
                  <p>
                    Win by completing 12 quarters with nonnegative cash, trust
                    of at least 45, average service of at least 85%, and
                    final-quarter service of at least 90%. The journal explains
                    your actual results.
                  </p>
                </div>
                <h3 className="sources-title">
                  Read the mechanisms behind the model
                </h3>
                <div className="source-list">
                  {SOURCES.map((source) => (
                    <a
                      id={`source-${source.id}`}
                      href={source.href}
                      key={source.id}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="eyebrow">{source.organization}</span>
                      <strong>
                        {source.title} <span>↗</span>
                      </strong>
                      <p>{source.text}</p>
                    </a>
                  ))}
                </div>
                <p className="fine-print">
                  References checked 12 September 2026. Sources explain
                  mechanisms; they do not validate the game's numerical
                  assumptions.
                </p>
              </div>
            )}
          </section>

          <aside
            id="mission"
            className="briefing-sidebar"
            aria-label="Quarterly briefing"
          >
            <div className="panel-title">
              <span>{started ? "THE SITUATION ROOM" : "YOUR MISSION"}</span>
              <span className="issue-number">
                {started ? `Q${game.quarter}` : "001"}
              </span>
            </div>
            {!started ? (
              <>
                <div className="mission-content">
                  <div className="mission-emblem">
                    <Icon name="globe" size={34} />
                  </div>
                  <span className="eyebrow">12 QUARTERS. REAL TRADEOFFS.</span>
                  <h2>
                    A campus doesn't
                    <br />
                    exist in isolation.
                  </h2>
                  <p>
                    Your servers may be local. The energy, chips, water, and
                    networks they depend on are part of a global system.
                  </p>
                  <p>Build a viable operation, then navigate the unexpected.</p>
                  <div className="mission-goals">
                    <span>
                      <Icon name="check" size={16} /> Serve 85% average demand;
                      90% in Q12
                    </span>
                    <span>
                      <Icon name="check" size={16} /> Keep capital at or above
                      zero
                    </span>
                    <span>
                      <Icon name="check" size={16} /> Finish with trust of at
                      least 45
                    </span>
                  </div>
                  <label className="seed-label">
                    Scenario seed{" "}
                    <input
                      type="number"
                      min="1"
                      max="999999"
                      value={seed}
                      onChange={(e) =>
                        setSeed(
                          Math.max(
                            1,
                            Math.min(
                              999999,
                              Math.trunc(Number(e.target.value) || 1),
                            ),
                          ),
                        )
                      }
                    />
                    <small>Same seed, same sequence of events.</small>
                  </label>
                  <button className="primary-button" onClick={start}>
                    {hasSession ? "Start new campaign" : "Start campaign"}{" "}
                    <Icon name="arrow" />
                  </button>
                  {hasSession && (
                    <>
                      <button
                        className="secondary-button resume-campaign"
                        onClick={() => {
                          setStarted(true);
                          setNotice("Current campaign resumed.");
                        }}
                      >
                        Resume current campaign
                      </button>
                      <p className="replacement-note">
                        Starting a new campaign replaces your saved run and
                        checkpoint. Export its journal first if you want to keep
                        the record.
                      </p>
                    </>
                  )}
                  <span className="playtime">PLAY AT YOUR PACE · NO TIMER</span>
                </div>
                <div className="briefing-note">
                  <span className="eyebrow">ON THE HORIZON</span>
                  <h3>
                    What happens when
                    <br />a supply chain fractures?
                  </h3>
                  <p>
                    Export restrictions, energy shocks, and network
                    interruptions will test the assumptions you build on.
                  </p>
                  <span className="hypothetical-tag">
                    HYPOTHETICAL SCENARIOS
                  </span>
                </div>
              </>
            ) : ended ? (
              <div className="mission-content debrief">
                <span
                  className={`outcome-badge ${game.status === "won" ? "success" : ""}`}
                >
                  {game.status === "won"
                    ? "MISSION COMPLETE"
                    : "MISSION NOT MET"}
                </span>
                <h2>
                  {game.status === "won"
                    ? "Built to hold."
                    : "A different plan awaits."}
                </h2>
                <p>
                  {game.status === "won"
                    ? "Your campus completed the campaign while meeting service, solvency, and trust requirements."
                    : "The campus fell short of one or more mission requirements. The journal shows where the plan came under pressure."}
                </p>
                <div className="debrief-results">
                  <span>
                    Average demand served{" "}
                    <strong>{percent(average)} / 85% needed</strong>
                  </span>
                  <span>
                    Capital remaining <strong>{money(game.cash)}</strong>
                  </span>
                  <span>
                    Customer trust{" "}
                    <strong>{Math.round(game.trust)} / 45 needed</strong>
                  </span>
                  <span>
                    Final-quarter service{" "}
                    <strong>
                      {latest ? percent(latest.service) : "—"} / 90% needed
                    </strong>
                  </span>
                  <span>
                    Quarters completed{" "}
                    <strong>{game.history.length} / 12</strong>
                  </span>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setTab("journal")}
                >
                  Read your debrief <Icon name="arrow" />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setStarted(false);
                    setTab("campus");
                    setNotice(
                      "Choose a region and scenario for your next campaign.",
                    );
                  }}
                >
                  Plan another campaign
                </button>
                <button className="text-button" onClick={exportJournal}>
                  Export your journal ↗
                </button>
              </div>
            ) : (
              <>
                <div className={`quarter-briefing ${event ? "has-event" : ""}`}>
                  <span className="eyebrow">
                    {event
                      ? "HYPOTHETICAL EVENT / DECISION REQUIRED"
                      : "OPERATIONAL WINDOW / BUILD & PREPARE"}
                  </span>
                  <h2>
                    {event
                      ? event.title
                      : game.quarter === 1
                        ? "The first connections."
                        : "Room to prepare."}
                  </h2>
                  <p>
                    {event
                      ? event.description
                      : "Demand grows each quarter. Expand compute alongside the power and cooling it needs, and leave capital for your next disruption."}
                  </p>
                  {event ? (
                    <>
                      <fieldset className="event-options">
                        <legend>Choose your response</legend>
                        {event.options.map((option) => (
                          <label
                            className={`event-option ${choice === option.id ? "selected" : ""}`}
                            key={option.id}
                          >
                            <input
                              type="radio"
                              name="event-response"
                              value={option.id}
                              checked={choice === option.id}
                              disabled={game.cash < option.cost}
                              onChange={() => setChoice(option.id)}
                            />
                            <span>
                              <strong>
                                {option.label}
                                <b>
                                  {option.cost
                                    ? money(option.cost)
                                    : "No upfront cost"}
                                </b>
                              </strong>
                              <small>{option.description}</small>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                      <button
                        className="text-button"
                        onClick={() => {
                          setTab("fieldguide");
                          setSourceTarget(event.sourceId);
                        }}
                      >
                        Explore the underlying mechanism ↗
                      </button>
                    </>
                  ) : (
                    <div className="quarter-tip">
                      <Icon name="shield" size={20} />
                      <p>
                        <strong>Capacity is only half the story.</strong> A
                        second supplier or a diverse network route can protect
                        the capacity you already have.
                      </p>
                    </div>
                  )}
                </div>
                <div className="quarter-finances">
                  <div className="eyebrow">THIS QUARTER'S FORECAST</div>
                  <div>
                    <span>Service revenue</span>
                    <strong>{money(data.revenue)}</strong>
                  </div>
                  <div>
                    <span>Operating costs</span>
                    <strong>−{money(data.expenses)}</strong>
                  </div>
                  <div>
                    <span>Response cost</span>
                    <strong>−{money(responseCost)}</strong>
                  </div>
                  <div className="finance-total">
                    <span>Net quarter cash flow</span>
                    <strong
                      className={
                        data.profit - responseCost < 0
                          ? "text-danger"
                          : "text-green"
                      }
                    >
                      {money(data.profit - responseCost)}
                    </strong>
                  </div>
                  <p>
                    {event
                      ? choice && !preview?.error
                        ? "Includes the selected response, its cost, and this quarter’s shock. This is the forecast that will settle."
                        : "Includes the visible shock. Select a response to preview its exact cost and mitigation."
                      : "Based on your current campus. Building changes the forecast immediately."}
                  </p>
                  <button
                    className="primary-button"
                    disabled={!!event && (!choice || !!preview?.error)}
                    onClick={advance}
                  >
                    Advance quarter {game.quarter} <Icon name="arrow" />
                  </button>
                  {event && !choice && (
                    <small className="action-hint">
                      Select a response above to advance.
                    </small>
                  )}
                  {preview?.error && (
                    <p className="action-hint" role="alert">
                      {preview.error} Choose another response.
                    </p>
                  )}
                  <div
                    className="quarter-progress"
                    aria-label={`${game.history.length} of 12 quarters settled`}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className={
                          i < game.history.length
                            ? "done"
                            : i === game.quarter - 1
                              ? "current"
                              : ""
                        }
                      />
                    ))}
                  </div>
                </div>
                {latest && (
                  <div className="last-quarter">
                    <span className="eyebrow">
                      LAST QUARTER / Q{latest.quarter}
                    </span>
                    <p>{latest.lesson}</p>
                    <button
                      className="text-button"
                      onClick={() => setTab("journal")}
                    >
                      Open decision journal ↗
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
        <div
          className={`notice-bar ${notice ? "has-notice" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>
            {notice ||
              (started
                ? "Time advances only when you do. Inspect, build, and plan at your own pace."
                : "Pick a region and a pressure scenario, then start your campaign.")}
          </span>
          <span className="save-indicator">
            <i />
            {saveStatus}
          </span>
        </div>
        <footer className="core-footer">
          <span>
            <strong>CORE</strong> A small game about the systems behind
            everything.
          </span>
          <span>
            FICTIONAL SCENARIOS · REAL-WORLD QUESTIONS <b>↗</b>
          </span>
        </footer>
      </main>
      {help && <Help close={() => setHelp(false)} />}
    </div>
  );
}

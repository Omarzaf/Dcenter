import { sfx } from "./audio";
import { IT_UNITS } from "./types";
import type { ConceptId } from "./curriculum";
import {
  ACHIEVEMENTS,
  BASE_CAPACITY,
  CELLS,
  COLS,
  ROWS,
  SHIFTS,
  UNITS,
  makeCell,
  type AchievementId,
  type Cell,
  type GameState,
  type LogLine,
  type Objective,
  type Snapshot,
  type PublicSettings,
  type UnitType,
} from "./types";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  kind: 0 | 1 | 2; // 0 spark, 1 smoke, 2 shard
}

export interface Floater {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

export interface Pod {
  key: number;
  cells: number[];
}

const PHASE_TIME = 26;
const EVENT_TIME = 15;

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  board = 0;
  ox = 0;
  oy = 0;
  cell = 40;

  state: GameState = "idle";
  grid: Cell[] = [];
  queue: UnitType[] = ["rack", "rack", "rack"];
  selected = 0;
  cursor = { x: 3, y: 3 };

  score = 0;
  throughput = 0;
  coreTemp = 16;
  ambient = 16;
  capacity = BASE_CAPACITY;
  demand = 0;
  load = 0;
  phase = 1;
  time = 0;
  phaseTimer = PHASE_TIME;
  eventTimer = 16;
  combo = 0;
  comboTimer = 0;
  pods: Pod[] = [];
  podCount = 0;
  rackCount = 0;
  linked = new Map<number, number>();

  particles: Particle[] = [];
  floaters: Floater[] = [];
  shake = 0;
  flash = 0;
  flashColor = "#69a6d7";
  t = 0;
  alarmClock = 0;

  log: LogLine[] = [];
  logId = 1;
  hint = "DEPLOY 3 SERVER RACKS SIDE-BY-SIDE TO LINK A POD";
  tutorialStep = 0;
  mod: { label: string; color: string; left: number; total: number; kind: string } | null = null;
  humidTimer = 0;
  scrambleTimer = 0;
  shift = 0;
  shiftName = "DAY SHIFT";
  scrappes = 0;
  peakTemp = 16;
  podsReached = 0;
  achievements = new Set<AchievementId>();
  newAchievement: AchievementId | null = null;
  achQueue: { id: AchievementId; t: number }[] = [];
  lastCombo = 0;
  scoredPods = 0;
  settings: {
    muted: boolean;
    shake: number;
    palette: "classic" | "deuteranopia" | "tritanopia";
    learnMode: boolean;
  } = {
    muted: false,
    shake: 1,
    palette: "classic",
    learnMode: true,
  };
  idleHue = 0;

  /* --- educational layer ------------------------------------------- */
  pue = Infinity;
  itLoad = 0;
  overhead = 0;
  private pueSum = 0;
  private pueSamples = 0;
  throttledSeconds = 0;
  redundantPower = false;
  pendingConcept: ConceptId | null = null;
  seenConcepts = new Set<ConceptId>();
  /** Concepts already surfaced this run, so a card never repeats mid-run. */
  private firedThisRun = new Set<ConceptId>();

  onSnapshot: ((s: Snapshot) => void) | null = null;
  onState: ((s: GameState) => void) | null = null;
  onConceptUnlock: ((ids: ConceptId[]) => void) | null = null;
  reducedMotion = false;
  private overlayOpen = false;
  private resumeAfterOverlay = false;
  private snapClock = 0;
  private raf = 0;
  private last = 0;
  private hold: { i: number; t: number } | null = null;
  private detach: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.reset();
    this.buildDemo();
  }

  /* ------------------------------------------------------------------ */
  /* lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  attach() {
    const kd = (e: KeyboardEvent) => this.onKey(e);
    const pd = (e: PointerEvent) => this.onPointerDown(e);
    const pm = (e: PointerEvent) => this.onPointerMove(e);
    const pu = () => this.onPointerUp();
    const loseFocus = () => {
      this.onPointerUp();
      this.resumeAfterOverlay = false;
      if (this.state === "running") this.togglePause();
    };
    const visibility = () => { if (document.hidden) loseFocus(); };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => { this.reducedMotion = motion.matches; };
    updateMotion();
    const cm = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", kd);
    this.canvas.addEventListener("pointerdown", pd);
    this.canvas.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);
    window.addEventListener("blur", loseFocus);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", updateMotion);
    this.canvas.addEventListener("contextmenu", cm);
    this.detach = () => {
      window.removeEventListener("keydown", kd);
      this.canvas.removeEventListener("pointerdown", pd);
      this.canvas.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
      window.removeEventListener("blur", loseFocus);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", updateMotion);
      this.canvas.removeEventListener("contextmenu", cm);
    };
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.detach?.();
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.board = Math.floor(Math.min(w, h) - Math.min(24, Math.min(w, h) * 0.05));
    this.cell = this.board / COLS;
    this.ox = (w - this.board) / 2;
    this.oy = (h - this.board) / 2;
  }

  private setState(s: GameState) {
    this.state = s;
    this.onState?.(s);
    this.emit();
  }

  /* ------------------------------------------------------------------ */
  /* game control                                                        */
  /* ------------------------------------------------------------------ */

  reset() {
    this.hold = null;
    this.grid = Array.from({ length: CELLS }, makeCell);
    this.queue = ["rack", "rack", "rack"];
    this.selected = 0;
    this.cursor = { x: 3, y: 3 };
    this.score = 0;
    this.throughput = 0;
    this.coreTemp = 16;
    this.ambient = 16;
    this.capacity = BASE_CAPACITY;
    this.demand = 0;
    this.load = 0;
    this.phase = 1;
    this.time = 0;
    this.phaseTimer = PHASE_TIME;
    this.eventTimer = 18;
    this.combo = 0;
    this.comboTimer = 0;
    this.pods = [];
    this.linked.clear();
    this.particles.length = 0;
    this.floaters.length = 0;
    this.shake = 0;
    this.flash = 0;
    this.mod = null;
    this.humidTimer = 0;
    this.scrambleTimer = 0;
    this.shift = 0;
    this.shiftName = SHIFTS[0].name;
    this.scrappes = 0;
    this.peakTemp = 16;
    this.podsReached = 0;
    this.achievements.clear();
    this.newAchievement = null;
    this.achQueue = [];
    this.lastCombo = 0;
    this.scoredPods = 0;
    this.tutorialStep = 0;
    this.pue = Infinity;
    this.itLoad = 0;
    this.overhead = 0;
    this.pueSum = 0;
    this.pueSamples = 0;
    this.throttledSeconds = 0;
    this.redundantPower = false;
    this.pendingConcept = null;
    this.firedThisRun.clear();
    this.hint = "DEPLOY 3 SERVER RACKS SIDE-BY-SIDE TO LINK A POD";
    this.log = [];
    this.rebuildPods();
  }

  start() {
    this.reset();
    this.pushLog(`FACILITY ONLINE / SHIFT ${this.shiftName} / BUS ${BASE_CAPACITY}`, "good");
    sfx.unlock();
    sfx.start();
    this.setState("running");
  }

  setSettings(patch: Partial<PublicSettings>) {
    this.settings = { ...this.settings, ...patch };
    sfx.setMuted(this.settings.muted);
    this.emit();
  }

  /** Reading a panel suspends the simulation without losing the player's pause state. */
  setOverlayOpen(open: boolean) {
    if (open === this.overlayOpen) return;
    this.overlayOpen = open;
    this.hold = null;
    if (open) {
      this.resumeAfterOverlay = this.state === "running";
      if (this.resumeAfterOverlay) this.togglePause();
    } else {
      if (this.resumeAfterOverlay && this.state === "paused" && !this.pendingConcept) this.togglePause();
      this.resumeAfterOverlay = false;
    }
  }

  togglePause() {
    // A concept card owns the paused state until it is dismissed.
    if (this.pendingConcept) return;
    this.hold = null;
    if (this.state === "running") {
      this.setState("paused");
      sfx.deny();
    } else if (this.state === "paused") {
      this.last = performance.now();
      this.setState("running");
      sfx.place();
    }
  }

  gameOver(reason: string) {
    if (this.state === "over") return;
    this.pushLog(reason, "bad");
    this.shake = 26;
    this.flash = 1;
    this.flashColor = "#d9544f";
    sfx.over();
    this.buzz([50, 70, 160]);
    for (let i = 0; i < 90; i++) {
      const c = this.grid[Math.floor(Math.random() * CELLS)];
      if (c.unit) {
        const x = this.cx(this.grid.indexOf(c));
        const y = this.cy(this.grid.indexOf(c));
        this.burst(x, y, "#cf784d", 5, 220);
      }
    }
    this.setState("over");
  }

  /* ------------------------------------------------------------------ */
  /* geometry                                                            */
  /* ------------------------------------------------------------------ */

  cx(i: number) {
    return this.ox + ((i % COLS) + 0.5) * this.cell;
  }
  cy(i: number) {
    return this.oy + (Math.floor(i / COLS) + 0.5) * this.cell;
  }
  idx(x: number, y: number) {
    return y * COLS + x;
  }
  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }
  neighbors(i: number): number[] {
    const x = i % COLS;
    const y = (i / COLS) | 0;
    const out: number[] = [];
    if (x > 0) out.push(i - 1);
    if (x < COLS - 1) out.push(i + 1);
    if (y > 0) out.push(i - COLS);
    if (y < ROWS - 1) out.push(i + COLS);
    return out;
  }

  private cellFromEvent(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const x = Math.floor((px - this.ox) / this.cell);
    const y = Math.floor((py - this.oy) / this.cell);
    if (!this.inBounds(x, y)) return -1;
    return this.idx(x, y);
  }

  /* ------------------------------------------------------------------ */
  /* input                                                               */
  /* ------------------------------------------------------------------ */

  private onKey(e: KeyboardEvent) {
    // Browser controls and dialogs own their native keyboard behavior.
    if (e.target !== this.canvas || this.overlayOpen || this.pendingConcept || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
      e.preventDefault();
    if (e.repeat && ["p", "escape", "r", "enter", " ", "x"].includes(k)) return;

    if (k === "p" || k === "escape") {
      if (this.state === "running" || this.state === "paused") this.togglePause();
      return;
    }
    if (k === "r" && (this.state === "over" || this.state === "paused")) {
      this.start();
      return;
    }
    if (this.state !== "running") {
      if ((k === " " || k === "enter") && this.state === "idle") this.start();
      return;
    }

    let dx = 0;
    let dy = 0;
    if (k === "arrowleft" || k === "a") dx = -1;
    else if (k === "arrowright" || k === "d") dx = 1;
    else if (k === "arrowup" || k === "w") dy = -1;
    else if (k === "arrowdown" || k === "s") dy = 1;
    if (dx || dy) {
      this.cursor.x = Math.max(0, Math.min(COLS - 1, this.cursor.x + dx));
      this.cursor.y = Math.max(0, Math.min(ROWS - 1, this.cursor.y + dy));
      this.touchCursor();
      return;
    }
    if (k === " " || k === "enter") {
      this.place(this.cursor.x, this.cursor.y);
      return;
    }
    if (k === "1" || k === "2" || k === "3") {
      this.select(Number(k) - 1);
      return;
    }
    if (k === "q" || k === "e") {
      this.select((this.selected + 1) % 3);
      return;
    }
    if (k === "x") {
      this.scrap(this.idx(this.cursor.x, this.cursor.y));
      return;
    }
    if (k === "f") {
      const i = this.idx(this.cursor.x, this.cursor.y);
      if (this.grid[i].offline > 0) this.reboot(i);
    }
  }

  private onPointerMove(e: PointerEvent) {
    const i = this.cellFromEvent(e);
    if (this.hold && this.hold.i !== i) this.hold = null;
    if (i < 0) return;
    this.cursor.x = i % COLS;
    this.cursor.y = (i / COLS) | 0;
  }

  private onPointerDown(e: PointerEvent) {
    if (this.overlayOpen || e.button !== 0 || !e.isPrimary) return;
    e.preventDefault();
    this.canvas.focus();
    sfx.unlock();
    const i = this.cellFromEvent(e);
    if (i < 0) return;
    this.cursor.x = i % COLS;
    this.cursor.y = (i / COLS) | 0;
    if (this.state !== "running") return;
    const cell = this.grid[i];
    if (!cell.unit) {
      this.place(this.cursor.x, this.cursor.y);
    } else if (cell.offline > 0) {
      this.reboot(i);
    } else {
      this.hold = { i, t: 0 };
    }
  }

  private onPointerUp() {
    this.hold = null;
  }

  moveCursor(dx: number, dy: number) {
    this.cursor.x = Math.max(0, Math.min(COLS - 1, this.cursor.x + dx));
    this.cursor.y = Math.max(0, Math.min(ROWS - 1, this.cursor.y + dy));
    this.touchCursor();
  }

  touchCursor() {
    const i = this.idx(this.cursor.x, this.cursor.y);
    for (let n = 0; n < 3; n++) {
      this.particles.push({
        x: this.cx(i),
        y: this.cy(i),
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.3,
        max: 0.3,
        size: 1.5,
        color: "#7d93ad",
        grav: 0,
        kind: 0,
      });
    }
  }

  select(n: number) {
    if (n < 0 || n > 2) return;
    this.selected = n;
    sfx.place();
  }

  /* ------------------------------------------------------------------ */
  /* actions                                                             */
  /* ------------------------------------------------------------------ */

  private rollUnit(): UnitType {
    const hot = this.coreTemp > 62;
    const w: [UnitType, number][] = [
      ["rack", 0.46],
      ["cool", 0.26 + (hot ? 0.2 : 0)],
      ["power", 0.17],
      ["fiber", 0.11],
    ];
    const total = w.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * total;
    for (const [type, weight] of w) {
      r -= weight;
      if (r <= 0) return type;
    }
    return "rack";
  }

  private refill(slot: number) {
    this.queue[slot] = this.rollUnit();
  }

  place(x: number, y: number) {
    if (this.state !== "running") return;
    const i = this.idx(x, y);
    const cell = this.grid[i];
    if (cell.unit) {
      this.deny();
      return;
    }
    const type = this.queue[this.selected];
    cell.unit = type;
    cell.age = 0;
    cell.pop = 1;
    cell.heat = Math.max(cell.heat, this.coreTemp);
    const px = this.cx(i);
    const py = this.cy(i);
    this.burst(px, py, UNITS[type].color, 16, 130);
    this.ring(px, py, UNITS[type].color);
    this.float(px, py - this.cell * 0.4, `+${Math.round(8 * this.comboMult)}`, "#dbe7f5", 13);
    this.score += 8 * this.comboMult;
    this.shake = Math.max(this.shake, 5);
    sfx.place();
    this.buzz(10);
    this.refill(this.selected);
    // keyboard players keep flowing: slide the cursor to the next free tile
    const nx = x + 1 < COLS ? x + 1 : 0;
    const ny = x + 1 < COLS ? y : Math.min(ROWS - 1, y + 1);
    if (!this.grid[this.idx(nx, ny)].unit) {
      this.cursor.x = nx;
      this.cursor.y = ny;
    }
    this.rebuildPods();
    this.checkLinks();
    if (this.podCount > 0 && this.hint.startsWith("DEPLOY")) this.hint = "";
  }

  private deny() {
    this.shake = Math.max(this.shake, 3);
    sfx.deny();
    const i = this.idx(this.cursor.x, this.cursor.y);
    this.float(this.cx(i), this.cy(i) - this.cell * 0.35, "OCCUPIED", "#d9544f", 12);
  }

  scrap(i: number) {
    if (this.state !== "running") return;
    const cell = this.grid[i];
    if (!cell.unit) return;
    const type = cell.unit;
    cell.unit = null;
    this.scrappes++;
    cell.pod = -1;
    cell.podSize = 0;
    cell.offline = 0;
    cell.heat = Math.max(0, cell.heat - 12);
    this.burst(this.cx(i), this.cy(i), UNITS[type].dim, 18, 110);
    this.float(this.cx(i), this.cy(i), "SCRAP", "#7d93ad", 12);
    this.shake = Math.max(this.shake, 6);
    sfx.scrap();
    this.rebuildPods();
  }

  reboot(i: number) {
    const cell = this.grid[i];
    if (cell.offline <= 0) return;
    cell.offline = 0;
    cell.pop = 1;
    this.score += 150;
    this.burst(this.cx(i), this.cy(i), "#d6a243", 26, 190);
    this.ring(this.cx(i), this.cy(i), "#d6a243");
    this.float(this.cx(i), this.cy(i) - this.cell * 0.4, "+150 REBOOT", "#d6a243", 14);
    this.shake = Math.max(this.shake, 8);
    sfx.reboot();
    this.buzz(16);
    this.pushLog("PDU REBOOTED / BUS RESTORED", "good");
  }

  /* ------------------------------------------------------------------ */
  /* clusters                                                            */
  /* ------------------------------------------------------------------ */

  rebuildPods() {
    const seen = new Uint8Array(CELLS);
    const pods: Pod[] = [];
    let rackCount = 0;
    for (const c of this.grid) {
      c.pod = -1;
      c.podSize = 0;
      c.boosted = false;
    }
    for (let i = 0; i < CELLS; i++) {
      if (this.grid[i].unit !== "rack" || seen[i]) continue;
      const stack = [i];
      seen[i] = 1;
      const cells: number[] = [];
      while (stack.length) {
        const cur = stack.pop() as number;
        cells.push(cur);
        rackCount++;
        for (const n of this.neighbors(cur)) {
          if (!seen[n] && this.grid[n].unit === "rack") {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
      cells.sort((a, b) => a - b);
      const key = cells[0];
      for (const c of cells) {
        this.grid[c].pod = key;
        this.grid[c].podSize = cells.length;
      }
      pods.push({ key, cells });
    }
    for (const p of pods) {
      for (const c of p.cells) {
        for (const n of this.neighbors(c)) {
          if (this.grid[n].unit === "fiber" && this.grid[n].offline <= 0) {
            for (const cc of p.cells) this.grid[cc].boosted = true;
          }
        }
      }
    }
    this.pods = pods;
    this.rackCount = rackCount;
    this.podCount = pods.filter((p) => p.cells.length >= 3).length;
    const alive = new Set(pods.map((p) => p.key));
    for (const k of Array.from(this.linked.keys())) if (!alive.has(k)) this.linked.delete(k);
  }

  private checkLinks() {
    for (const p of this.pods) {
      if (p.cells.length < 3) continue;
      const prev = this.linked.get(p.key) ?? 0;
      if (prev >= p.cells.length) continue;
      const fresh = prev === 0;
      this.linked.set(p.key, p.cells.length);
      this.combo = Math.min(8, this.combo + 1);
      this.comboTimer = 5;
      this.lastCombo = Math.max(this.lastCombo, this.combo);
      if (this.combo >= 5) this.unlock("combo_5");
      if (fresh) this.scoredPods++;
      if (this.podCount >= 5) this.unlock("pods_5");
      if (this.podCount >= 10) this.unlock("pods_10");
      if (fresh) this.unlock("first_pod");
      const bonus = Math.round((fresh ? 35 : 18) * p.cells.length * this.comboMult);
      this.score += bonus;
      let hx = 0;
      let hy = 0;
      for (const c of p.cells) {
        const px = this.cx(c);
        const py = this.cy(c);
        hx += px;
        hy += py;
        this.burst(px, py, "#69a6d7", 8, 150);
        this.grid[c].pop = 1;
      }
      hx /= p.cells.length;
      hy /= p.cells.length;
      this.ring(hx, hy, "#8fd0ff");
      this.float(
        hx,
        hy - this.cell * 0.5,
        `${fresh ? "POD LINKED" : "POD SCALED"} +${bonus}`,
        "#8fd0ff",
        16,
      );
      this.shake = Math.max(this.shake, 7 + Math.min(9, p.cells.length));
      this.flash = Math.max(this.flash, 0.25);
      this.flashColor = "#69a6d7";
      sfx.link(p.cells.length);
      this.buzz([8, 26, 14]);
      if (fresh && p.cells.length >= 3)
        this.pushLog(`POD ${String.fromCharCode(64 + this.podCount)} LINKED / ${p.cells.length} RACKS`, "good");
    }
  }

  /* ------------------------------------------------------------------ */
  /* events                                                              */
  /* ------------------------------------------------------------------ */

  private triggerEvent() {
    const weights: [() => void, number][] = [
      [() => this.evTrafficSpike(), 0.22],
      [() => this.evCoolantLeak(), 0.18],
      [() => this.evPowerSurge(), 0.16],
      [() => this.evFirmware(), 0.12],
      [() => this.evIntakeClog(), 0.1],
      [() => this.evScramble(), 0.1],
      [() => this.evHumidity(), 0.08],
      [() => this.evBonus(), 0.04],
    ];
    const total = weights.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [fn, w] of weights) {
      r -= w;
      if (r <= 0) {
        fn();
        return;
      }
    }
  }

  private evTrafficSpike() {
    this.mod = { label: "TRAFFIC SPIKE  ×2 OUTPUT", color: "#80b784", left: 12, total: 12, kind: "x2" };
    this.pushLog("TRAFFIC SPIKE / OUTPUT DOUBLED", "good");
    sfx.event(true);
    this.flash = 0.3;
    this.flashColor = "#80b784";
  }
  private evCoolantLeak() {
    const cx = Math.floor(Math.random() * COLS);
    const cy = Math.floor(Math.random() * ROWS);
    for (let y = cy - 1; y <= cy + 1; y++)
      for (let x = cx - 1; x <= cx + 1; x++)
        if (this.inBounds(x, y)) this.grid[this.idx(x, y)].heat += 34;
    this.coreTemp = Math.min(99, this.coreTemp + 13);
    this.shake = Math.max(this.shake, 14);
    this.flash = 0.45;
    this.flashColor = "#d9544f";
    this.burst(this.ox + (cx + 0.5) * this.cell, this.oy + (cy + 0.5) * this.cell, "#cf784d", 40, 260);
    this.pushLog("COOLANT LEAK / LOCAL HOTSPOT", "bad");
    sfx.event(false);
  }
  private evPowerSurge() {
    const powers = this.grid.filter((c) => c.unit === "power" && c.offline <= 0);
    if (!powers.length) {
      this.evTrafficSpike();
      return;
    }
    const target = this.grid.indexOf(powers[Math.floor(Math.random() * powers.length)]);
    this.grid[target].offline = 999;
    this.pushLog("POWER SURGE / REBOOT THE PDU [F]", "warn");
    sfx.event(false);
    this.shake = Math.max(this.shake, 10);
    this.flash = 0.35;
    this.flashColor = "#d6a243";
    this.burst(this.cx(target), this.cy(target), "#d6a243", 30, 200);
  }
  private evFirmware() {
    this.mod = { label: "FIRMWARE PATCH  +35% I/O", color: "#78c8c0", left: 10, total: 10, kind: "io" };
    this.pushLog("FIRMWARE PATCH / I/O +35%", "good");
    sfx.event(true);
  }
  private evIntakeClog() {
    this.ambient = Math.min(34, this.ambient + 2);
    this.pushLog("INTAKE FILTERS CLOGGED / AMBIENT STRESS +2", "warn");
    sfx.event(false);
    this.shake = Math.max(this.shake, 8);
  }
  private evScramble() {
    this.queue = [this.rollUnit(), this.rollUnit(), this.rollUnit()];
    this.scrambleTimer = 8;
    this.pushLog("ROGUE REBOOT / QUEUE SCRAMBLED", "warn");
    sfx.event(false);
    this.shake = Math.max(this.shake, 9);
    this.flash = 0.3;
    this.flashColor = "#c77a9c";
    this.burst(
      this.ox + (this.cursor.x + 0.5) * this.cell,
      this.oy + (this.cursor.y + 0.5) * this.cell,
      "#c77a9c",
      22,
      160,
    );
  }
  private evHumidity() {
    this.humidTimer = 8;
    this.pushLog("HUMIDITY SURGE / HEAT GEN ×1.5", "warn");
    sfx.event(false);
    this.shake = Math.max(this.shake, 9);
    this.flash = 0.3;
    this.flashColor = "#7d93ad";
  }
  private evBonus() {
    if (this.podCount === 0 || this.throughput <= 0) {
      this.pushLog("CLIENT OFFER / A PRODUCTIVE POD IS REQUIRED FOR A BONUS", "info");
      return;
    }
    this.score += 400;
    this.float(
      this.ox + this.board / 2,
      this.oy + this.board / 2,
      "+400 CLIENT WIND",
      "#80b784",
      18,
    );
    this.pushLog("CLIENT WIND / +400 BONUS", "good");
    sfx.event(true);
    this.flash = 0.3;
    this.flashColor = "#80b784";
  }

  pushLog(text: string, kind: LogLine["kind"]) {
    this.log.unshift({ id: this.logId++, text, kind });
    if (this.log.length > 26) this.log.pop();
  }

  unlock(id: AchievementId) {
    if (this.achievements.has(id)) return;
    const a = ACHIEVEMENTS[id];
    this.achievements.add(id);
    this.achQueue.push({ id, t: 0 });
    this.pushLog(`> ${a.label} / ${a.desc}`, "good");
    this.score += 250;
    this.shake = Math.max(this.shake, 6);
    sfx.reboot();
    // pop the new achievement into the next snapshot
    this.newAchievement = id;
    window.setTimeout(() => {
      if (this.newAchievement === id) this.newAchievement = null;
    }, 2400);
  }

  /**
   * Surface a concept the first time the player's own floor demonstrates it.
   * In learn mode this halts the sim so the card is actually read; otherwise
   * it is logged silently and remains available in the codex.
   */
  teach(id: ConceptId) {
    // Other trigger checks in this tick must not replace the visible lesson.
    // They remain eligible for the next tick after this card is dismissed.
    if (this.pendingConcept) return;
    if (this.firedThisRun.has(id)) return;
    this.firedThisRun.add(id);
    const alreadyKnown = this.seenConcepts.has(id);
    this.seenConcepts.add(id);
    if (!alreadyKnown) this.onConceptUnlock?.(Array.from(this.seenConcepts));
    if (alreadyKnown || !this.settings.learnMode) {
      if (!alreadyKnown) this.pushLog(`CODEX UNLOCKED / ${id.toUpperCase()}`, "info");
      return;
    }
    this.pendingConcept = id;
    this.state = "paused";
    this.onState?.("paused");
    this.emit();
  }

  dismissConcept() {
    if (!this.pendingConcept) return;
    this.pendingConcept = null;
    this.last = performance.now();
    this.state = "running";
    this.onState?.("running");
    this.emit();
  }

  /** Evaluates every trigger condition once per simulation tick. */
  private evaluateTriggers() {
    if (this.pendingConcept) return;

    const has = (u: UnitType) => this.grid.some((c) => c.unit === u);
    const count = (u: UnitType) => this.grid.filter((c) => c.unit === u).length;

    if (this.itLoad > 0 && this.time > 4) this.teach("pue");
    if (this.scoredPods >= 1) this.teach("hot_cold_aisle");
    if (has("cool")) this.teach("ashrae");
    if (count("cool") >= 2) this.teach("delta_t");
    if (has("power")) this.teach("power_chain");
    if (has("fiber")) this.teach("tor_leaf_spine");
    if (count("fiber") >= 2) this.teach("oversubscription");
    if (this.rackCount >= 6) this.teach("rack_density");
    if (this.load > 1) this.teach("stranded_capacity");
    if (this.grid.some((c) => c.unit === "rack" && c.throttle > 0.4))
      this.teach("thermal_throttle");
    if (this.grid.some((c) => c.offline > 0)) {
      this.teach("redundancy");
      this.teach("tiers");
    }
    if (this.scrappes >= 1 && this.time > 8) this.teach("concurrent_maint");
    if (this.phase >= 2) this.teach("capacity_planning");
    if (this.phase >= 3) this.teach("free_cooling");
    if (this.phase >= 4) this.teach("wue");
    if (this.pods.some((p) => p.cells.length >= 6)) this.teach("liquid_cooling");
    if (isFinite(this.pue) && this.pue > 1.9 && this.time > 20) this.teach("overcooling");
  }

  private computeTutorialStep(): number {
    if (this.time < 6) return 0;
    if (this.scoredPods === 0 && this.time < 18) return 1;
    if (this.podCount < 2 && this.time < 32) return 2;
    if (this.coreTemp > 60 && this.grid.every((c) => c.unit !== "cool")) return 3;
    return -1;
  }

  private tutorialHint(step: number): string {
    switch (step) {
      case 0:
        return "DEPLOY 3 SERVER RACKS SIDE-BY-SIDE TO LINK A POD";
      case 1:
        return "BUILT A POD! TAP 3 ADJACENT RACKS TO START ANOTHER";
      case 2:
        return "POWER & COOLING / ADD A PDU (POWER) OR HVAC (COOL)";
      case 3:
        return "CORE IS HEATING UP / PLACE AN HVAC COOLANT ARRAY";
      default:
        return "";
    }
  }

  /** mobile haptic feedback (no-op where unsupported) */
  private buzz(pattern: number | number[]) {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.vibrate === "function") {
      try {
        nav.vibrate(pattern);
      } catch {
        /* ignored */
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* fx                                                                  */
  /* ------------------------------------------------------------------ */

  burst(x: number, y: number, color: string, count: number, power: number) {
    if (this.particles.length > 520) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.25 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.5,
        max: 0.85,
        size: 1 + Math.random() * 2.6,
        color,
        grav: 120,
        kind: Math.random() < 0.25 ? 2 : 0,
      });
    }
  }

  smoke(x: number, y: number, color: string) {
    if (this.particles.length > 520) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * this.cell * 0.5,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: -14 - Math.random() * 22,
      life: 0.9 + Math.random() * 0.7,
      max: 1.6,
      size: 2 + Math.random() * 4,
      color,
      grav: -6,
      kind: 1,
    });
  }

  ring(x: number, y: number, color: string) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.45,
      max: 0.45,
      size: this.cell * 0.35,
      color,
      grav: 0,
      kind: 2,
    });
  }

  float(x: number, y: number, text: string, color: string, size: number) {
    if (this.floaters.length > 26) this.floaters.shift();
    this.floaters.push({ x, y, vy: -34, life: 1.1, text, color, size });
  }

  /* ------------------------------------------------------------------ */
  /* simulation                                                          */
  /* ------------------------------------------------------------------ */

  private update(dt: number) {
    this.t += dt;
    if (this.hold && this.state === "running" && !this.overlayOpen) {
      this.hold.t += dt;
      if (this.hold.t > 0.42) {
        const i = this.hold.i;
        this.hold = null;
        this.scrap(i);
      }
    }

    if (this.state === "running") this.simulate(dt);
    this.updateFx(dt);

    this.snapClock += dt;
    if (this.snapClock > 0.1) {
      this.snapClock = 0;
      this.emit();
    }
  }

  private simulate(dt: number) {
    const productive = this.podCount > 0 && this.throughput > 0;
    this.time += dt;
    this.phaseTimer -= dt;
    this.eventTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.lastCombo = 0;
      }
    }
    if (this.mod) {
      this.mod.left -= dt;
      if (this.mod.left <= 0) this.mod = null;
    }
    if (this.humidTimer > 0) this.humidTimer = Math.max(0, this.humidTimer - dt);
    if (this.scrambleTimer > 0) this.scrambleTimer = Math.max(0, this.scrambleTimer - dt);

    // achievement: hit 99 and live
    if (this.coreTemp > 99) this.peakTemp = Math.max(this.peakTemp, this.coreTemp);
    if (productive && this.coreTemp < 90 && this.peakTemp > 98) this.unlock("core_99");

    // tutorial: progress once milestones are met
    this.tutorialStep = this.computeTutorialStep();
    this.hint = this.tutorialHint(this.tutorialStep);

    if (this.phaseTimer <= 0) {
      this.phase++;
      this.phaseTimer = PHASE_TIME;
      this.ambient = Math.min(34, this.ambient + 2);
      if (productive && this.phase >= 3 && this.scrappes === 0) this.unlock("no_scrape_3");
      const shiftIndex = Math.min(SHIFTS.length - 1, Math.floor((this.phase - 1) / 1.5));
      if (SHIFTS[shiftIndex].name !== this.shiftName) {
        this.shift = shiftIndex;
        this.shiftName = SHIFTS[shiftIndex].name;
        this.pushLog(`SHIFT CHANGE / ${this.shiftName} SHIFT`, "warn");
        this.flash = 0.4;
        this.flashColor = SHIFTS[shiftIndex].tint;
        this.shake = Math.max(this.shake, 12);
      }
      const phaseBonus = productive ? 200 * this.phase : 0;
      this.score += phaseBonus;
      this.pushLog(
        `PHASE ${this.phase} / AMBIENT STRESS ${this.ambient.toFixed(0)} / ${phaseBonus ? `UPTIME +${phaseBonus}` : "NO PRODUCTIVE POD / NO BONUS"}`,
        "warn",
      );
      this.shake = Math.max(this.shake, 10);
      this.flash = Math.max(this.flash, 0.25);
      sfx.phase();
      if (productive && this.phase >= 4) this.unlock("phases_3");
    }
    if (this.eventTimer <= 0) {
      this.eventTimer = EVENT_TIME;
      this.triggerEvent();
    }

    // ---- power & heat budgets
    let heatGen = 0;
    let coolCap = 0;
    let capacity = BASE_CAPACITY;
    let demand = 0;
    for (const c of this.grid) {
      if (!c.unit) continue;
      const d = UNITS[c.unit];
      demand += d.draw;
      if (c.offline > 0) continue;
      if (d.capacity) capacity += d.capacity;
    }
    const brownout = demand > capacity ? capacity / Math.max(1, demand) : 1;
    this.capacity = capacity;
    this.demand = demand;
    this.load = demand / Math.max(1, capacity);

    // --- PUE: total facility draw over IT draw.
    let itDraw = 0;
    for (const c of this.grid) {
      if (c.unit && IT_UNITS.includes(c.unit)) itDraw += UNITS[c.unit].draw;
    }
    this.itLoad = itDraw;
    this.overhead = Math.max(0, demand - itDraw);
    this.pue = itDraw > 0 ? demand / itDraw : Infinity;
    if (itDraw > 0 && isFinite(this.pue)) {
      this.pueSum += this.pue;
      this.pueSamples++;
    }

    // A spare PDU beyond what the load needs approximates N+1.
    const pdus = this.grid.filter((c) => c.unit === "power");
    const onlinePdus = pdus.filter((c) => c.offline <= 0).length;
    this.redundantPower =
      onlinePdus >= 2 && capacity - (UNITS.power.capacity as number) >= demand;

    // ---- per cell heat / age
    for (let i = 0; i < CELLS; i++) {
      const c = this.grid[i];
      c.age += dt;
      if (c.pop > 0) c.pop = Math.max(0, c.pop - dt * 2.6);
      if (c.offline > 0 && c.offline < 900) c.offline = Math.max(0, c.offline - dt);
      const humidMult = this.humidTimer > 0 ? 1.5 : 1;
      let gen = 0;
      if (c.unit) {
        const d = UNITS[c.unit];
        gen = d.heat * (brownout < 1 ? 1.6 : 1) * humidMult;
        if (c.unit === "cool" && c.offline <= 0) gen = -3.5;
        if (c.unit === "cool" && c.offline <= 0 && Math.random() < dt * 7)
          this.smoke(this.cx(i), this.cy(i), "rgba(46,230,214,0.55)");
      }
      let vent = 0;
      const x = i % COLS;
      const y = (i / COLS) | 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!this.inBounds(x + ox, y + oy)) continue;
          const n = this.grid[this.idx(x + ox, y + oy)];
          if (n.unit === "cool" && n.offline <= 0) vent += 5.4 * brownout;
        }
      c.heat += (gen * 3.4 - vent) * dt;
      c.heat += (this.coreTemp - c.heat) * 0.5 * dt;
      if (!c.unit) c.heat += (this.ambient - c.heat) * 0.9 * dt;
      c.heat = Math.max(0, Math.min(130, c.heat));
      c.throttle = c.heat > 70 ? Math.min(1, (c.heat - 70) / 50) : 0;
      if (c.unit && c.throttle > 0.55 && Math.random() < dt * 4)
        this.smoke(this.cx(i), this.cy(i), "rgba(255,120,60,0.5)");
      if (c.unit) heatGen += Math.max(0, gen);
      // A coolant array only earns its full capacity if it is actually serving
      // racks. Conditioning empty floor is bypass air: power spent for no work.
      if (c.unit === "cool" && c.offline <= 0) {
        let served = 0;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            if (!this.inBounds(x + ox, y + oy)) continue;
            if (this.grid[this.idx(x + ox, y + oy)].unit === "rack") served++;
          }
        const utilisation = 0.4 + 0.6 * Math.min(1, served / 6);
        coolCap += (UNITS.cool.vent as number) * utilisation * brownout;
      }
    }

    // ---- core temperature
    this.coreTemp += (heatGen - coolCap) * (dt / 3.0);
    this.coreTemp += (this.ambient - this.coreTemp) * 0.035 * dt;
    this.coreTemp = Math.max(0, this.coreTemp);

    // ---- throughput
    let out = 0;
    let anyPodThrottled = false;
    for (const p of this.pods) {
      const n = p.cells.length;
      let base = Math.pow(n, 1.3) * 1.2 * (n >= 3 ? 1.15 : 0.55);
      if (this.grid[p.cells[0]].boosted) base *= 1.8;
      let h = 0;
      for (const c of p.cells) h += this.grid[c].heat;
      h /= n;
      const thr = h > 70 ? Math.max(0.15, 1 - (h - 70) / 45) : 1;
      if (thr < 1) anyPodThrottled = true;
      out += base * thr;
    }
    // Count elapsed affected time once per tick, regardless of the number of racks.
    if (anyPodThrottled) this.throttledSeconds += dt;
    const modMult = this.mod ? (this.mod.kind === "x2" ? 2 : 1.35) : 1;
    const thruCombo = Math.min(2, 1 + this.combo * 0.12);
    this.throughput = out * modMult * thruCombo * brownout;
    this.score += this.throughput * dt * 10;

    this.peakTemp = Math.max(this.peakTemp, this.coreTemp);
    this.evaluateTriggers();

    // ---- alarm
    if (this.coreTemp > 82) {
      this.alarmClock -= dt;
      if (this.alarmClock <= 0) {
        this.alarmClock = 0.6;
        sfx.alarm();
        this.shake = Math.max(this.shake, 2.5);
      }
    }
    if (this.coreTemp >= 100) {
      this.coreTemp = 100;
      this.gameOver("CORE MELTDOWN / THERMAL LIMIT EXCEEDED");
    }
  }

  private updateFx(dt: number) {
    this.idleHue = (this.idleHue + dt * 0.04) % 1;
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      if (p.kind === 2) {
        p.size += dt * this.cell * 2.2;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.vx *= 1 - dt * 2.2;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 1 - dt * 1.4;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    this.shake *= Math.exp(-dt * 6.5);
    this.flash *= Math.exp(-dt * 5.5);
    if (this.shake < 0.05) this.shake = 0;
  }

  get comboMult() {
    return Math.min(5, 1 + this.combo * 0.5);
  }

  /** 0..1 progress of the hold-to-decommission gesture */
  holdProgress() {
    return this.hold ? Math.min(1, this.hold.t / 0.42) : 0;
  }

  get data() {
    return this.score / 100;
  }

  /* ------------------------------------------------------------------ */
  /* demo layout for the attract screen                                  */
  /* ------------------------------------------------------------------ */

  private buildDemo() {
    const put = (x: number, y: number, u: UnitType) => {
      const c = this.grid[this.idx(x, y)];
      c.unit = u;
      c.age = Math.random() * 6;
    };
    for (let x = 1; x <= 3; x++) put(x, 2, "rack");
    for (let x = 1; x <= 3; x++) put(x, 3, "rack");
    put(0, 2, "cool");
    put(4, 3, "fiber");
    put(5, 5, "power");
    for (let x = 5; x <= 6; x++) for (let y = 1; y <= 2; y++) put(x, y, "rack");
    put(6, 0, "cool");
    put(2, 6, "rack");
    put(3, 6, "rack");
    put(4, 6, "rack");
    put(1, 5, "power");
    put(6, 6, "cool");
    this.rebuildPods();
    for (let i = 0; i < CELLS; i++) this.grid[i].heat = 18 + Math.random() * 20;
  }

  emit() {
    this.onSnapshot?.({
      state: this.state,
      score: Math.floor(this.score),
      data: this.data,
      throughput: this.throughput,
      coreTemp: this.coreTemp,
      ambient: this.ambient,
      load: this.load,
      capacity: this.capacity,
      demand: this.demand,
      combo: this.combo,
      comboMult: this.comboMult,
      comboLeft: Math.max(0, this.comboTimer),
      phase: this.phase,
      phaseLeft: Math.max(0, this.phaseTimer),
      time: this.time,
      queue: [...this.queue],
      selected: this.selected,
      pods: this.podCount,
      rackCount: this.rackCount,
      log: this.log.slice(0, 6),
      modifier: this.mod
        ? {
            label: this.mod.label,
            color: this.mod.color,
            left: this.mod.left,
            total: this.mod.total,
            kind: this.mod.kind,
          }
        : null,
      reboot: this.grid.filter((c) => c.offline > 0).length,
      best: this.podCount ? Math.max(...this.pods.map((p) => p.cells.length)) : 0,
      danger: this.coreTemp > 82,
      shift: this.shift,
      shiftName: this.shiftName,
      scrambled: Math.max(0, this.scrambleTimer),
      humid: Math.max(0, this.humidTimer),
      settings: { ...this.settings },
      newAchievement: this.newAchievement,
      achievements: Array.from(this.achievements),
      scoredPods: this.scoredPods,
      objectives: this.buildObjectives(),
      pue: this.pue,
      avgPue: this.pueSamples > 0 ? this.pueSum / this.pueSamples : Infinity,
      itLoad: this.itLoad,
      overhead: this.overhead,
      peakTemp: this.peakTemp,
      throttled: this.throttledSeconds,
      redundantPower: this.redundantPower,
      pendingConcept: this.pendingConcept,
      seenConcepts: Array.from(this.seenConcepts),
      learnMode: this.settings.learnMode,
    });
  }

  /** Onboarding checklist. Rendered as the board's bottom status band. */
  private buildObjectives(): Objective[] {
    return [
      { label: "Link a POD", done: this.scoredPods >= 1 },
      { label: "Deploy coolant", done: this.grid.some((c) => c.unit === "cool") },
      { label: "Deploy a PDU", done: this.grid.some((c) => c.unit === "power") },
      { label: "Reach 3 PODs", done: this.podCount >= 3 },
    ];
  }
}

export { PHASE_TIME };

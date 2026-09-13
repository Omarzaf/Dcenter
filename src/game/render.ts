import type { Engine } from "./engine";
import { COLS, ROWS, UNITS } from "./types";

interface Mote {
  x: number;
  y: number;
  s: number;
  v: number;
  a: number;
}
let motes: Mote[] = [];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const STOPS = {
  classic: [
    [0, 14, 26, 42],
    [45, 22, 52, 88],
    [72, 96, 78, 38],
    [98, 190, 74, 28],
    [130, 236, 48, 44],
  ] as [number, number, number, number][],
  // blue to teal to yellow to red, no green dependency
  deuteranopia: [
    [0, 14, 38, 80],
    [45, 18, 96, 160],
    [72, 38, 168, 200],
    [98, 230, 200, 60],
    [130, 240, 90, 60],
  ] as [number, number, number, number][],
  // purple to magenta to orange to red, no blue-green dependency
  tritanopia: [
    [0, 36, 22, 56],
    [45, 80, 22, 96],
    [72, 168, 28, 132],
    [98, 224, 80, 60],
    [130, 240, 90, 60],
  ] as [number, number, number, number][],
};

function heatRGB(h: number, palette: "classic" | "deuteranopia" | "tritanopia" = "classic") {
  const stops = STOPS[palette] ?? STOPS.classic;
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const a = stops[i - 1];
      const b = stops[i];
      const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
      return [
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
        Math.round(a[3] + (b[3] - a[3]) * t),
      ];
    }
  }
  return [236, 48, 44];
}

function seedMotes(w: number, h: number) {
  motes = Array.from({ length: 46 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    s: 0.6 + Math.random() * 1.6,
    v: 6 + Math.random() * 22,
    a: 0.08 + Math.random() * 0.28,
  }));
}

export function draw(eng: Engine, w: number, h: number) {
  const ctx = eng.ctx;
  const still = eng.reducedMotion || eng.settings.shake === 0;
  const t = still ? 0 : eng.t;
  ctx.setTransform(eng.dpr, 0, 0, eng.dpr, 0, 0);
  if (!motes.length) seedMotes(w, h);

  /* ---------------- backdrop ---------------- */
  const shakeScale = still ? 0 : eng.settings.shake;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#070c15");
  bg.addColorStop(0.55, "#05080f");
  bg.addColorStop(1, "#080d17");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ambient bloom reacting to core temperature
  const heatT = Math.min(1, eng.coreTemp / 100);
  const glow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.72);
  glow.addColorStop(0, `rgba(${Math.round(20 + heatT * 90)}, ${Math.round(70 - heatT * 40)}, ${Math.round(110 - heatT * 60)}, 0.20)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // shift tint overlay (changes every 1.5 phases)
  const shift = eng.shift;
  const tintAlpha = 0.05 + Math.min(0.14, heatT * 0.14);
  ctx.fillStyle =
    shift === 0
      ? `rgba(255,230,168,${tintAlpha * 0.5})`
      : shift === 1
        ? `rgba(255,122,61,${tintAlpha})`
        : shift === 2
          ? `rgba(46,230,214,${tintAlpha * 0.6})`
          : `rgba(255,59,71,${tintAlpha})`;
  ctx.fillRect(0, 0, w, h);

  // drifting data motes (slowed when motion is reduced)
  const motesSpeed = still ? 0 : (shakeScale < 0.2 ? 0.3 : 1) * (shakeScale < 0.6 ? 0.7 : 1);
  ctx.fillStyle = "#69a6d7";
  for (const m of motes) {
    m.y -= m.v * 0.016 * motesSpeed;
    if (m.y < -4) {
      m.y = h + 4;
      m.x = Math.random() * w;
    }
    ctx.globalAlpha = m.a * (0.5 + 0.5 * Math.sin(t * 2 + m.x));
    ctx.fillRect(m.x, m.y, m.s, m.s * 3);
  }
  ctx.globalAlpha = 1;

  // faint blueprint grid
  ctx.strokeStyle = "rgba(70,120,180,0.055)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const step = 34;
  const off = (t * 6) % step;
  for (let x = -step + off; x < w; x += step) {
    ctx.moveTo(Math.floor(x) + 0.5, 0);
    ctx.lineTo(Math.floor(x) + 0.5, h);
  }
  for (let y = -step + off; y < h; y += step) {
    ctx.moveTo(0, Math.floor(y) + 0.5);
    ctx.lineTo(w, Math.floor(y) + 0.5);
  }
  ctx.stroke();

  /* ---------------- shake ---------------- */
  ctx.save();
  if (eng.shake > 0.05) {
    const s = eng.shake * shakeScale;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  const { ox, oy, board, cell } = eng;

  /* ---------------- floor ---------------- */
  ctx.fillStyle = "#0a111c";
  rr(ctx, ox - 6, oy - 6, board + 12, board + 12, 10);
  ctx.fill();
  ctx.strokeStyle = "#1e2c40";
  ctx.lineWidth = 1;
  ctx.stroke();

  const floorGrad = ctx.createLinearGradient(ox, oy, ox + board, oy + board);
  floorGrad.addColorStop(0, "rgba(20,32,48,0.9)");
  floorGrad.addColorStop(1, "rgba(9,15,24,0.9)");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(ox, oy, board, board);

  // aisle shading + tile grid
  ctx.strokeStyle = "rgba(90,150,220,0.075)";
  ctx.beginPath();
  for (let i = 1; i < COLS; i++) {
    ctx.moveTo(Math.floor(ox + i * cell) + 0.5, oy);
    ctx.lineTo(Math.floor(ox + i * cell) + 0.5, oy + board);
  }
  for (let j = 1; j < ROWS; j++) {
    ctx.moveTo(ox, Math.floor(oy + j * cell) + 0.5);
    ctx.lineTo(ox + board, Math.floor(oy + j * cell) + 0.5);
  }
  ctx.stroke();

  // corner brackets
  ctx.strokeStyle = "rgba(46,230,214,0.5)";
  ctx.lineWidth = 2;
  const bl = 16;
  const corners: [number, number, number, number][] = [
    [ox - 6, oy - 6, 1, 1],
    [ox + board + 6, oy - 6, -1, 1],
    [ox - 6, oy + board + 6, 1, -1],
    [ox + board + 6, oy + board + 6, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * bl, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * bl);
    ctx.stroke();
  }

  /* ---------------- cells ---------------- */
  const pad = Math.max(1.5, cell * 0.055);
  for (let i = 0; i < COLS * ROWS; i++) {
    const c = eng.grid[i];
    const x = ox + (i % COLS) * cell + pad;
    const y = oy + ((i / COLS) | 0) * cell + pad;
    const s = cell - pad * 2;
    const palette = eng.settings?.palette ?? "classic";
    const [r, g, b] = heatRGB(c.heat, palette);
    const intensity = 0.22 + Math.min(0.7, c.heat / 100) * 0.75;
    ctx.fillStyle = `rgba(${r},${g},${b},${c.unit ? intensity : intensity * 0.5})`;
    rr(ctx, x, y, s, s, cell * 0.16);
    ctx.fill();
    ctx.strokeStyle = c.unit
      ? `rgba(${r + 40},${g + 40},${b + 40},0.35)`
      : "rgba(110,160,220,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ---------------- pod links ---------------- */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < COLS * ROWS; i++) {
    const c = eng.grid[i];
    if (!c.unit || c.pod < 0) continue;
    const x = i % COLS;
    const y = (i / COLS) | 0;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= COLS || ny >= ROWS) continue;
      const n = eng.grid[eng.idx(nx, ny)];
      if (n.pod !== c.pod) continue;
      const ax = eng.cx(i);
      const ay = eng.cy(i);
      const bx = eng.cx(eng.idx(nx, ny));
      const by = eng.cy(eng.idx(nx, ny));
      const col = c.boosted ? "255,95,162" : "74,168,255";
      const big = c.podSize >= 3;
      ctx.strokeStyle = `rgba(${col},${big ? 0.55 : 0.22})`;
      ctx.lineWidth = big ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (big) {
        const speed = 0.55 + (c.podSize % 4) * 0.08;
        for (let k = 0; k < 2; k++) {
          const f = ((t * speed + k * 0.5 + i * 0.13) % 1 + 1) % 1;
          const px = ax + (bx - ax) * f;
          const py = ay + (by - ay) * f;
          ctx.fillStyle = c.boosted ? "rgba(255,180,220,0.95)" : "rgba(190,225,255,0.95)";
          ctx.beginPath();
          ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();

  /* ---------------- units ---------------- */
  for (let i = 0; i < COLS * ROWS; i++) {
    const c = eng.grid[i];
    if (!c.unit) continue;
    drawUnit(ctx, eng, i, c.unit, c);
  }

  /* ---------------- cursor ---------------- */
  if (eng.state === "running" || eng.state === "paused") {
    const ci = eng.idx(eng.cursor.x, eng.cursor.y);
    const cx = ox + eng.cursor.x * cell;
    const cy = oy + eng.cursor.y * cell;
    const target = eng.grid[ci];
    const col = target.unit ? "#d9544f" : UNITS[eng.queue[eng.selected]].color;
    const pulse = 0.55 + 0.45 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.lineWidth = 2;
    const L = cell * 0.3;
    const m = 1.5;
    const cs: [number, number, number, number][] = [
      [cx + m, cy + m, 1, 1],
      [cx + cell - m, cy + m, -1, 1],
      [cx + m, cy + cell - m, 1, -1],
      [cx + cell - m, cy + cell - m, -1, -1],
    ];
    for (const [px, py, sx, sy] of cs) {
      ctx.beginPath();
      ctx.moveTo(px + sx * L, py);
      ctx.lineTo(px, py);
      ctx.lineTo(px, py + sy * L);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // hold-to-scrap ring
    const prog = eng.holdProgress();
    if (prog > 0) {
      ctx.strokeStyle = "#d9544f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + cell / 2, cy + cell / 2, cell * 0.42, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
    } else if (!target.unit) {
      ctx.globalAlpha = 0.28;
      drawGlyph(ctx, eng.queue[eng.selected], cx + cell / 2, cy + cell / 2, cell * 0.34, t, 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------------- particles ---------------- */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of still ? [] : eng.particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.kind === 2) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = a * 0.75;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 1) {
      ctx.globalAlpha = a * 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.restore();

  /* ---------------- floating text ---------------- */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of still ? [] : eng.floaters) {
    const a = Math.min(1, f.life * 1.6);
    ctx.globalAlpha = a;
    ctx.font = `600 ${f.size}px "IBM Plex Mono", monospace`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(3,6,12,0.85)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // shake

  /* ---------------- overlays ---------------- */
  if (eng.coreTemp > 78 && eng.state === "running") {
    const a = ((eng.coreTemp - 78) / 22) * (0.25 + 0.25 * Math.sin(t * 9));
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.65);
    vg.addColorStop(0, "rgba(255,40,50,0)");
    vg.addColorStop(1, `rgba(255,40,50,${Math.max(0, a).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // scan sweep
  const scanSpeed = shakeScale < 0.4 ? 20 : 70;
  const sy = ((t * scanSpeed) % (h + 160)) - 80;
  const sw = ctx.createLinearGradient(0, sy - 40, 0, sy + 40);
  sw.addColorStop(0, "rgba(120,200,255,0)");
  sw.addColorStop(0.5, "rgba(120,200,255,0.045)");
  sw.addColorStop(1, "rgba(120,200,255,0)");
  ctx.fillStyle = sw;
  ctx.fillRect(0, sy - 40, w, 80);

  if (!still && eng.flash > 0.01) {
    ctx.globalAlpha = Math.min(0.55, eng.flash * 0.5);
    ctx.fillStyle = eng.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // vignette
  const vg2 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg2.addColorStop(0, "rgba(0,0,0,0)");
  vg2.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vg2;
  ctx.fillRect(0, 0, w, h);

  if (eng.state !== "running") {
    ctx.fillStyle = `rgba(4,7,13,${eng.state === "idle" ? 0.52 : 0.76})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/* ------------------------------------------------------------------ */

type CellLike = {
  heat: number;
  pop: number;
  podSize: number;
  boosted: boolean;
  offline: number;
  throttle: number;
  age: number;
};

function drawUnit(
  ctx: CanvasRenderingContext2D,
  eng: Engine,
  i: number,
  type: string,
  c: CellLike,
) {
  const x = eng.cx(i);
  const y = eng.cy(i);
  const r = eng.cell * 0.34;
  const still = eng.reducedMotion || eng.settings.shake === 0;
  const t = still ? 0 : eng.t;
  const pop = !still && c.pop > 0 ? 1 + Math.sin(c.pop * Math.PI) * 0.22 : 1;
  const def = UNITS[type as keyof typeof UNITS];
  const offline = c.offline > 0;
  const linked = type === "rack" && c.podSize >= 3;
  const brown = !still && eng.load > 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);

  // glow plate
  if (linked || type === "power" || type === "fiber") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.1);
    const glowA = offline ? 0.05 : linked ? 0.3 : 0.16;
    g.addColorStop(0, hexA(def.color, glowA * (0.7 + 0.3 * Math.sin(t * 3 + i))));
    g.addColorStop(1, hexA(def.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = offline ? 0.45 + 0.25 * Math.sin(t * 18) : 1;
  drawGlyph(ctx, type, 0, 0, r, t, i, c.throttle, brown);
  ctx.globalAlpha = 1;

  if (offline) {
    ctx.strokeStyle = "#d9544f";
    ctx.lineWidth = 2;
    const q = r * 0.9;
    ctx.beginPath();
    ctx.moveTo(-q, -q);
    ctx.lineTo(q, q);
    ctx.moveTo(q, -q);
    ctx.lineTo(-q, q);
    ctx.stroke();
    ctx.font = `600 ${Math.max(7, eng.cell * 0.17)}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = "#d9544f";
    ctx.textAlign = "center";
    ctx.fillText("REBOOT", 0, r + eng.cell * 0.24);
  } else if (c.throttle > 0.4) {
    ctx.font = `600 ${Math.max(7, eng.cell * 0.16)}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = "#ff8a3d";
    ctx.textAlign = "center";
    ctx.fillText("HOT", 0, r + eng.cell * 0.24);
  }
  ctx.restore();
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  r: number,
  t: number,
  seed: number,
  throttle = 0,
  brown = false,
) {
  ctx.save();
  ctx.translate(x, y);
  const def = UNITS[type as keyof typeof UNITS];
  const color = def.color;

  if (type === "rack") {
    const w = r * 1.5;
    const h = r * 1.9;
    ctx.fillStyle = "#0b1420";
    rr(ctx, -w / 2, -h / 2, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const slats = 4;
    for (let s = 0; s < slats; s++) {
      const sy = -h / 2 + (h / slats) * (s + 0.5);
      ctx.fillStyle = "rgba(74,168,255,0.14)";
      ctx.fillRect(-w / 2 + 3, sy - h / (slats * 2.6), w - 6, h / (slats * 1.7));
      const on = brown ? Math.random() < 0.25 : Math.sin(t * 5 + s * 1.7 + seed) > -0.3;
      ctx.fillStyle = throttle > 0.5 ? "#ff8a3d" : on ? color : "#1b3b5c";
      ctx.beginPath();
      ctx.arc(w / 2 - 6, sy, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    return ctx.restore();
  }

  if (type === "cool") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(11,20,32,0.9)";
    ctx.fill();
    ctx.save();
    ctx.rotate(t * 3.2 + seed);
    ctx.fillStyle = color;
    for (let b = 0; b < 3; b++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5, r * 0.24, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#061018";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    return ctx.restore();
  }

  if (type === "power") {
    const s = r * 1.55;
    ctx.fillStyle = "#150f04";
    rr(ctx, -s / 2, -s / 2, s, s, 4);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 6 + seed);
    ctx.beginPath();
    const k = r * 0.62;
    ctx.moveTo(k * 0.25, -k);
    ctx.lineTo(-k * 0.55, k * 0.12);
    ctx.lineTo(-k * 0.05, k * 0.12);
    ctx.lineTo(-k * 0.25, k);
    ctx.lineTo(k * 0.6, -k * 0.18);
    ctx.lineTo(k * 0.08, -k * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.75 + 0.25 * Math.sin(t * 6 + seed);
    return ctx.restore();
  }

  // fiber
  const p = (t * 1.6 + seed * 0.7) % 1;
  ctx.strokeStyle = hexA(color, 0.5 * (1 - p));
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * (0.5 + p * 0.9), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
    ctx.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
  }
  ctx.stroke();
  ctx.fillStyle = "#160a12";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

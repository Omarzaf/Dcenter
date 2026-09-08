/** Tiny procedural sound kit - no assets, created lazily after the first user gesture. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, freq: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
  }

  place() {
    this.tone(320, 0.09, "square", 0.1, 520);
    this.noise(0.07, 0.08, 1400);
  }
  deny() {
    this.tone(150, 0.12, "sawtooth", 0.07, 90);
  }
  scrap() {
    this.noise(0.22, 0.12, 700);
    this.tone(220, 0.18, "triangle", 0.07, 80);
  }
  link(size: number) {
    const base = 392;
    const steps = Math.min(5, Math.max(1, size - 2));
    for (let i = 0; i <= steps; i++) {
      this.tone(base * Math.pow(2, i / 6), 0.16, "triangle", 0.09, undefined, i * 0.045);
    }
    this.tone(base * 2, 0.3, "sine", 0.06, base * 3, 0.05);
  }
  reboot() {
    this.tone(520, 0.1, "square", 0.08, 880);
    this.tone(880, 0.14, "square", 0.06, 1320, 0.08);
  }
  event(good: boolean) {
    if (good) {
      this.tone(660, 0.1, "triangle", 0.08, 990);
      this.tone(990, 0.16, "triangle", 0.06, 1320, 0.09);
    } else {
      this.tone(200, 0.22, "sawtooth", 0.09, 120);
      this.noise(0.3, 0.07, 400);
    }
  }
  alarm() {
    this.tone(880, 0.1, "square", 0.05, 660);
  }
  phase() {
    this.tone(140, 0.4, "sawtooth", 0.07, 90);
    this.noise(0.4, 0.06, 260);
  }
  over() {
    this.noise(1.1, 0.16, 180);
    this.tone(160, 1.1, "sawtooth", 0.12, 40);
    this.tone(80, 1.3, "sine", 0.1, 32, 0.05);
  }
  start() {
    [262, 392, 523, 784].forEach((f, i) =>
      this.tone(f, 0.18, "triangle", 0.08, undefined, i * 0.07),
    );
  }
}

export const sfx = new Sfx();

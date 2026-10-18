/**
 * Som da edição gerado no próprio aparelho: efeitos sonoros (whoosh, pop,
 * impacto, sino...) e trilhas instrumentais em loop, por clima. Tudo é
 * sintetizado aqui, sem arquivos de áudio e sem direitos de terceiros.
 */

export type Sfx = "whoosh" | "swish" | "pop" | "tick" | "impact" | "chime" | "riser" | "ding" | "hit" | "sparkle" | "click";
export type Mood = "sobria" | "inspiradora" | "neutra" | "energica" | "leve";

export interface Cue {
  /** Instante (s, tempo de saída) do ataque do efeito. Para o riser, o fim da subida. */
  at: number;
  sfx: Sfx;
  gain?: number;
}

const TAU = Math.PI * 2;

function noiseGen(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Filtro de estado variável (TPT), com corte que pode variar a cada amostra. */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private g = 0;
  private k = 1;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  constructor(private rate: number) {}
  set(fc: number, q: number) {
    this.g = Math.tan((Math.PI * Math.min(fc, this.rate * 0.45)) / this.rate);
    this.k = 1 / q;
    this.a1 = 1 / (1 + this.g * (this.g + this.k));
    this.a2 = this.g * this.a1;
    this.a3 = this.g * this.a2;
  }
  run(x: number) {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    return { lp: v2, bp: v1, hp: x - this.k * v1 - v2 };
  }
}

function normalize(a: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  if (m > 0) for (let i = 0; i < a.length; i++) a[i] *= peak / m;
  return a;
}

/** Ruído varrido por um passa-banda: base do whoosh, do swish e do riser. */
function sweep(rate: number, dur: number, fc: (p: number) => number, env: (p: number) => number, q: number, seed: number) {
  const n = Math.round(dur * rate);
  const out = new Float32Array(n);
  const f = new Svf(rate);
  const rnd = noiseGen(seed);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    if (i % 16 === 0) f.set(fc(p), q);
    const { bp, lp } = f.run(rnd());
    out[i] = (bp * 0.85 + lp * 0.25) * env(p);
  }
  return out;
}

/** Gera a amostra de um efeito na taxa pedida. */
export function sfxSamples(kind: Sfx, rate: number): Float32Array {
  switch (kind) {
    case "whoosh":
      return normalize(
        sweep(
          rate,
          0.55,
          (p) => (p < 0.55 ? 280 * (2600 / 280) ** (p / 0.55) : 2600 * (700 / 2600) ** ((p - 0.55) / 0.45)),
          (p) => Math.sin(Math.PI * Math.min(1, p ** 0.75)) ** 2,
          1.4,
          7,
        ),
        0.8,
      );
    case "swish":
      return normalize(
        sweep(
          rate,
          0.24,
          (p) => 1500 * (7500 / 1500) ** p,
          (p) => Math.sin(Math.PI * p) ** 1.5,
          1.1,
          11,
        ),
        0.7,
      );
    case "riser": {
      const dur = 1.4;
      const n = Math.round(dur * rate);
      const out = sweep(rate, dur, (p) => 350 * (7000 / 350) ** p, (p) => p ** 2.2, 2.2, 23);
      let ph1 = 0;
      let ph2 = 0;
      for (let i = 0; i < n; i++) {
        const p = i / n;
        const fr = 180 * (720 / 180) ** p;
        ph1 += fr / rate;
        ph2 += (fr * 1.007) / rate;
        out[i] += (Math.sin(TAU * ph1) + Math.sin(TAU * ph2)) * 0.18 * p ** 1.6;
        if (n - i < rate * 0.03) out[i] *= (n - i) / (rate * 0.03);
      }
      return normalize(out, 0.75);
    }
    case "pop": {
      const n = Math.round(0.13 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(31);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        ph += (170 + 760 * Math.exp(-t / 0.016)) / rate;
        out[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.032) + rnd() * Math.exp(-t / 0.0018) * 0.5;
      }
      return normalize(out, 0.8);
    }
    case "tick": {
      const n = Math.round(0.035 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(5);
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        out[i] = Math.sin(TAU * 2900 * t) * Math.exp(-t / 0.006) * 0.8 + rnd() * Math.exp(-t / 0.0015) * 0.4;
      }
      return normalize(out, 0.55);
    }
    case "click": {
      const n = Math.round(0.02 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(3);
      let prev = 0;
      for (let i = 0; i < n; i++) {
        const x = rnd();
        out[i] = (x - prev) * Math.exp(-(i / rate) / 0.0025);
        prev = x;
      }
      return normalize(out, 0.5);
    }
    case "impact": {
      const n = Math.round(1.3 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(17);
      const f = new Svf(rate);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        ph += (38 + 95 * Math.exp(-t / 0.055)) / rate;
        if (i % 16 === 0) f.set(150 + 900 * Math.exp(-t / 0.05), 0.8);
        const body = Math.sin(TAU * ph) * Math.exp(-t / 0.38);
        const crack = f.run(rnd()).lp * Math.exp(-t / 0.09) * 0.9;
        out[i] = Math.tanh((body + crack) * 1.6);
      }
      return normalize(out, 0.85);
    }
    case "hit": {
      const n = Math.round(0.45 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(29);
      const f = new Svf(rate);
      f.set(2200, 1.2);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        ph += (52 + 110 * Math.exp(-t / 0.025)) / rate;
        out[i] = Math.tanh(Math.sin(TAU * ph) * Math.exp(-t / 0.13) * 1.4 + f.run(rnd()).bp * Math.exp(-t / 0.045) * 1.2);
      }
      return normalize(out, 0.8);
    }
    case "chime": {
      const n = Math.round(2.2 * rate);
      const out = new Float32Array(n);
      const note = (f0: number, start: number, amp: number) => {
        for (let i = Math.round(start * rate); i < n; i++) {
          const t = i / rate - start;
          const I = 2.4 * Math.exp(-t / 0.22);
          const a = Math.min(1, t / 0.003) * Math.exp(-t / 0.75);
          out[i] += amp * a * (Math.sin(TAU * f0 * t + I * Math.sin(TAU * f0 * 3.5 * t)) + 0.25 * Math.sin(TAU * f0 * 2 * t) * Math.exp(-t / 0.3));
        }
      };
      note(1046.5, 0, 1);
      note(1568, 0.11, 0.7);
      return normalize(out, 0.6);
    }
    case "ding": {
      const n = Math.round(1.1 * rate);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        const a = Math.min(1, t / 0.003) * Math.exp(-t / 0.32);
        out[i] = a * (Math.sin(TAU * 1760 * t) + 0.4 * Math.sin(TAU * 2637 * t) + 0.15 * Math.sin(TAU * 3520 * t));
      }
      return normalize(out, 0.55);
    }
    case "sparkle": {
      const n = Math.round(0.7 * rate);
      const out = new Float32Array(n);
      const rnd = noiseGen(41);
      for (let g = 0; g < 7; g++) {
        const start = (g / 7) * 0.4 + (rnd() * 0.5 + 0.5) * 0.04;
        const fr = 2600 + (rnd() * 0.5 + 0.5) * 2600;
        for (let i = Math.round(start * rate); i < n; i++) {
          const t = i / rate - start;
          out[i] += Math.sin(TAU * fr * t) * Math.exp(-t / 0.07) * (1 - g / 10);
        }
      }
      return normalize(out, 0.45);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Trilha                                                             */
/* ------------------------------------------------------------------ */

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface Song {
  bpm: number;
  /** Acordes (notas MIDI), um por compasso de 4 tempos. */
  chords: number[][];
  build: (s: Composer) => void;
}

/** Monta as notas de uma trilha em um buffer (seco + envio para o reverb). */
class Composer {
  dry: Float32Array;
  send: Float32Array;
  readonly beat: number;
  readonly bars: number;
  private rnd: () => number;
  constructor(
    readonly rate: number,
    readonly song: Song,
    seed: number,
    tail: number,
  ) {
    this.beat = 60 / song.bpm;
    this.bars = song.chords.length * 2;
    const len = Math.ceil((this.bars * 4 * this.beat + tail) * rate);
    this.dry = new Float32Array(len);
    this.send = new Float32Array(len);
    this.rnd = noiseGen(seed);
  }
  chord(bar: number) {
    return this.song.chords[bar % this.song.chords.length];
  }
  rand() {
    return this.rnd();
  }
  private add(start: number, n: number, gen: (i: number, t: number) => number, gain: number, wet: number) {
    const s0 = Math.round(start * this.rate);
    const end = Math.min(this.dry.length, s0 + n);
    for (let i = Math.max(0, s0); i < end; i++) {
      const v = gen(i - s0, (i - s0) / this.rate) * gain;
      this.dry[i] += v * (1 - wet * 0.5);
      this.send[i] += v * wet;
    }
  }
  /** Pad: três serras desafinadas, filtradas, com ataque lento. */
  pad(start: number, dur: number, midi: number, gain: number, attack = 0.6, release = 1.2, cutoff = 1100, wet = 0.6) {
    const f = mtof(midi);
    const det = [1, 1.004, 0.9963];
    const ph = [this.rand(), this.rand(), this.rand()];
    let y = 0;
    const a = 1 - Math.exp((-TAU * cutoff) / this.rate);
    const n = Math.round((dur + release) * this.rate);
    this.add(
      start,
      n,
      (i, t) => {
        let s = 0;
        for (let k = 0; k < 3; k++) {
          const p = ph[k] + (f * det[k] * i) / this.rate;
          s += 2 * (p - Math.floor(p + 0.5));
        }
        y += a * (s / 3 - y);
        const env = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
        return y * env;
      },
      gain,
      wet,
    );
  }
  /** Piano elétrico simples: harmônicos que decaem em velocidades diferentes. */
  keys(start: number, midi: number, gain: number, dur = 2.2, wet = 0.45) {
    const f = mtof(midi);
    const amps = [1, 0.45, 0.22, 0.12, 0.06];
    this.add(
      start,
      Math.round(dur * this.rate),
      (_i, t) => {
        let s = 0;
        for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin(TAU * f * (h + 1) * (1 + 0.0004 * h * h) * t) * Math.exp(-t / (1.3 / (h + 1)));
        return s * Math.min(1, t / 0.004) * (t > dur - 0.08 ? (dur - t) / 0.08 : 1);
      },
      gain,
      wet,
    );
  }
  /** Corda dedilhada (Karplus-Strong): violão, ukulele, harpa. */
  pluck(start: number, midi: number, gain: number, dur = 1.6, bright = 0.5, wet = 0.35) {
    const f = mtof(midi);
    const N = Math.max(2, Math.round(this.rate / f));
    const buf = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) {
      lp += (1 - bright) * (this.rand() - lp);
      buf[i] = bright * this.rand() + lp;
    }
    let idx = 0;
    const decay = 0.996 - (f > 600 ? 0.004 : 0);
    this.add(
      start,
      Math.round(dur * this.rate),
      (_i, t) => {
        const next = (idx + 1) % N;
        const v = buf[idx];
        buf[idx] = decay * 0.5 * (buf[idx] + buf[next]);
        idx = next;
        return v * (t > dur - 0.05 ? (dur - t) / 0.05 : 1);
      },
      gain,
      wet,
    );
  }
  /** Marimba: fundamental e parcial ~3,9x, com batida curta. */
  marimba(start: number, midi: number, gain: number, wet = 0.3) {
    const f = mtof(midi);
    this.add(start, Math.round(0.9 * this.rate), (_i, t) => (Math.sin(TAU * f * t) * Math.exp(-t / 0.42) + 0.35 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t / 0.06)) * Math.min(1, t / 0.002), gain, wet);
  }
  /** Serra com filtro que fecha rápido (pluck eletrônico). */
  synthPluck(start: number, midi: number, gain: number, wet = 0.3) {
    const f = mtof(midi);
    let y = 0;
    const n = Math.round(0.35 * this.rate);
    this.add(
      start,
      n,
      (i, t) => {
        const p = (f * i) / this.rate;
        const saw = 2 * (p - Math.floor(p + 0.5));
        const fc = 500 + 3800 * Math.exp(-t / 0.05);
        y += (1 - Math.exp((-TAU * fc) / this.rate)) * (saw - y);
        return y * Math.exp(-t / 0.16) * Math.min(1, t / 0.002);
      },
      gain,
      wet,
    );
  }
  bass(start: number, dur: number, midi: number, gain: number) {
    const f = mtof(midi);
    this.add(
      start,
      Math.round((dur + 0.06) * this.rate),
      (_i, t) => {
        const env = Math.min(1, t / 0.01) * (t < dur ? 0.75 + 0.25 * Math.exp(-t / 0.15) : Math.max(0, 1 - (t - dur) / 0.06));
        return Math.tanh((Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)) * 1.3) * env;
      },
      gain,
      0,
    );
  }
  kick(start: number, gain: number) {
    let ph = 0;
    this.add(
      start,
      Math.round(0.35 * this.rate),
      (_i, t) => {
        ph += (46 + 110 * Math.exp(-t / 0.028)) / this.rate;
        return Math.tanh(Math.sin(TAU * ph) * Math.exp(-t / 0.2) * 1.5);
      },
      gain,
      0,
    );
  }
  snap(start: number, gain: number, clap = false) {
    const f = new Svf(this.rate);
    f.set(1700, 1.1);
    this.add(
      start,
      Math.round(0.25 * this.rate),
      (_i, t) => {
        const burst = clap ? Math.max(Math.exp(-t / 0.008), t > 0.012 ? Math.exp(-(t - 0.012) / 0.008) : 0, t > 0.024 ? Math.exp(-(t - 0.024) / 0.06) : 0) : Math.exp(-t / 0.05);
        return f.run(this.rand()).bp * burst * 1.6;
      },
      gain,
      0.25,
    );
  }
  hat(start: number, gain: number, open = false) {
    let prev = 0;
    let smooth = 0;
    this.add(
      start,
      Math.round((open ? 0.25 : 0.06) * this.rate),
      (_i, t) => {
        const x = this.rand();
        smooth = 0.55 * (x - prev) + 0.45 * smooth;
        prev = x;
        return smooth * Math.exp(-t / (open ? 0.09 : 0.018));
      },
      gain,
      0.1,
    );
  }
  shaker(start: number, gain: number) {
    let prev = 0;
    this.add(
      start,
      Math.round(0.09 * this.rate),
      (_i, t) => {
        const x = this.rand();
        const v = x - prev;
        prev = x;
        return v * Math.min(1, t / 0.015) * Math.exp(-t / 0.035);
      },
      gain,
      0.1,
    );
  }
  /** Pulso grave (tom) para a trilha cinematográfica. */
  pulse(start: number, midi: number, gain: number) {
    const f = mtof(midi);
    this.add(start, Math.round(0.9 * this.rate), (_i, t) => Math.sin(TAU * f * t * (1 + 0.15 * Math.exp(-t / 0.04))) * Math.exp(-t / 0.3) * Math.min(1, t / 0.004), gain, 0.5);
  }
}

const SONGS: Record<Mood, Song> = {
  sobria: {
    bpm: 72,
    chords: [
      [57, 60, 64],
      [53, 57, 60, 64],
      [48, 55, 60, 64],
      [55, 59, 62, 67],
    ],
    build(s) {
      for (let bar = 0; bar < s.bars; bar++) {
        const c = s.chord(bar);
        const t0 = bar * 4 * s.beat;
        for (const n of c) s.pad(t0, 4 * s.beat, n, 0.05, 0.9, 1.4, 900, 0.7);
        s.bass(t0, 3.6 * s.beat, c[0] - 12, 0.16);
        const arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12, c[2] + 12, (c[3] ?? c[0] + 12) + 12, c[2] + 12, c[1] + 12];
        arp.forEach((n, i) => s.keys(t0 + i * s.beat * 0.5, n, i % 2 ? 0.05 : 0.07, 2.2));
      }
    },
  },
  inspiradora: {
    bpm: 80,
    chords: [
      [48, 55, 60, 64],
      [47, 55, 59, 62],
      [45, 52, 57, 60],
      [41, 53, 57, 60],
    ],
    build(s) {
      for (let bar = 0; bar < s.bars; bar++) {
        const c = s.chord(bar);
        const t0 = bar * 4 * s.beat;
        for (const n of c) s.pad(t0, 4 * s.beat, n, 0.05, 1.6, 2.2, 1300, 0.85);
        s.pad(t0, 4 * s.beat, c[0] - 12, 0.06, 1.2, 2, 380, 0.4);
        for (let b = 0; b < 4; b++) s.pulse(t0 + b * s.beat, c[0] - 12, b === 0 ? 0.2 : 0.11);
        if (bar % 2 === 0) [c[3] + 12, c[2] + 12].forEach((n, i) => s.keys(t0 + (i * 2 + 1) * s.beat, n + 12, 0.045, 2.6, 0.7));
      }
    },
  },
  neutra: {
    bpm: 94,
    chords: [
      [50, 53, 57, 60],
      [43, 53, 55, 59],
      [48, 52, 55, 59],
      [45, 52, 55, 60],
    ],
    build(s) {
      for (let bar = 0; bar < s.bars; bar++) {
        const c = s.chord(bar);
        const t0 = bar * 4 * s.beat;
        for (const n of c) s.pad(t0, 4 * s.beat, n + 12, 0.022, 0.4, 0.8, 1500, 0.5);
        const pat = [0, 2, 1, 3, 2, 1, 3, 2];
        pat.forEach((k, i) => s.pluck(t0 + i * s.beat * 0.5, c[k] + 12, 0.16, 1.4, 0.45));
        s.bass(t0, 1.8 * s.beat, c[0] - 12, 0.15);
        s.bass(t0 + 2.5 * s.beat, 1.2 * s.beat, c[0] - 12, 0.12);
        s.kick(t0, 0.35);
        s.kick(t0 + 2.5 * s.beat, 0.25);
        s.snap(t0 + s.beat, 0.12);
        s.snap(t0 + 3 * s.beat, 0.12);
        for (let h = 0; h < 8; h++) s.hat(t0 + h * s.beat * 0.5, h % 2 ? 0.025 : 0.04);
      }
    },
  },
  energica: {
    bpm: 118,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 55, 60],
      [55, 59, 62],
    ],
    build(s) {
      for (let bar = 0; bar < s.bars; bar++) {
        const c = s.chord(bar);
        const t0 = bar * 4 * s.beat;
        for (const n of c) s.pad(t0, 4 * s.beat, n + 12, 0.018, 0.08, 0.3, 2400, 0.45);
        for (let i = 0; i < 16; i++) s.synthPluck(t0 + i * s.beat * 0.25, c[[0, 1, 2, 1][i % 4]] + (i % 8 < 4 ? 12 : 24), i % 4 === 0 ? 0.09 : 0.06);
        for (let b = 0; b < 4; b++) {
          s.kick(t0 + b * s.beat, 0.42);
          s.hat(t0 + (b + 0.5) * s.beat, 0.04, true);
          s.bass(t0 + (b + 0.5) * s.beat, 0.4 * s.beat, c[0] - 12, 0.15);
        }
        s.snap(t0 + s.beat, 0.13, true);
        s.snap(t0 + 3 * s.beat, 0.13, true);
      }
    },
  },
  leve: {
    bpm: 104,
    chords: [
      [48, 52, 55, 60],
      [45, 52, 57, 60],
      [41, 53, 57, 60],
      [43, 55, 59, 62],
    ],
    build(s) {
      for (let bar = 0; bar < s.bars; bar++) {
        const c = s.chord(bar);
        const t0 = bar * 4 * s.beat;
        const mel = [c[1] + 12, c[2] + 12, c[3] + 12, c[2] + 12, c[1] + 24, c[3] + 12, c[2] + 12, c[0] + 24];
        mel.forEach((n, i) => (i % 8 !== 5 ? s.marimba(t0 + i * s.beat * 0.5, n, i % 2 ? 0.07 : 0.1) : null));
        for (const b of [1, 3]) for (let k = 0; k < c.length; k++) s.pluck(t0 + b * s.beat + k * 0.012, c[k] + 12, 0.07, 0.9, 0.7, 0.25);
        s.bass(t0, 1.6 * s.beat, c[0] - 12, 0.13);
        s.bass(t0 + 2 * s.beat, 1.6 * s.beat, c[0] - 5, 0.11);
        s.kick(t0, 0.28);
        s.kick(t0 + 2 * s.beat, 0.2);
        for (let h = 0; h < 8; h++) s.shaker(t0 + h * s.beat * 0.5, h % 2 ? 0.035 : 0.055);
        s.snap(t0 + 3 * s.beat, 0.08, true);
      }
    },
  },
};

/** Reverb de Schroeder (4 pentes + 2 passa-tudo), somado ao seco. */
function reverb(send: Float32Array, dry: Float32Array, rate: number, mix: number) {
  const k = rate / 44100;
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(Math.round(d * k)), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(Math.round(d * k)), i: 0 }));
  for (let n = 0; n < send.length; n++) {
    const x = send[n];
    let y = 0;
    for (const c of combs) {
      const out = c.buf[c.i];
      c.lp = out * 0.75 + c.lp * 0.25;
      c.buf[c.i] = x + c.lp * 0.84;
      c.i = (c.i + 1) % c.buf.length;
      y += out;
    }
    y *= 0.25;
    for (const a of aps) {
      const b = a.buf[a.i];
      const v = -0.5 * y + b;
      a.buf[a.i] = y + 0.5 * b;
      a.i = (a.i + 1) % a.buf.length;
      y = v;
    }
    dry[n] += y * mix;
  }
}

/**
 * Trilha em loop (8 compassos) de um clima. O rabo do reverb é dobrado no
 * começo para o loop emendar sem estalo. Taxa de 32 kHz: leve para o celular.
 */
export function musicLoop(mood: Mood, seed = 1, rate = 32_000): { data: Float32Array; rate: number } {
  const song = SONGS[mood] ?? SONGS.sobria;
  const tail = 2.5;
  const s = new Composer(rate, song, seed, tail);
  song.build(s);
  reverb(s.send, s.dry, rate, mood === "inspiradora" ? 0.55 : mood === "sobria" ? 0.42 : 0.28);
  const loopLen = Math.round(s.bars * 4 * s.beat * rate);
  const out = s.dry.slice(0, loopLen);
  for (let i = loopLen; i < s.dry.length; i++) out[i - loopLen] += s.dry[i];
  // master: corta subgrave inútil e limita com suavidade
  let hp = 0;
  let prev = 0;
  const a = Math.exp((-TAU * 35) / rate);
  for (let i = 0; i < out.length; i++) {
    hp = a * (hp + out[i] - prev);
    prev = out[i];
    out[i] = Math.tanh(hp * 1.2);
  }
  return { data: normalize(out, 0.85), rate };
}

/** Clima da trilha de cada estilo de edição. */
export const STYLE_MOOD: Record<string, Mood> = {
  institucional: "sobria",
  cinematografico: "inspiradora",
  dinamico: "neutra",
  performance: "energica",
  descontraido: "leve",
};

export interface SoundtrackPlan {
  music: { mood: Mood; seed: number } | null;
  cues: Cue[];
  /** Ganho das trilhas e efeitos (0 a 1). */
  sfxLevel: number;
  /** Onde há voz, no tempo de saída (para abaixar a trilha). */
  voice: { start: number; end: number }[];
  introDur: number;
  outroDur: number;
  total: number;
}

function toBuffer(ctx: BaseAudioContext, data: Float32Array, rate: number) {
  const b = ctx.createBuffer(1, data.length, rate);
  b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  return b;
}

/**
 * Agenda a trilha (com "ducking": abaixa quando há voz) e os efeitos
 * sonoros em um contexto de áudio, ligando tudo em `out`.
 */
export function scheduleSoundtrack(ctx: BaseAudioContext, out: AudioNode, plan: SoundtrackPlan) {
  if (plan.music) {
    const loop = musicLoop(plan.music.mood, plan.music.seed);
    const src = ctx.createBufferSource();
    src.buffer = toBuffer(ctx, loop.data, loop.rate);
    src.loop = true;
    const g = ctx.createGain();
    const LOUD = 0.24;
    const UNDER = 0.075;
    const GAP = 0.15;
    const p = g.gain;
    p.setValueAtTime(0, 0);
    p.linearRampToValueAtTime(plan.introDur > 0 ? LOUD * 1.15 : GAP, 0.25);
    const bodyStart = plan.introDur;
    const bodyEnd = plan.total - plan.outroDur;
    let last = bodyStart;
    p.setTargetAtTime(GAP, Math.max(0.3, bodyStart - 0.15), 0.12);
    for (const v of plan.voice) {
      if (v.end <= bodyStart || v.start >= bodyEnd) continue;
      if (v.start - last > 0.9) p.setTargetAtTime(GAP, last + 0.2, 0.15);
      p.setTargetAtTime(UNDER, Math.max(bodyStart, v.start - 0.08), 0.05);
      last = v.end;
    }
    p.setTargetAtTime(plan.outroDur > 0 ? LOUD : GAP, Math.max(last + 0.15, bodyEnd - 0.1), 0.2);
    p.setTargetAtTime(0, Math.max(0, plan.total - 0.9), 0.25);
    src.connect(g);
    g.connect(out);
    src.start(0);
    src.stop(plan.total + 0.1);
  }
  if (plan.sfxLevel > 0 && plan.cues.length) {
    const rate = ctx.sampleRate;
    const cache = new Map<Sfx, AudioBuffer>();
    for (const c of plan.cues) {
      let buf = cache.get(c.sfx);
      if (!buf) {
        buf = toBuffer(ctx, sfxSamples(c.sfx, rate), rate);
        cache.set(c.sfx, buf);
      }
      const start = c.sfx === "riser" ? c.at - buf.duration : c.sfx === "whoosh" ? c.at - 0.3 : c.at;
      if (start + buf.duration < 0 || start > plan.total) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = plan.sfxLevel * (c.gain ?? 1);
      src.connect(g);
      g.connect(out);
      if (start >= 0) src.start(start);
      else src.start(0, -start);
    }
  }
}

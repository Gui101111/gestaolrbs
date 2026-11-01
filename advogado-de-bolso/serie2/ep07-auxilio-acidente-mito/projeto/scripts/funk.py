"""Trilha ORIGINAL da série 2 (comédia "mito"): funk 130 BPM, intro de terror (Halloween) e forró/baião.

Tudo sintetizado por código (sem samples, sem músicas de terceiros), então é livre de direitos.
Seções = cenas (cortes derivados da narração, mesma regra de src/utils/timing.ts).
scripts/music-plan.json:
  {"seconds": 62, "gap": 0.35, "endcard": 1.73,
   "moods": ["spooky", "funk", "break", "build", "drop", "forro", "end", ...],   # uma por cena
   "hits": [["s4", 0, "stop"], ["s6", 3, "hit"], ["s6", 3, "riser"]]}           # acentos na palavra
Uso: python scripts/funk.py -> public/audio/music.wav
"""

import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "music.wav"
SR = 48000
rng = np.random.default_rng(7)

VO = json.loads((ROOT / "src" / "data" / "vo.json").read_text(encoding="utf-8"))
PLAN = json.loads((ROOT / "scripts" / "music-plan.json").read_text(encoding="utf-8"))
KEYS = list(VO.keys())
VO_START = {}
_t = 0.45
for _i, _k in enumerate(KEYS):
    VO_START[_k] = _t
    _t += VO[_k]["seconds"] + (PLAN["gap"] if _i < len(KEYS) - 1 else 0)
DUR = float(PLAN["seconds"])
N = int(SR * DUR)
S = [0.0] + [VO_START[k] - 0.25 for k in KEYS[1:]] + [DUR]
END = DUR - PLAN.get("endcard", 1.73)


def word(k, i):
    return VO_START[k] + VO[k]["words"][i]["start"]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(max(1, int(d * SR))) / SR


def stereo(x, p=0.0):
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], axis=1)


def place(bus, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(bus) or i < 0:
        return
    if sig.ndim == 1:
        sig = stereo(sig)
    j = min(i + len(sig), len(bus))
    bus[i:j] += sig[: j - i] * gain


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x, axis=0)


def env(d, a, r):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)


def saw(f, d, ph0=None):
    t = tt(d)
    p = ((rng.random() if ph0 is None else ph0) + t * f) % 1.0
    return 2 * p - 1


def ir(length, decay, damp=6000):
    t = tt(length)
    h = rng.standard_normal((len(t), 2)) * np.exp(-t / decay)[:, None]
    h = lp(h, damp)
    return h / np.sqrt(np.sum(h**2))


def verb(x, h):
    return np.stack([fftconvolve(x[:, c], h[:, c])[: len(x)] for c in range(2)], axis=1)


# ---------------------------------------------------------------- instrumentos
def k808(m=33, d=0.55, punch=1.0):
    t = tt(d)
    f = hz(m) * (1 + 2.5 * punch * np.exp(-t / 0.018))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * 0.55))
    return np.tanh(y * 2.2) * 0.85


def clap(g=1.0):
    t = tt(0.25)
    n = rng.standard_normal(len(t))
    e = sum(np.where(t >= o, np.exp(-(t - o) / 0.005), 0) for o in (0.0, 0.009, 0.018)) + np.where(t >= 0.018, np.exp(-(t - 0.018) / 0.07), 0) * 0.6
    return bp(n * e, 900, 6000) * 0.8 * g


def tom(m=50, d=0.22):
    # "tamborzão": tambor grave com pele (seno com queda de altura + ataque de ruído)
    t = tt(d)
    f = hz(m) * (1 + 0.6 * np.exp(-t / 0.02))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) + bp(rng.standard_normal(len(t)), 200, 1600) * np.exp(-t / 0.01) * 0.5
    return y * 0.7


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t / (0.06 if open_ else 0.012)) * 0.3


def stab(m, d=0.16):
    # "tuin" de funk: serra desafinada, filtro fechando rápido
    t = tt(d)
    y = sum(saw(hz(m) * (1 + dt), d) for dt in (-0.012, 0.0, 0.013)) / 3
    y = lp(y, 2600) * np.exp(-t / 0.07) * (1 - np.exp(-t / 0.002))
    return y * 0.55


def bell(m, d=1.6):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t + 1.4 * np.exp(-t / 0.4) * np.sin(2 * np.pi * f * 3.5 * t))
    return y * np.exp(-t / 0.6) * (1 - np.exp(-t / 0.002)) * 0.3


def musicbox(m, d=1.1):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) + 0.3 * np.sin(2 * np.pi * f * 5.04 * t) * np.exp(-t / 0.08)
    return y * (1 - np.exp(-t / 0.001)) * 0.3


def organ(chord, d, gain=1.0):
    t = tt(d)
    y = np.zeros(len(t))
    for m in chord:
        for h, g in ((1, 1.0), (2, 0.5), (4, 0.25)):
            y += np.sin(2 * np.pi * hz(m) * h * t) * g
    trem = 1 + 0.25 * np.sin(2 * np.pi * 5.2 * t)
    return y / (len(chord) * 1.75) * trem * env(d, 0.25, 0.5) * 0.4 * gain


def accordion(chord, d, gain=1.0):
    out = np.zeros(int(d * SR))
    t = tt(d)
    for m in chord:
        for dt in (-0.006, 0.006):
            out += saw(hz(m) * (1 + dt), d)
    out = lp(out / (2 * len(chord)), 2400) * (1 + 0.18 * np.sin(2 * np.pi * 6 * t)) * env(d, 0.03, 0.06)
    return out * 0.5 * gain


def zabumba(low=True):
    t = tt(0.35 if low else 0.1)
    if low:
        f = 70 * (1 + 0.8 * np.exp(-t / 0.015))
        return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * 1.8) * 0.8
    return bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t / 0.02) * 0.35  # bacalhau (vareta)


def triangle(open_=False):
    d = 0.35 if open_ else 0.06
    t = tt(d)
    y = sum(np.sin(2 * np.pi * f * t) for f in (3150, 4420, 6110)) / 3
    return y * np.exp(-t / (0.12 if open_ else 0.015)) * 0.18


def riser(d):
    t = tt(d)
    p = t / d
    n = hp(rng.standard_normal((len(t), 2)), 500)
    tone = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (p * 2.5)) / SR) * 0.18
    return (lp(n, 1200 + 7000 * p.mean()) * 0.45 + tone[:, None]) * (p**2)[:, None]


def impact():
    t = tt(1.8)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.5)
    air = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.1) * 0.35
    return np.tanh((boom + air) * 1.4) * 0.8


# ---------------------------------------------------------------- arranjo
drums = np.zeros((N, 2))
low = np.zeros((N, 2))
mel = np.zeros((N, 2))
fx = np.zeros((N, 2))
kicks = []

FUNK_BPM = 130
FB = 60 / FUNK_BPM
STEP = FB / 4  # semicolcheia
# progressão menor (Lá menor): Am F G Em — tuin nas cabeças "3+3+2"
FUNK_PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (55, [55, 59, 62]), (52, [52, 55, 59])]
KICK_STEPS = [0, 3, 6, 10, 11]
CLAP_STEPS = [4, 12]
TOM_STEPS = {2: 50, 7: 47, 9: 52, 13: 50, 14: 45}
STAB_STEPS = [0, 3, 6, 8, 11, 14]


def funk(st, en, full=True, filtered=False):
    bar = 0
    t0 = st
    while t0 < en - 0.05:
        root, chord = FUNK_PROG[bar % len(FUNK_PROG)]
        for s in range(16):
            ts = t0 + s * STEP
            if ts >= en - 0.02:
                break
            if s in KICK_STEPS:
                place(low, stereo(k808(root - 24, 0.42 if s in (10, 11) else 0.55)), ts, 0.8 if full else 0.55)
                kicks.append((ts, 1.0))
            if full and s in CLAP_STEPS:
                place(drums, stereo(clap()), ts, 0.75)
            if full and s in TOM_STEPS:
                place(drums, stereo(tom(TOM_STEPS[s]), -0.25 if s % 2 else 0.25), ts, 0.55)
            if s % 2 == 0:
                place(drums, stereo(hat(s in (6, 14)), 0.35), ts, 0.5 if full else 0.3)
            if s in STAB_STEPS:
                n = chord[(s // 3) % 3] + 12
                sig = stab(n)
                if filtered:
                    sig = lp(sig, 700)
                place(mel, stereo(sig, (-0.3, 0.3)[s % 2]), ts, 0.42)
        t0 += 16 * STEP
        bar += 1


def spooky(st, en):
    # órgão menor com trêmulo + caixinha de música + batida de coração
    chords = [[45, 52, 57, 60], [44, 50, 53, 59]]
    t0, k = st, 0
    while t0 < en - 0.05:
        d = min(2 * FB * 2, en - t0)
        place(mel, stereo(organ(chords[k % 2], d + 0.4)), t0, 0.9)
        t0 += d
        k += 1
    notes = [81, 84, 88, 87, 84, 81, 80, 76]
    for i, t1 in enumerate(np.arange(st + 0.05, en - 0.1, FB)):
        place(mel, stereo(musicbox(notes[i % len(notes)]), 0.3 * ((-1) ** i)), t1, 0.55)
    for t1 in np.arange(st + 0.1, en - 0.1, FB * 2):
        place(low, stereo(k808(28, 0.3, 0.4)), t1, 0.5)
        place(low, stereo(k808(28, 0.3, 0.4)), t1 + 0.22, 0.35)


def build(st, en):
    # caixa acelerando + riser, sem grave (prepara o "drop")
    d = en - st
    place(fx, riser(d), st, 0.55)
    t0, step = st, FB
    while t0 < en - 0.03:
        place(drums, stereo(clap(0.6 + 0.4 * (t0 - st) / max(d, 0.1))), t0, 0.5)
        frac = (t0 - st) / max(d, 0.1)
        step = FB if frac < 0.35 else FB / 2 if frac < 0.7 else FB / 4
        t0 += step


FORRO_BPM = 118
QB = 60 / FORRO_BPM
FORRO_PROG = [(55, [55, 59, 62]), (48, [52, 55, 60]), (50, [54, 57, 60]), (55, [55, 59, 62])]
FORRO_MELODY = [74, 76, 77, 79, 77, 76, 74, 71, 72, 74, 72, 71, 69, 71, 67, 67]


def forro(st, en, melody=True):
    bar, t0 = 0, st
    while t0 < en - 0.05:
        root, chord = FORRO_PROG[bar % len(FORRO_PROG)]
        bar_d = 2 * QB  # baião em 2/4
        for s in range(8):
            ts = t0 + s * QB / 4
            if ts >= en - 0.02:
                break
            if s in (0, 3):
                place(low, stereo(zabumba(True)), ts, 0.75)
                kicks.append((ts, 0.7))
            if s in (4, 6):
                place(drums, stereo(zabumba(False), -0.2), ts, 0.6)
            place(drums, stereo(triangle(s % 4 == 3), 0.4), ts, 0.7)
        # baixo da sanfona + acordes no contratempo
        place(low, stereo(lp(saw(hz(root - 12), QB * 0.8), 300) * env(QB * 0.8, 0.01, 0.1) * 0.5), t0, 0.7)
        place(low, stereo(lp(saw(hz(root - 5), QB * 0.6), 300) * env(QB * 0.6, 0.01, 0.1) * 0.5), t0 + QB * 0.75, 0.6)
        place(mel, stereo(accordion(chord, QB * 0.45), -0.2), t0 + QB * 0.5, 0.6)
        place(mel, stereo(accordion(chord, QB * 0.45), -0.2), t0 + QB * 1.5, 0.6)
        if melody:
            for j in range(4):
                n = FORRO_MELODY[(bar * 4 + j) % len(FORRO_MELODY)]
                place(mel, stereo(accordion([n], QB * 0.48, 0.9), 0.25), t0 + j * QB / 2, 0.55)
        t0 += bar_d
        bar += 1


for i, mood in enumerate(PLAN["moods"]):
    st, en = S[i], min(S[i + 1], END) if mood != "end" else S[i + 1]
    if mood == "spooky":
        spooky(st, en)
    elif mood == "funk":
        funk(st, en, full=True)
    elif mood == "light":
        funk(st, en, full=False, filtered=True)
    elif mood == "break":
        spooky(st, en)
        place(fx, stereo(impact()), st + 0.05, 0.45)
    elif mood == "build":
        build(st, en)
    elif mood == "drop":
        place(fx, stereo(impact()), st, 0.7)
        funk(st, en, full=True)
    elif mood == "forro":
        forro(st, en)
    elif mood == "forro-light":
        forro(st, en, melody=False)
    elif mood == "end":
        style = PLAN.get("style", "funk")
        (forro if style == "forro" else funk)(st, END)
        place(fx, stereo(impact()), END, 0.55)
        for k, m in enumerate([76, 79, 84, 88]):
            place(mel, stereo(bell(m, 2.2), -0.5 + 0.33 * k), END + 0.04 * k, 0.5)

for k, idx, kind in PLAN.get("hits", []):
    t0 = word(k, idx)
    if kind == "hit":
        place(fx, stereo(impact()), t0, 0.6)
    elif kind == "riser":
        place(fx, riser(1.4), t0 - 1.4, 0.5)
    elif kind == "bells":
        for j, m in enumerate([76, 79, 84, 88]):
            place(mel, stereo(bell(m, 2.0), -0.5 + 0.33 * j), t0 + 0.04 * j, 0.45)
    elif kind == "stop":
        # "parada" cômica: silencia a batida por ~0,55 s a partir da palavra
        i0, i1 = int(t0 * SR), int((t0 + 0.55) * SR)
        for bus in (drums, low, mel):
            bus[i0:i1] *= 0.0

# ---------------------------------------------------------------- mixagem
sc = np.ones(N)
tf = np.arange(N) / SR
for k, depth in kicks:
    i = int(k * SR)
    seg = tf[i : i + int(0.25 * SR)] - k
    sc[i : i + len(seg)] = np.minimum(sc[i : i + len(seg)], 1 - 0.4 * depth * np.exp(-seg / 0.08))
sc = lp(sc, 40)
mel *= sc[:, None]
wet = verb(mel * 0.35 + fx * 0.25 + drums * 0.06, ir(1.8, 0.45))
mix = drums * 0.75 + low * 0.95 + mel * 0.85 + fx * 0.7 + wet * 0.8
mix = hp(mix, 30)
mix *= (np.clip((DUR - tf) / 0.9, 0, 1) ** 1.5)[:, None]
mix = np.tanh(mix * 1.15)
mix *= 0.89 / np.max(np.abs(mix))
OUT.parent.mkdir(parents=True, exist_ok=True)
sf.write(OUT, mix.astype(np.float32), SR, subtype="PCM_16")
print(f"funk: {OUT} ({DUR:.1f}s)")

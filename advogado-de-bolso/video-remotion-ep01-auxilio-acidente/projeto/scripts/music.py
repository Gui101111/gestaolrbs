"""Trilha do episódio auxílio-acidente (derivada do MODELO de trilha — este arranjo é o do exemplo "poço artesiano"; adapte antes de usar:
  1. DUR = duração do vídeo; S = início (s) de cada cena = SCENE_FRAMES de src/utils/timing.ts / 30.
  2. Troque os momentos-chave (DRILL_START, JET, PUMP...) pelos do seu roteiro (frames/30).
  3. Reescreva a seção "arranjo" com uma intenção por cena (calma, tensão, crescendo, resolução).
Os instrumentos (marimba, pad, baixo, bumbo, sinos, riser) e a mixagem com sidechain são reutilizáveis.

Sintetiza a trilha instrumental (didática e curiosa, 100 BPM, Fá maior, 45 s).

Tudo é gerado por código (sem samples), então a trilha é livre de direitos.
As seções seguem os cortes de src/utils/timing.ts (derivados da narração):
  intro curiosa -> descoberta -> perfuração (groove) -> pressão (tensão) ->
  subida da água (crescendo até o jorro) -> comparação -> distribuição -> resolução.

Uso:
    python scripts/music.py          -> public/audio/music.wav
"""

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "music.wav"

SR = 48000
DUR = 67.0
N = int(SR * DUR)
BPM = 104
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(12)

# Cortes e momentos-chave derivados da narração real (mesma regra de src/utils/timing.ts).
import json as _json

_VO = _json.loads((ROOT / "src" / "data" / "vo.json").read_text(encoding="utf-8"))
_KEYS = [f"s{i}" for i in range(1, 14)]
VO_START = {}
_t = 0.45
for _k in _KEYS:
    VO_START[_k] = _t
    _t += _VO[_k]["seconds"] + 0.35
S = [0.0] + [VO_START[k] - 0.25 for k in _KEYS[1:]]


def word(k, i):
    return VO_START[k] + _VO[k]["words"][i]["start"]


INSS = word("s1", 12)
TODO_MES = word("s1", 13)
CERTINHO = word("s2", 8)
CAIU = word("s3", 11)
QUEBRADA = word("s4", 2)
DEDOS = word("s5", 16)
REVEAL = word("s6", 5)
PERICIA = word("s7", 25)
MELHOR = word("s8", 2)
METADE = word("s9", 5)
FORA = word("s12", 6)
SHARE = word("s13", 3)
END = S[12] + 7.23 - 1.7
CH = {
    "F": [53, 57, 60, 65],
    "Dm": [50, 53, 57, 62],
    "Bb": [46, 50, 53, 58],
    "C": [48, 52, 55, 60],
    "Gm": [43, 50, 55, 58],
    "A": [45, 49, 52, 57],
    "Fadd9": [53, 57, 60, 67],
}
ROOT_NOTE = {"F": 41, "Dm": 38, "Bb": 34, "C": 36, "Gm": 31, "A": 33, "Fadd9": 41}
MAJOR = ["F", "Dm", "Bb", "C"]
TENSE = ["Dm", "Bb", "Gm", "A"]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def stereo(x, p=0.0):
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], axis=1)


def place(bus, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(bus):
        return
    if sig.ndim == 1:
        sig = stereo(sig)
    j = min(i + len(sig), len(bus))
    bus[i:j] += sig[: j - i] * gain


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def env(d, a, r):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0, 1)


def saw(f, d):
    t = tt(d)
    p = (rng.random() + t * f) % 1.0
    return 2 * p - 1


def ir(length, decay, damp=6500):
    t = tt(length)
    h = rng.standard_normal((len(t), 2)) * np.exp(-t / decay)[:, None]
    h = lp(h, damp)
    h[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return h / np.sqrt(np.sum(h**2))


def verb(x, h):
    return np.stack([fftconvolve(x[:, c], h[:, c])[: len(x)] for c in range(2)], axis=1)


# ---------------------------------------------------------------- instrumentos
def marimba(m, d=0.9, bright=1.0):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.35 * bright * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.06) + 0.12 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t / 0.02)
    return y * (1 - np.exp(-t / 0.0015)) * 0.4


def pluck(m, d=0.4):
    t = tt(d)
    f = hz(m)
    y = sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (7 + 4 * k)) for k in range(1, 9))
    return y * (1 - np.exp(-t / 0.002)) * 0.32


def pad(chord, d, cutoff=1500, gain=1.0):
    out = np.zeros((int(d * SR), 2))
    for i, m in enumerate(chord):
        for v in (-0.08, 0.08):
            out += stereo(saw(hz(m + v), d), -0.6 + 1.2 * i / max(1, len(chord) - 1))
    return lp(out / (2 * len(chord)), cutoff) * env(d, 0.5, 0.8)[:, None] * gain


def bass(m, d):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
    return np.tanh(y * 1.3) * env(d, 0.01, 0.12) * 0.5


def kick(g=1.0):
    t = tt(0.4)
    f = 48 + 100 * np.exp(-t / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    return np.tanh(y * 1.5) * 0.8 * g


def shaker():
    t = tt(0.09)
    return hp(rng.standard_normal(len(t)), 6000, 4) * np.exp(-t / 0.025) * 0.35


def clap():
    t = tt(0.3)
    n = rng.standard_normal(len(t))
    e = sum(np.where(t >= o, np.exp(-(t - o) / 0.006), 0) for o in (0.0, 0.01, 0.02)) + np.where(t >= 0.02, np.exp(-(t - 0.02) / 0.1), 0) * 0.5
    return sosfilt(butter(2, [1000, 5000], "band", fs=SR, output="sos"), n * e) * 0.7


def bell(m, d=2.2):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t + 1.6 * np.exp(-t / 0.5) * np.sin(2 * np.pi * f * 3.5 * t))
    return y * np.exp(-t / 0.8) * (1 - np.exp(-t / 0.002)) * 0.28


def sweep_lp(x, cut, block=512):
    out = np.zeros_like(x)
    zi = None
    for b in range(0, len(x), block):
        sos = butter(2, float(np.clip(cut[min(b, len(cut) - 1)], 40, SR * 0.45)), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        out[b : b + block], zi = sosfilt(sos, x[b : b + block], axis=0, zi=zi)
    return out


def riser(d):
    t = tt(d)
    p = t / d
    n = hp(rng.standard_normal((len(t), 2)), 400)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (p * 2)) / SR) * 0.15
    return (sweep_lp(n, 600 + 8000 * p**2) * 0.5 + tone[:, None]) * (p**2)[:, None]


def soft_hit(size=1.0):
    t = tt(2.0)
    boom = np.sin(2 * np.pi * np.cumsum(40 + 70 * np.exp(-t / 0.08)) / SR) * np.exp(-t / (0.5 * size))
    air = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.12) * 0.3
    return np.tanh((boom + air) * 1.2) * 0.7


# ---------------------------------------------------------------- arranjo
drums = np.zeros((N, 2))
low = np.zeros((N, 2))
pads = np.zeros((N, 2))
leads = np.zeros((N, 2))
fx = np.zeros((N, 2))
kicks = []


def chord_at(t, prog, start):
    return prog[int((t - start) // BAR) % len(prog)]


def section_pads(start, end, prog, cutoff, gain):
    t0 = start
    while t0 < end - 0.05:
        d = min(BAR, end - t0)
        name = chord_at(t0, prog, start)
        place(pads, pad(CH[name], d + 0.6, cutoff, gain), t0, 1.0)
        t0 += BAR


def arps(start, end, prog, step, pattern, gain, inst=marimba, octave=12):
    k = 0
    for t0 in np.arange(start, end - 0.02, step):
        name = chord_at(t0, prog, start)
        n = CH[name][pattern[k % len(pattern)] % 4] + octave
        place(leads, stereo(inst(n), (-0.35, 0.35)[k % 2]), t0, gain)
        k += 1


def basses(start, end, prog, pattern, gain):
    for t0 in np.arange(start, end - 0.02, BEAT / 2):
        k = int(round((t0 - start) / (BEAT / 2)))
        if not pattern[k % len(pattern)]:
            continue
        name = chord_at(t0, prog, start)
        place(low, stereo(bass(ROOT_NOTE[name], BEAT * 0.45)), t0, gain)


def groove(start, end, kick_g, hat_g, clap_g=0.0):
    for t0 in np.arange(start, end - 0.02, BEAT):
        k = int(round((t0 - start) / BEAT))
        if k % 2 == 0 and kick_g > 0:
            place(drums, kick(kick_g), t0, 1.0)
            kicks.append((t0, kick_g))
        if k % 2 == 1 and clap_g > 0:
            place(drums, clap(), t0, clap_g)
        for sub in (0.0, 0.5):
            place(drums, stereo(shaker(), 0.3 if sub else -0.2), t0 + sub * BEAT, hat_g * (1.0 if sub else 0.6))


# 1) gancho — energia desde o 1º segundo
section_pads(S[0], S[1], MAJOR, 1800, 0.7)
arps(S[0], S[1], MAJOR, BEAT / 2, [0, 2, 3, 1, 2, 3, 1, 2], 0.42)
groove(S[0] + 0.2, S[1], 0.7, 0.55, 0.3)
basses(S[0], S[1], MAJOR, [1, 0, 1, 1, 0, 1, 1, 0], 0.55)
place(fx, stereo(soft_hit(0.9)), INSS, 0.45)
for k, m in enumerate([77, 81, 84]):
    place(leads, stereo(bell(m, 1.6), -0.4 + 0.4 * k), TODO_MES + 0.04 * k, 0.22)

# 2) apresentação — groove leve
section_pads(S[1], S[2], MAJOR, 1700, 0.65)
arps(S[1], S[2], MAJOR, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.36)
groove(S[1], S[2], 0.55, 0.5, 0.3)
basses(S[1], S[2], MAJOR, [1, 0, 0, 1, 0, 1, 0, 0], 0.5)
place(leads, stereo(bell(84, 1.4), 0.2), CERTINHO, 0.2)

# 3) escada e queda — tensão crescente e corte seco no tombo
section_pads(S[2], CAIU, TENSE, 1200, 0.75)
arps(S[2], CAIU - 0.2, TENSE, BEAT / 4, [0, 1, 2, 3], 0.22, inst=pluck, octave=12)
place(fx, riser(CAIU - S[2] - 0.3), S[2], 0.35)
place(fx, stereo(soft_hit(1.3)), CAIU, 0.6)

# 4) mão quebrada / afastado — pulso grave
section_pads(CAIU + 0.4, S[4], TENSE, 900, 0.8)
for t0 in np.arange(CAIU + 0.4, S[4] - 0.05, BEAT):
    name = chord_at(t0, TENSE, CAIU)
    place(low, stereo(bass(ROOT_NOTE[name], BEAT * 0.8)), t0, 0.45)
place(leads, stereo(pluck(62, 0.8), 0), QUEBRADA, 0.3)

# 5) volta ao trabalho (leve) e sequela (menor)
section_pads(S[4], DEDOS - 0.5, MAJOR, 1600, 0.6)
arps(S[4], DEDOS - 0.5, MAJOR, BEAT / 2, [0, 2, 1, 3], 0.32)
groove(S[4], DEDOS - 0.6, 0.5, 0.45, 0.2)
section_pads(DEDOS - 0.5, S[5], TENSE, 900, 0.8)
place(leads, stereo(pluck(55, 0.9), 0), DEDOS, 0.32)
place(fx, riser(REVEAL - (DEDOS + 0.4)), DEDOS + 0.4, 0.4)

# 6) revelação — impacto e sinos
place(fx, stereo(soft_hit(1.3)), REVEAL, 0.65)
for k, m in enumerate([77, 81, 84, 89]):
    place(leads, stereo(bell(m, 2.2), -0.5 + 0.33 * k), REVEAL + 0.04 * k, 0.28)

# 7–11) explicação — groove contínuo
for i, prog in [(6, MAJOR), (7, ["Bb", "C", "F", "Dm"]), (8, MAJOR), (9, MAJOR), (10, ["Bb", "C", "F", "Dm"])]:
    st = REVEAL if i == 6 else S[i]
    section_pads(st, S[i + 1], prog, 2000, 0.65)
    arps(st, S[i + 1], prog, BEAT / 2, [0, 2, 3, 1, 2, 3, 1, 2], 0.34)
    groove(st + 0.1, S[i + 1] - 0.05, 0.65, 0.5, 0.3)
    basses(st, S[i + 1], prog, [1, 0, 1, 1, 0, 1, 1, 0], 0.55)
place(fx, stereo(soft_hit(0.9)), PERICIA, 0.45)
place(leads, stereo(bell(88, 1.6), 0.2), MELHOR, 0.22)
place(fx, stereo(soft_hit(1.0)), METADE, 0.5)

# 12) de fora — respiro menor
section_pads(S[11], S[12], ["Dm", "A"], 1000, 0.75)
place(leads, stereo(pluck(57, 0.9), 0), FORA, 0.3)

# 13) final — resolução, depois cartão
section_pads(S[12], DUR, ["F", "Bb", "C", "F"], 2200, 0.75)
arps(S[12], END, MAJOR, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.32)
groove(S[12], END, 0.6, 0.45, 0.25)
basses(S[12], END, MAJOR, [1, 0, 1, 0, 1, 0, 1, 1], 0.5)
place(leads, stereo(bell(84, 1.8), 0.2), SHARE, 0.22)
place(fx, stereo(soft_hit(1.2)), END, 0.5)
place(pads, pad(CH["Fadd9"], DUR - END, 2400, 1.0), END, 1.0)
for k, m in enumerate([77, 81, 84, 88, 91]):
    place(leads, stereo(bell(m, 2.6), -0.6 + 0.3 * k), END + 0.05 * k, 0.24)

# ---------------------------------------------------------------- mixagem
sc = np.ones(N)
tf = np.arange(N) / SR
for k, depth in kicks:
    i = int(k * SR)
    seg = tf[i : i + int(0.3 * SR)] - k
    sc[i : i + len(seg)] = np.minimum(sc[i : i + len(seg)], 1 - 0.45 * depth * np.exp(-seg / 0.09))
sc = lp(sc, 40)
pads *= sc[:, None]
low *= (sc**0.5)[:, None]

delay = int(BEAT * 0.75 * SR)
echo = np.zeros_like(leads)
echo[delay:, 0] = leads[:-delay, 1] * 0.28
echo[2 * delay :, 1] = leads[: -2 * delay, 0] * 0.18
leads = leads + lp(echo, 4000)

wet = verb(pads * 0.3 + leads * 0.45 + fx * 0.3, ir(2.6, 0.7)) * 0.8 + verb(drums * 0.08, ir(0.8, 0.18))
mix = drums * 0.7 + low * 0.9 + pads * 0.9 + leads * 0.85 + fx * 0.7 + wet
mix = hp(mix, 28)
mix *= (np.clip((DUR - tf) / 0.9, 0, 1) ** 1.5)[:, None]
mix = np.tanh(mix * 1.1)
mix *= 0.89 / np.max(np.abs(mix))
OUT.parent.mkdir(parents=True, exist_ok=True)
sf.write(OUT, mix.astype(np.float32), SR, subtype="PCM_16")
print(f"music: {OUT} ({DUR:.1f}s)")

#!/usr/bin/env python3
"""
Gera três trilhas de fundo provisórias, sintetizadas do zero (sem direitos de
terceiros): sóbria, inspiradora e neutra. São pads suaves em loop de ~64 s,
pensados para ficar 20 dB abaixo da voz. Troque por faixas licenciadas quando
quiser: basta subir arquivos em editing-assets/music/<tom>/.

  python3 sandbox/gerar_trilhas.py --saida supabase/assets/music
"""

from __future__ import annotations

import argparse
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100

NOTAS = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def freq(nota: str, oitava: int) -> float:
    return 440.0 * 2 ** ((NOTAS[nota] + 12 * (oitava + 1) - 69) / 12)


def acorde(raiz: str, menor: bool, oitava: int = 3) -> list[float]:
    base = NOTAS[raiz] + 12 * (oitava + 1)
    intervalos = [0, 3 if menor else 4, 7, 12]
    return [440.0 * 2 ** ((base + i - 69) / 12) for i in intervalos]


TRILHAS = {
    # tom: (progressão, segundos por acorde, brilho)
    "sobria": ([("A", True), ("F", False), ("C", False), ("G", False)], 8.0, 0.35),
    "inspiradora": ([("C", False), ("G", False), ("A", True), ("F", False)], 4.0, 0.6),
    "neutra": ([("D", False), ("A", False), ("B", True), ("G", False)], 6.0, 0.45),
}


def pad(freqs: list[float], dur: float, brilho: float, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(int(SR * dur)) / SR
    sinal = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):  # leve desafinação = coro
            fase = rng.uniform(0, 2 * np.pi)
            for h, amp in ((1, 1.0), (2, 0.35 * brilho), (3, 0.15 * brilho)):
                sinal += amp * np.sin(2 * np.pi * (f * h + det) * t + fase)
    # baixo uma oitava abaixo da fundamental
    sinal += 0.9 * np.sin(2 * np.pi * (freqs[0] / 2) * t)
    # envelope suave (ataque/relaxamento longos) e tremolo lento
    env = np.minimum(1, t / 1.6) * np.minimum(1, (dur - t) / 1.6)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.18 * t)
    return sinal * env * trem


def reverb(x: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    n = int(SR * 2.2)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * 0.55))
    ir /= np.sqrt(np.sum(ir**2))
    tam = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, tam) * np.fft.rfft(ir, tam), tam)[: len(x)]
    return 0.75 * x + 0.35 * y


def gerar(nome: str, saida: Path) -> Path:
    prog, por_acorde, brilho = TRILHAS[nome]
    rng = np.random.default_rng(abs(hash(nome)) % 2**32)
    sobreposicao = 1.6
    total = int(SR * (len(prog) * por_acorde * 2 + sobreposicao))
    mix = np.zeros(total)
    cursor = 0.0
    for _ in range(2):  # duas voltas da progressão
        for raiz, menor in prog:
            bloco = pad(acorde(raiz, menor), por_acorde + sobreposicao, brilho, rng)
            i = int(SR * cursor)
            mix[i : i + len(bloco)] += bloco[: total - i]
            cursor += por_acorde
    mix = reverb(mix, rng)
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 0.5
    estereo = np.stack([mix, np.roll(mix, int(SR * 0.012))], axis=1)
    wav = saida / f"{nome}.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((estereo * 32767).astype(np.int16).tobytes())
    destino = saida / nome / f"{nome}-1.m4a"
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav), "-af", "lowpass=f=6000,afade=t=in:d=2",
         "-c:a", "aac", "-b:a", "160k", str(destino)],
        check=True,
    )
    wav.unlink()
    return destino


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", type=Path, required=True)
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    for nome in TRILHAS:
        print(gerar(nome, a.saida))


if __name__ == "__main__":
    main()

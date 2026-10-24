#!/usr/bin/env python3
"""
Gera um vídeo de teste realista para o editor: fala sintética em português
(espeak-ng), pausas longas, vícios de linguagem, citação de lei e duas frases
que devem gerar alerta da OAB. Também grava a transcrição esperada (tempos por
palavra), no mesmo formato do faster-whisper, para testar as legendas.

  python3 sandbox/gerar_video_teste.py --saida /tmp/teste --imagem public/media/justica-busto.webp [--vertical]
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

FALAS = [
    ("Olá, eu sou a doutora Ana Souza, advogada previdenciária.", 1.6),
    ("Hoje vou explicar, né, como funciona a revisão da vida toda.", 0.9),
    ("O artigo 29 da Lei 8.213 trata do cálculo com todas as contribuições.", 2.2),
    ("Se você se aposentou antes de 2019, vale a pena conferir.", 1.2),
    ("Eu garanto que você vai ganhar essa causa.", 1.0),
    ("Me chame no WhatsApp para uma consulta.", 0.8),
    ("Siga o perfil para mais conteúdos sobre seus direitos.", 0.6),
]


def sh(args: list[str]) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def duracao(path: Path) -> float:
    return float(sh(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).strip())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", type=Path, required=True)
    ap.add_argument("--imagem", type=Path, required=True)
    ap.add_argument("--vertical", action="store_true")
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)

    partes, segmentos, t = [], [], 0.6
    lista = a.saida / "audio.txt"
    silencio_ini = a.saida / "s0.wav"
    sh(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.6", str(silencio_ini)])
    partes.append(silencio_ini)
    for i, (frase, pausa) in enumerate(FALAS):
        wav = a.saida / f"f{i}.wav"
        sh(["espeak-ng", "-v", "pt-br", "-s", "150", "-w", str(wav), frase])
        conv = a.saida / f"f{i}r.wav"
        sh(["ffmpeg", "-y", "-i", str(wav), "-ar", "24000", "-ac", "1", str(conv)])
        d = duracao(conv)
        palavras = frase.split()
        pesos = [max(2, len(p)) for p in palavras]
        total = sum(pesos)
        cursor, ws = t, []
        for p, w in zip(palavras, pesos):
            dd = d * w / total
            ws.append({"p": p, "i": round(cursor, 3), "f": round(cursor + dd * 0.92, 3), "conf": 0.95})
            cursor += dd
        segmentos.append({"i": round(t, 3), "f": round(t + d, 3), "texto": frase, "palavras": ws})
        sil = a.saida / f"s{i + 1}.wav"
        sh(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", str(pausa), str(sil)])
        partes += [conv, sil]
        t += d + pausa
    lista.write_text("".join(f"file '{p.resolve()}'\n" for p in partes), encoding="utf-8")
    voz = a.saida / "voz.wav"
    sh(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy", str(voz)])
    total = duracao(voz)

    w, h = (1080, 1920) if a.vertical else (1920, 1080)
    nome = "teste-vertical.mp4" if a.vertical else "teste-horizontal.mp4"
    # retrato fora do centro (testa o reenquadramento pelo rosto) + ruído leve de câmera
    if a.vertical:
        fundo = f"[1:v]scale={int(w * 0.95)}:-1[img];[0:v][img]overlay=x=(W-w)/2:y=H*0.18"
    else:
        fundo = f"[1:v]scale=-1:{int(h * 0.95)}[img];[0:v][img]overlay=x=W*0.12:y=H-h"
    sh([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=0x1c1f24:s={w}x{h}:r=30:d={total:.2f}", "-loop", "1", "-i", str(a.imagem), "-i", str(voz),
        "-filter_complex", f"{fundo},noise=alls=6:allf=t,format=yuv420p[v]", "-map", "[v]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-t", f"{total:.2f}", "-shortest", str(a.saida / nome),
    ])
    (a.saida / "transcricao.json").write_text(
        json.dumps({"idioma": "pt", "duracao_s": round(total, 3), "segmentos": segmentos}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"video": str(a.saida / nome), "duracao_s": round(total, 2), "transcricao": str(a.saida / "transcricao.json")}))


if __name__ == "__main__":
    main()

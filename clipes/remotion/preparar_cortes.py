#!/usr/bin/env python3
"""Recorta os trechos do episódio definidos em cortes.json para o Remotion.

Para cada corte gera, em public/cortes/:
  <id>.mp4    trechos do episódio colados em sequência (1080p, 30 fps)
  <id>.json3  legendas do YouTube só daquele corte, já no tempo do corte,
              com as correções de transcrição aplicadas
  <id>.props.json  props prontas para `npx remotion render`

Uso:
    python3 preparar_cortes.py --episodio episodio.mp4 --legendas episodio.pt.json3 \
        --logo logo.png [--cortes cortes.json] [--so 03-zero-respostas]
"""

import argparse
import json
import os
import re
import shutil
import subprocess

DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(DIR, "public")


def palavras_json3(caminho):
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    palavras = []
    for ev in dados.get("events", []):
        inicio = ev.get("tStartMs", 0) / 1000
        for seg in ev.get("segs") or []:
            for w in seg.get("utf8", "").split():
                # marcações da transcrição automática não são fala
                if w == ">>" or (w.startswith("[") and w.endswith("]")):
                    continue
                palavras.append([inicio + seg.get("tOffsetMs", 0) / 1000, w])
    palavras.sort(key=lambda p: p[0])
    return palavras


def normalizar(w):
    return re.sub(r"[^\w]", "", w.lower())


def corrigir(palavras, correcoes):
    """Troca sequências erradas da transcrição automática pelo texto correto,
    distribuindo o tempo original entre as palavras novas."""
    for errado, certo in correcoes:
        alvo = [normalizar(w) for w in errado.split()]
        novas = certo.split()
        i = 0
        while i <= len(palavras) - len(alvo):
            if [normalizar(p[1]) for p in palavras[i:i + len(alvo)]] == alvo:
                ini = palavras[i][0]
                fim = palavras[i + len(alvo)][0] if i + len(alvo) < len(palavras) else palavras[i + len(alvo) - 1][0] + 0.4
                passo = (fim - ini) / len(novas)
                palavras[i:i + len(alvo)] = [[ini + k * passo, w] for k, w in enumerate(novas)]
                i += len(novas)
            else:
                i += 1
    return palavras


def json3(palavras):
    return {"events": [{"tStartMs": round(t * 1000), "segs": [{"utf8": w}]} for t, w in palavras]}


def recortar(episodio, segmentos, saida):
    partes, rotulos = [], []
    for i, (ini, fim) in enumerate(segmentos):
        partes.append(f"[0:v]trim={ini}:{fim},setpts=PTS-STARTPTS,fps=30[v{i}];"
                      f"[0:a]atrim={ini}:{fim},asetpts=PTS-STARTPTS,"
                      f"afade=t=in:d=0.03,afade=t=out:st={fim - ini - 0.04:.3f}:d=0.04[a{i}]")
        rotulos.append(f"[v{i}][a{i}]")
    filtro = ";".join(partes) + ";" + "".join(rotulos) + f"concat=n={len(segmentos)}:v=1:a=1[v][a]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", f"{max(segmentos[0][0] - 5, 0)}", "-copyts", "-i", episodio,
                    "-filter_complex", filtro, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-g", "30",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", saida], check=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--episodio", required=True)
    p.add_argument("--legendas", required=True)
    p.add_argument("--logo", required=True)
    p.add_argument("--cortes", default=os.path.join(DIR, "cortes.json"))
    p.add_argument("--so", help="prepara só este id")
    args = p.parse_args()

    with open(args.cortes, encoding="utf-8") as f:
        definicoes = json.load(f)["cortes"]
    todas = palavras_json3(args.legendas)
    destino = os.path.join(PUBLIC, "cortes")
    os.makedirs(destino, exist_ok=True)
    shutil.copy(args.logo, os.path.join(destino, "logo.png"))

    for c in definicoes:
        if args.so and c["id"] != args.so:
            continue
        segmentos = c["segmentos"]
        duracao = sum(fim - ini for ini, fim in segmentos)
        if duracao < 15:
            raise SystemExit(f"{c['id']}: {duracao:.1f}s — a campanha exige no mínimo 15 s")

        palavras, deslocamento = [], 0.0
        for ini, fim in segmentos:
            palavras += [[t - ini + deslocamento, w] for t, w in todas if ini - 0.05 <= t < fim]
            deslocamento += fim - ini
        palavras = corrigir(palavras, c.get("correcoes", []))

        base = os.path.join(destino, c["id"])
        recortar(args.episodio, segmentos, base + ".mp4")
        with open(base + ".json3", "w", encoding="utf-8") as f:
            json.dump(json3(palavras), f, ensure_ascii=False)

        # um jump zoom em cada emenda entre trechos, além dos definidos à mão
        emendas, acumulado = [], 0.0
        for ini, fim in segmentos[:-1]:
            acumulado += fim - ini
            emendas.append(round(acumulado, 2))
        props = {
            "video": f"cortes/{c['id']}.mp4",
            "inicioSeg": 0,
            "duracaoSeg": round(duracao, 2),
            "logo": "cortes/logo.png",
            "legendas": f"cortes/{c['id']}.json3",
            "manchete": c["manchete"],
            "cortes": sorted(set(c.get("cortes", []) + emendas)),
            "zoomBase": c.get("zoomBase", 1),
            "origemY": c.get("origemY", 50),
        }
        with open(base + ".props.json", "w", encoding="utf-8") as f:
            json.dump(props, f, ensure_ascii=False, indent=2)
        print(f"{c['id']}: {duracao:.1f}s | " + " ".join(w for _, w in palavras))


if __name__ == "__main__":
    main()

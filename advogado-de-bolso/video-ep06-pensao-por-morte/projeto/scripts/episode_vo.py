"""Gera a narração do episódio (edge-tts, voz só pt-BR), prepara o vo.json, restaura a pontuação
do texto aprovado e ajusta utils/timing.ts (VO_KEYS, SECONDS, PLANNED_SECONDS, GAPS).
Uso: python3 scripts/episode_vo.py [--voice pt-BR-FranciscaNeural] [--rate +8%] [--gap 0.35] [--tail 2.0]
Imprime as palavras com o frame local de cada uma, para amarrar as animações."""
import argparse, json, math, re, subprocess, sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--voice", default="pt-BR-FranciscaNeural")
p.add_argument("--rate", default="+8%")
p.add_argument("--gap", type=float, default=0.35)
p.add_argument("--tail", type=float, default=2.0)
p.add_argument("--skip-tts", action="store_true")
a = p.parse_args()

if not a.skip_tts:
    for f in Path("public/audio/vo").glob("*"):
        f.unlink()
    Path("scripts/out/vo-timings.json").unlink(missing_ok=True)
    Path("src/data/vo.json").write_text("{}", encoding="utf-8")
    subprocess.run([sys.executable, "scripts/voiceover.py", "--lines", "scripts/narration.json", "--provider", "edge", "--voice", a.voice, "--rate", a.rate], check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, "scripts/prepare_vo.py"], check=True, stdout=subprocess.DEVNULL)

n = json.loads(Path("scripts/narration.json").read_text(encoding="utf-8"))
d = json.loads(Path("src/data/vo.json").read_text(encoding="utf-8"))
d = {k: d[k] for k in n}
for k, v in d.items():
    toks = n[k].split()
    if len(toks) == len(v["words"]):
        for w, t in zip(v["words"], toks):
            w["text"] = t
    else:
        print("AVISO: palavras diferentes em", k, [w["text"] for w in v["words"]])
Path("src/data/vo.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")

keys = list(n)
t = 0.45
st = {}
for i, k in enumerate(keys):
    st[k] = t
    t += d[k]["seconds"] + (a.gap if i < len(keys) - 1 else 0)
total = math.ceil(t + a.tail)
froms = [0] + [round((st[k] - 0.25) * 30) for k in keys[1:]] + [total * 30]
planned = [round((froms[i + 1] - froms[i]) / 30, 4) for i in range(len(keys))]

ts = Path("src/utils/timing.ts").read_text(encoding="utf-8")
ts = re.sub(r"export const SECONDS = [\d.]+;", f"export const SECONDS = {total};", ts)
ts = re.sub(r"export const VO_KEYS = \[.*?\] as const;", "export const VO_KEYS = [" + ", ".join(f'"{k}"' for k in keys) + "] as const;", ts)
ts = re.sub(r"const PLANNED_SECONDS = \[.*?\];", "const PLANNED_SECONDS = [" + ", ".join(str(x) for x in planned) + "];", ts)
ts = re.sub(r"const GAPS: number\[\] = .*?;", f"const GAPS: number[] = Array({len(keys) - 1}).fill({a.gap});", ts)
Path("src/utils/timing.ts").write_text(ts, encoding="utf-8")

print(f"fala termina em {t:.2f} s; vídeo {total} s ({total * 30} frames)")
for i, k in enumerate(keys):
    f0 = froms[i]
    print(k, "from", f0, "dur", froms[i + 1] - f0, " ".join(f"{j}:{w['text']}@{round((st[k] + w['start']) * 30) - f0}" for j, w in enumerate(d[k]["words"])))

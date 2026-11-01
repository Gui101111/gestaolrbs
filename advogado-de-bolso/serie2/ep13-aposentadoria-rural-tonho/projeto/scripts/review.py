"""Frames de revisão (2 por cena) a partir dos cortes reais e montagem de folhas de contato.
Uso: python3 scripts/review.py frames  |  python3 scripts/review.py sheets"""
import json, re, sys, subprocess
from pathlib import Path
ts = Path("src/utils/timing.ts").read_text()
total = int(re.search(r"export const SECONDS = (\d+);", ts).group(1)) * 30
gap = float(re.search(r"fill\(([\d.]+)\)", ts).group(1))
keys = re.search(r"VO_KEYS = \[(.*?)\]", ts).group(1).replace('"', "").replace(" ", "").split(",")
d = json.loads(Path("src/data/vo.json").read_text())
t = 0.45; st = []
for k in keys:
    st.append(t); t += d[k]["seconds"] + gap
froms = [0] + [round((s - 0.25) * 30) for s in st[1:]] + [total]
frames = [froms[i] + int((froms[i + 1] - froms[i]) * f) for i in range(len(keys)) for f in (0.35, 0.85)]
if sys.argv[1] == "frames":
    print(" ".join(map(str, frames)))
else:
    names = [f"f{f:04d}" for f in frames]
    for k in range(0, len(names), 10):
        subprocess.run(["python3", "scripts/sheet.py", f"out/review{k // 10}.png", *names[k:k + 10]], env={"COLS": "5", "PATH": "/usr/bin:/usr/local/bin"}, check=True, stdout=subprocess.DEVNULL)
    print("ok")

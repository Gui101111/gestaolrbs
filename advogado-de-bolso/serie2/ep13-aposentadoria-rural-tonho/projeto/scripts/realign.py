"""Junta tokens do texto aprovado quando o TTS funde palavras (ex.: "65 anos")."""
import json
from pathlib import Path
n = json.loads(Path("scripts/narration.json").read_text())
p = Path("src/data/vo.json"); d = json.loads(p.read_text())
for k, v in d.items():
    toks = n[k].split()
    if len(toks) == len(v["words"]):
        continue
    i = 0
    for w in v["words"]:
        c = len(w["text"].split()); w["text"] = " ".join(toks[i:i + c]); i += c
    assert i == len(toks), (k, i, len(toks))
    print("realinhado", k)
p.write_text(json.dumps(d, ensure_ascii=False, indent=1))

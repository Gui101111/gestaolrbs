"""Reconstrói legendas.srt a partir de tempos.json, recuperando a pontuação do texto original."""
import json, re, sys, unicodedata
d = json.load(open(sys.argv[1])); out = sys.argv[2]
norm = lambda s: re.sub(r"[^\w]", "", unicodedata.normalize("NFC", s.lower()))
DISPLAY = {"um três cinco": "135"}
blocks = []
for sc in d["scenes"]:
    toks = sc["text"].split()
    words = [dict(w) for w in sc["words"]]
    # alinha cada palavra falada a um token do texto (para saber onde há pontuação)
    ti = 0
    for w in words:
        while ti < len(toks) and norm(w["w"]) not in norm(toks[ti]):
            ti += 1
        w["tok"] = toks[ti] if ti < len(toks) else w["w"]
        w["end_punct"] = ti < len(toks) and norm(toks[ti]).endswith(norm(w["w"])) and toks[ti][-1] in ".,?!:;…"
        w["hard"] = w["end_punct"] and toks[ti].rstrip("…")[-1:] in ".?!:" or toks[ti].endswith("...") if ti < len(toks) else False
        if w["end_punct"] or (ti < len(toks) and norm(toks[ti]) == norm(w["w"])):
            ti += 1 if (ti < len(toks) and norm(toks[ti]).endswith(norm(w["w"]))) else 0
    # junta "um três cinco" num só item exibido como 135
    merged, i = [], 0
    while i < len(words):
        trio = " ".join(x["w"].lower() for x in words[i:i+3])
        if trio in DISPLAY:
            m = dict(words[i]); m["w"] = DISPLAY[trio]; m["t1"] = words[i+2]["t1"]
            m["end_punct"], m["hard"] = words[i+2]["end_punct"], words[i+2]["hard"]
            merged.append(m); i += 3
        else:
            merged.append(words[i]); i += 1
    cur = []
    for w in merged:
        cand = " ".join(x["w"] for x in cur + [w])
        if cur and (len(cur) >= 3 or len(cand) > 18):
            blocks.append(cur); cur = []
        cur.append(w)
        if w["end_punct"]:
            blocks.append(cur); cur = []
    if cur: blocks.append(cur)
def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
with open(out, "w") as f:
    for i, b in enumerate(blocks):
        t0, t1 = b[0]["t0"], b[-1]["t1"]
        if i + 1 < len(blocks) and blocks[i+1][0]["t0"] - t1 < 0.35:
            t1 = blocks[i+1][0]["t0"]          # sem "piscar" entre blocos próximos
        f.write(f"{i+1}\n{ts(t0)} --> {ts(t1)}\n{re.sub(r'[.,;:!?…]', '', ' '.join(x['w'] for x in b)).upper()}\n\n")
print(len(blocks), "blocos")

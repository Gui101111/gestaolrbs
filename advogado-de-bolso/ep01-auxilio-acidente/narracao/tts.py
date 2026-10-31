"""Gera narração por cena com edge-tts, junta com pausas, cria SRT e JSON de tempos."""
import asyncio, json, subprocess, sys, os
import edge_tts, ssl, edge_tts.communicate as _c
_c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")

narr_path, out_dir, voice, rate, pitch = sys.argv[1:6]
GAP = 0.22     # pausa extra entre cenas (s); o TTS já deixa ~0,33 s no fim de cada fala
LEAD = 0.25    # silêncio no início (s)
SR = 48000
lines = json.load(open(narr_path))
tmp = os.path.join(out_dir, "_tmp"); os.makedirs(tmp, exist_ok=True)

async def synth(key, text):
    for attempt in range(4):
        try:
            words, audio = [], bytearray()
            c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    words.append({"w": ch["text"], "t0": ch["offset"] / 1e7, "t1": (ch["offset"] + ch["duration"]) / 1e7})
            mp3 = os.path.join(tmp, f"{key}.mp3"); open(mp3, "wb").write(audio)
            return mp3, words
        except Exception as e:
            print("retry", key, e); await asyncio.sleep(2 * (attempt + 1))
    raise SystemExit(f"falhou {key}")

def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode())

async def main():
    scenes, t = [], LEAD
    concat = []
    sil = os.path.join(tmp, "gap.wav"); lead = os.path.join(tmp, "lead.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", str(GAP), sil], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", str(LEAD), lead], check=True)
    concat.append(lead)
    for i, (key, text) in enumerate(lines.items()):
        mp3, words = await synth(key, text)
        wav = os.path.join(tmp, f"{key}.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ar", str(SR), "-ac", "1", wav], check=True)
        d = dur(wav)
        scenes.append({"id": key, "start": round(t, 3), "end": round(t + d, 3), "text": text,
                       "words": [{"w": w["w"], "t0": round(t + w["t0"], 3), "t1": round(t + w["t1"], 3)} for w in words]})
        concat.append(wav); t += d
        if i < len(lines) - 1:
            concat.append(sil); t += GAP
    lst = os.path.join(tmp, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in concat))
    raw = os.path.join(tmp, "raw.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw], check=True)
    # leve tratamento: tira graves inúteis, compressão suave, normaliza para -14 LUFS (redes sociais)
    af = "highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,loudnorm=I=-14:TP=-1.5:LRA=9"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-ar", str(SR), os.path.join(out_dir, "narracao-completa.wav")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(out_dir, "narracao-completa.wav"), "-b:a", "192k", os.path.join(out_dir, "narracao-completa.mp3")], check=True)
    json.dump({"voice": voice, "rate": rate, "pitch": pitch, "total": round(t, 3), "scenes": scenes}, open(os.path.join(out_dir, "tempos.json"), "w"), ensure_ascii=False, indent=1)
    # SRT estilo Shorts: blocos de até 3 palavras / 18 caracteres
    def ts(x):
        h, r = divmod(x, 3600); m, s = divmod(r, 60); ms = int(round((s - int(s)) * 1000))
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{ms:03d}"
    blocks = []
    for sc in scenes:
        cur = []
        for w in sc["words"]:
            cand = " ".join(x["w"] for x in cur + [w])
            if cur and (len(cur) >= 3 or len(cand) > 18):
                blocks.append(cur); cur = []
            cur.append(w)
            if w["w"][-1:] in ".?!:" and cur:
                blocks.append(cur); cur = []
        if cur: blocks.append(cur)
    with open(os.path.join(out_dir, "legendas.srt"), "w") as f:
        for i, b in enumerate(blocks, 1):
            end = b[-1]["t1"]
            f.write(f"{i}\n{ts(b[0]['t0'])} --> {ts(end)}\n{' '.join(x['w'] for x in b).upper()}\n\n")
    print("total", round(t, 2), "s; cenas:")
    for sc in scenes: print(sc["id"], sc["start"], sc["end"], round(sc["end"] - sc["start"], 2), len(sc["words"]), "palavras")

asyncio.run(main())

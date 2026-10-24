#!/usr/bin/env python3
"""
TRIBUNA · editor de vídeo jurídico (roda dentro da sandbox do agente).

Etapas (cada uma imprime "ETAPA: <nome>" para acompanhar o progresso):

  python3 tribuna_editor.py analisar   --brief brief.json --work /work
      baixa o original, mede (ffprobe), extrai o áudio, detecta silêncios,
      rastreia o rosto (OpenCV) e transcreve (faster-whisper, se instalado).
      Grava analise.json e transcricao.json.

  python3 tribuna_editor.py planejar   --brief brief.json --work /work
      gera um plano.json automático a partir da análise e do brief
      (cortes de silêncio, vícios, nome e OAB, título, CTA, trilha, alertas).
      O agente revisa e ajusta este arquivo antes de renderizar.

  python3 tribuna_editor.py renderizar --brief brief.json --work /work [--sem-envio]
      renderiza um MP4 por formato + miniatura, confere com ffprobe,
      envia para as URLs assinadas e grava/envia report.json.

  python3 tribuna_editor.py tudo       --brief brief.json --work /work
      as três etapas em sequência (modo automático).

Só usa a biblioteca padrão do Python; OpenCV (cv2) e faster-whisper são opcionais.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

FORMATOS = {
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "16:9": (1920, 1080),
}

# Silêncio mínimo para cortar, por estilo de edição (segundos)
SILENCIO_MIN = {
    "institucional": 0.8,
    "cinematografico": 0.8,
    "descontraido": 0.5,
    "dinamico": 0.35,
    "performance": 0.35,
}

TOM_POR_ESTILO = {
    "institucional": "sobria",
    "cinematografico": "inspiradora",
    "dinamico": "neutra",
    "performance": "neutra",
    "descontraido": "neutra",
}

LEGENDA_POR_ESTILO = {
    "institucional": "frase",
    "cinematografico": "discreta",
    "dinamico": "palavra",
    "performance": "palavra",
    "descontraido": "palavra",
}

VICIOS = {"é", "éé", "ééé", "hã", "hãa", "hum", "hmm", "ahn", "ah", "né", "tipo", "então", "assim", "eh", "ehh"}

# Termos jurídicos que merecem destaque nas legendas
TERMOS_JURIDICOS = re.compile(
    r"(\bart(?:igo)?\.?\s*\d+[ºo°]?|\blei\s*(?:n[ºo°.]?\s*)?[\d.]+(?:/\d+)?|\bs[úu]mula\s*\d+|\bCLT\b|\bCPC\b|\bCDC\b|\bCPP\b|\bINSS\b|\bSTF\b|\bSTJ\b|"
    r"\bTST\b|\bc[óo]digo\s+(?:civil|penal|de\s+defesa\s+do\s+consumidor)|\bconstitui[çc][ãa]o|\bdano\s+moral|\bprescri[çc][ãa]o|\bdecad[êe]ncia|"
    r"\bliminar|\bindeniza[çc][ãa]o|\baposentadoria|\bpens[ãa]o|\bdireito\s+do\s+consumidor|\busucapi[ãa]o|\binvent[áa]rio|\bdiv[óo]rcio|\bguarda)",
    re.IGNORECASE,
)

# Provimento 205/2021: sinais de fala sensível (o relatório só sinaliza, nunca corta)
ALERTAS_OAB = [
    (re.compile(r"\bgaranto\b|\bgarantimos\b|\bgarantid[oa]s?\b|\bgarantia de (?:ganho|vit[óo]ria|resultado|sucesso)|\bcom certeza (?:voc[êe] )?(?:vai|ganha)|\b100\s*%|\bcausa ganha|\bvai ganhar|\bvit[óo]ria certa|\bresultado certo", re.I), "promessa ou garantia de resultado"),
    (re.compile(r"\bhonor[áa]rio|\bcobro\b|\bpre[çc]o\b|\bvalor(?:es)? (?:da|de) consulta|\breais\b|\bR\$|\bconsulta gr[áa]tis|\bgratuit[ao]", re.I), "menção a valores ou honorários"),
    (re.compile(r"\bme (?:chame|liga|procure)|\bentre em contato|\bchama no (?:whats|zap)|\bclique no link|\bagende (?:já|agora)", re.I), "possível captação de clientela"),
    (re.compile(r"\bo melhor (?:advogad|escrit[óo]ri)|\bnúmero 1\b|\bmelhor do brasil|\bimbat[íi]vel|\bnunca perd", re.I), "autopromoção sensacionalista"),
    (re.compile(r"\bmeu cliente (?:ganhou|recebeu|conseguiu)|\bdepoimento|\bclientes satisfeitos", re.I), "depoimento ou resultado de cliente"),
]


# ---------------------------------------------------------------------------
# utilidades
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(f"[tribuna] {msg}", flush=True)


def etapa(nome: str) -> None:
    print(f"ETAPA: {nome}", flush=True)


def sh(args: list[str], capture: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    res = subprocess.run(args, stdout=subprocess.PIPE if capture else subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(f"{args[0]} falhou ({res.returncode}): {res.stderr[-2500:]}")
    return res


def ler_json(path: Path, padrao=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return padrao


def gravar_json(path: Path, dados) -> None:
    Path(path).write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")


def baixar(url: str, destino: Path, tentativas: int = 3) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    ultimo = None
    for i in range(tentativas):
        try:
            if shutil.which("curl"):
                sh(["curl", "-sS", "-f", "-L", "--retry", "2", "-o", str(destino), url])
            else:
                with urllib.request.urlopen(url, timeout=120) as r, open(destino, "wb") as f:
                    shutil.copyfileobj(r, f, length=1024 * 1024)
            if destino.stat().st_size > 0:
                return destino
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"não foi possível baixar {destino.name}: {ultimo}")


def enviar(url: str, arquivo: Path, content_type: str, tentativas: int = 3) -> None:
    ultimo = None
    for i in range(tentativas):
        try:
            if shutil.which("curl"):
                sh([
                    "curl", "-sS", "-f", "-X", "PUT", "--data-binary", f"@{arquivo}",
                    "-H", f"Content-Type: {content_type}", "-H", "x-upsert: true", url,
                ])
            else:
                dados = arquivo.read_bytes()
                req = urllib.request.Request(url, data=dados, method="PUT", headers={"Content-Type": content_type, "x-upsert": "true"})
                urllib.request.urlopen(req, timeout=600).read()
            return
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"não foi possível enviar {arquivo.name}: {ultimo}")


def fmt_tempo(seg: float) -> str:
    seg = max(0, int(round(seg)))
    return f"{seg // 60:02d}:{seg % 60:02d}"


def normalizar(txt: str) -> str:
    txt = unicodedata.normalize("NFKD", txt.lower())
    return "".join(c for c in txt if not unicodedata.combining(c))


def chave_formato(fmt: str) -> str:
    return fmt.replace(":", "x")


# ---------------------------------------------------------------------------
# análise
# ---------------------------------------------------------------------------
def probe(path: Path) -> dict:
    res = sh(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)], capture=True)
    info = json.loads(res.stdout)
    video = next((s for s in info["streams"] if s.get("codec_type") == "video"), None)
    audio = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    if not video:
        raise RuntimeError("o arquivo não tem trilha de vídeo")
    w, h = int(video["width"]), int(video["height"])
    rot = 0
    for sd in video.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(round(float(sd["rotation"])))
    rot = int(video.get("tags", {}).get("rotate", rot) or 0)
    if abs(rot) % 180 == 90:
        w, h = h, w  # o ffmpeg já aplica a rotação ao decodificar
    num, _, den = (video.get("avg_frame_rate") or "30/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 30.0
    dur = float(info["format"].get("duration") or video.get("duration") or 0)
    return {"largura": w, "altura": h, "fps": round(fps, 3), "rotacao": rot, "duracao_s": round(dur, 3), "tem_audio": audio is not None}


def volume_medio(wav: Path) -> float:
    res = sh(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "volumedetect", "-f", "null", "-"], check=False)
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", res.stderr)
    return float(m.group(1)) if m else -25.0


def detectar_silencios(wav: Path, limiar_db: float, minimo: float = 0.3) -> list[list[float]]:
    res = sh(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", f"silencedetect=n={limiar_db:.1f}dB:d={minimo}", "-f", "null", "-"], check=False)
    inicios = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", res.stderr)]
    fins = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    pares = []
    for i, s in enumerate(inicios):
        e = fins[i] if i < len(fins) else None
        if e is not None:
            pares.append([round(max(0.0, s), 3), round(e, 3)])
    return pares


def rastrear_rostos(video: Path, duracao: float, passo: float = 0.5) -> list[dict]:
    try:
        import cv2  # type: ignore
    except Exception:  # noqa: BLE001
        log("OpenCV indisponível: enquadramento centralizado")
        return []
    if not hasattr(cv2, "CascadeClassifier"):
        log("OpenCV sem detector Haar (use opencv-python-headless<5): enquadramento centralizado")
        return []
    cascade = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
    perfil = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml"))
    cap = cv2.VideoCapture(str(video))
    pontos: list[dict] = []
    t = 0.0
    while t < duracao:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        escala = 480 / max(w, h)
        peq = cv2.resize(frame, (int(w * escala), int(h * escala)))
        cinza = cv2.equalizeHist(cv2.cvtColor(peq, cv2.COLOR_BGR2GRAY))
        min_lado = max(24, int(min(peq.shape[:2]) * 0.08))
        faces = cascade.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=5, minSize=(min_lado, min_lado))
        if len(faces) == 0:
            faces = perfil.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=5, minSize=(min_lado, min_lado))
        if len(faces):
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            ph, pw = peq.shape[:2]
            pontos.append({"t": round(t, 2), "cx": round((x + fw / 2) / pw, 4), "cy": round((y + fh / 2) / ph, 4), "tam": round(fh / ph, 4)})
        t += passo
    cap.release()
    return pontos


def transcrever(wav: Path, duracao: float) -> dict | None:
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except Exception:  # noqa: BLE001
        log("faster-whisper indisponível: sem transcrição")
        return None
    modelo = os.environ.get("TRIBUNA_WHISPER_MODEL") or ("medium" if duracao <= 180 else "small")
    log(f"transcrevendo com faster-whisper ({modelo})")
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segmentos, info = m.transcribe(str(wav), language="pt", word_timestamps=True, vad_filter=True, beam_size=5)
    saida = {"idioma": info.language, "duracao_s": round(duracao, 3), "segmentos": []}
    for s in segmentos:
        palavras = [{"p": w.word.strip(), "i": round(w.start, 3), "f": round(w.end, 3), "conf": round(w.probability, 3)} for w in (s.words or []) if w.word.strip()]
        saida["segmentos"].append({"i": round(s.start, 3), "f": round(s.end, 3), "texto": s.text.strip(), "palavras": palavras})
    return saida


def cmd_analisar(brief: dict, work: Path) -> dict:
    work.mkdir(parents=True, exist_ok=True)
    etapa("baixando")
    original = work / "original"
    if not original.exists() or original.stat().st_size == 0:
        baixar(brief["urls"]["original"], original)
    etapa("medindo")
    info = probe(original)
    log(f"original: {info['largura']}x{info['altura']} · {info['duracao_s']}s · {info['fps']} fps · áudio={info['tem_audio']}")
    if info["duracao_s"] < 1:
        raise RuntimeError("vídeo curto demais")
    wav = work / "audio.wav"
    silencios: list[list[float]] = []
    vol = -25.0
    transcricao = ler_json(work / "transcricao.json")
    if info["tem_audio"]:
        etapa("extraindo áudio")
        sh(["ffmpeg", "-y", "-hide_banner", "-i", str(original), "-vn", "-ac", "1", "-ar", "16000", str(wav)])
        vol = volume_medio(wav)
        limiar = max(-50.0, min(-28.0, vol - 16.0))
        silencios = detectar_silencios(wav, limiar)
        log(f"volume médio {vol:.1f} dB · limiar de silêncio {limiar:.1f} dB · {len(silencios)} silêncios")
        if transcricao is None:
            etapa("transcrevendo")
            transcricao = transcrever(wav, info["duracao_s"])
            if transcricao:
                gravar_json(work / "transcricao.json", transcricao)
    etapa("rastreando rosto")
    rostos = rastrear_rostos(original, info["duracao_s"])
    log(f"rosto encontrado em {len(rostos)} amostras")
    analise = {"probe": info, "volume_medio_db": vol, "silencios": silencios, "rostos": rostos, "transcricao": bool(transcricao)}
    gravar_json(work / "analise.json", analise)
    return analise


# ---------------------------------------------------------------------------
# plano automático
# ---------------------------------------------------------------------------
def resposta(brief: dict, chave: str) -> str:
    return (brief.get("projeto", {}).get("respostas") or {}).get(chave, "nao")


def texto_livre(brief: dict, chave: str) -> str | None:
    t = (brief.get("projeto", {}).get("respostas_texto") or {}).get(chave)
    return t.strip() if isinstance(t, str) and t.strip() else None


def ligado(brief: dict, chave: str) -> bool:
    return resposta(brief, chave) in ("sim", "outro")


def palavras_da(transcricao: dict | None) -> list[dict]:
    if not transcricao:
        return []
    return [w for s in transcricao.get("segmentos", []) for w in s.get("palavras", [])]


def cmd_planejar(brief: dict, work: Path) -> dict:
    etapa("planejando")
    analise = ler_json(work / "analise.json")
    if not analise:
        raise RuntimeError("rode 'analisar' antes de 'planejar'")
    transcricao = ler_json(work / "transcricao.json")
    proj = brief.get("projeto", {})
    estilo = proj.get("estilo") or "institucional"
    dur = analise["probe"]["duracao_s"]
    cortes: list[dict] = []

    if ligado(brief, "pauses"):
        minimo = SILENCIO_MIN.get(estilo, 0.6)
        folga = 0.12
        for s, e in analise["silencios"]:
            # Mantém respiro nas pontas; silêncio no começo/fim sai inteiro
            ini = 0.0 if s <= 0.05 else s + folga
            fim = dur if e >= dur - 0.05 else e - folga
            if fim - ini >= minimo - 2 * folga and fim > ini:
                cortes.append({"inicio": round(ini, 3), "fim": round(fim, 3), "motivo": "silencio"})
        for w in palavras_da(transcricao):
            if normalizar(re.sub(r"[^\w]", "", w["p"])) in {normalizar(v) for v in VICIOS} and w["f"] - w["i"] < 1.2:
                cortes.append({"inicio": round(w["i"], 3), "fim": round(w["f"], 3), "motivo": "vicio"})

    advogado = brief.get("advogado") or {}
    marca = brief.get("marca") or {}
    nome = marca.get("nome_profissional") or advogado.get("nome")
    oab = marca.get("oab") or advogado.get("oab")

    titulo = None
    if ligado(brief, "hook"):
        texto = texto_livre(brief, "hook") or proj.get("nome") or ""
        if texto:
            titulo = {"texto": texto[:70], "inicio": 0.0, "fim": 3.0}

    lower = None
    if ligado(brief, "lower_third") and nome:
        lower = {"nome": nome, "linha2": oab or advogado.get("escritorio") or "", "inicio": 0.6 if not titulo else 3.2, "fim": (0.6 if not titulo else 3.2) + 4.0}

    destaques = []
    if ligado(brief, "terms"):
        for seg in (transcricao or {}).get("segmentos", []):
            for m in TERMOS_JURIDICOS.finditer(seg["texto"]):
                destaques.append({"termo": m.group(0), "tempo": seg["i"]})

    cta = None
    if ligado(brief, "cta"):
        texto = texto_livre(brief, "cta")
        linha2 = marca.get("instagram") or marca.get("site") or marca.get("whatsapp") or ""
        cta = {"texto": texto or "Siga para mais conteúdos", "linha2": linha2}

    vinheta = None
    if ligado(brief, "vignette"):
        vinheta = {"abertura": True, "encerramento": True, "texto": marca.get("escritorio") or advogado.get("escritorio") or nome or ""}

    musica = {"tom": TOM_POR_ESTILO.get(estilo, "neutra")} if ligado(brief, "music") else None

    zooms = []
    if ligado(brief, "effects") and estilo in ("dinamico", "performance", "descontraido"):
        # punch-in leve a cada ~7 s de fala
        t = 4.0
        while t < dur - 3:
            zooms.append({"tempo": round(t, 2), "duracao": 2.2, "escala": 1.1})
            t += 7.0

    alertas = []
    if ligado(brief, "oab") or (brief.get("projeto", {}).get("revisao_oab", True)):
        for seg in (transcricao or {}).get("segmentos", []):
            for rx, motivo in ALERTAS_OAB:
                if rx.search(seg["texto"]):
                    alertas.append({"tempo": fmt_tempo(seg["i"]), "tempo_s": seg["i"], "frase": seg["texto"][:240], "motivo": motivo})
                    break

    plano = {
        "versao": 1,
        "estilo": estilo,
        "cortes": sorted(cortes, key=lambda c: c["inicio"]),
        "titulo": titulo,
        "lower_third": lower,
        "legendas": {"ativar": ligado(brief, "captions") and bool(transcricao), "estilo": LEGENDA_POR_ESTILO.get(estilo, "frase")},
        "destaques": destaques,
        "zooms": zooms,
        "vinheta": vinheta,
        "cta": cta,
        "musica": musica,
        "logo": ligado(brief, "brand"),
        "oab_alertas": alertas,
        "observacoes": "" if transcricao else "Sem transcrição disponível: legendas, vícios e alertas por fala não foram aplicados.",
    }
    gravar_json(work / "plano.json", plano)
    log(f"plano: {len(plano['cortes'])} cortes · legendas={plano['legendas']['ativar']} · alertas={len(alertas)}")
    return plano


# ---------------------------------------------------------------------------
# renderização
# ---------------------------------------------------------------------------
def trechos_mantidos(dur: float, cortes: list[dict], minimo: float = 0.08) -> list[list[float]]:
    faixas = sorted([[max(0.0, c["inicio"]), min(dur, c["fim"])] for c in cortes if c["fim"] > c["inicio"]])
    unidos: list[list[float]] = []
    for c in faixas:
        if unidos and c[0] <= unidos[-1][1]:
            unidos[-1][1] = max(unidos[-1][1], c[1])
        else:
            unidos.append(list(c))
    mantidos, cursor = [], 0.0
    for s, e in unidos:
        if s - cursor >= minimo:
            mantidos.append([cursor, s])
        cursor = e
    if dur - cursor >= minimo:
        mantidos.append([cursor, dur])
    return mantidos or [[0.0, dur]]


def remapear(t: float, mantidos: list[list[float]]) -> float | None:
    off = 0.0
    for s, e in mantidos:
        if s <= t <= e:
            return off + (t - s)
        off += e - s
    return None


def remapear_preso(t: float, mantidos: list[list[float]]) -> float:
    off = 0.0
    for s, e in mantidos:
        if t < s:
            return off
        if t <= e:
            return off + (t - s)
        off += e - s
    return off


def pedacos(mantidos: list[list[float]], zooms: list[dict]) -> list[dict]:
    """Divide os trechos mantidos nos limites dos zooms (punch-in no corte)."""
    out = []
    for s, e in mantidos:
        marcas = {s, e}
        for z in zooms:
            a, b = z["tempo"], z["tempo"] + z["duracao"]
            if s < a < e:
                marcas.add(a)
            if s < b < e:
                marcas.add(b)
        pts = sorted(marcas)
        for a, b in zip(pts, pts[1:]):
            if b - a < 0.05:
                continue
            escala = 1.0
            for z in zooms:
                if z["tempo"] <= a + 1e-3 and b <= z["tempo"] + z["duracao"] + 1e-3:
                    escala = max(escala, min(1.25, float(z.get("escala", 1.08))))
            out.append({"i": a, "f": b, "zoom": escala})
    return out


def centro_rosto(rostos: list[dict], a: float, b: float, padrao: tuple[float, float]) -> tuple[float, float]:
    sel = [r for r in rostos if a - 0.5 <= r["t"] <= b + 0.5]
    if not sel:
        return padrao
    xs = sorted(r["cx"] for r in sel)
    ys = sorted(r["cy"] for r in sel)
    return xs[len(xs) // 2], ys[len(ys) // 2]


def recorte(src_w: int, src_h: int, fmt: str, cx: float, cy: float, zoom: float) -> tuple[int, int, int, int]:
    out_w, out_h = FORMATOS[fmt]
    alvo = out_w / out_h
    if src_w / src_h > alvo:
        ch = src_h
        cw = ch * alvo
    else:
        cw = src_w
        ch = cw / alvo
    cw, ch = cw / zoom, ch / zoom
    cw, ch = int(cw) - int(cw) % 2, int(ch) - int(ch) % 2
    # rosto um pouco acima do centro (terço superior), nunca cortando a cabeça
    x = cx * src_w - cw / 2
    y = cy * src_h - ch * 0.42
    x = int(max(0, min(src_w - cw, x)))
    y = int(max(0, min(src_h - ch, y)))
    return cw, ch, x - x % 2, y - y % 2


def ass_cor(hex_cor: str, alfa: int = 0) -> str:
    c = (hex_cor or "#F2C46D").lstrip("#")
    if len(c) != 6:
        c = "F2C46D"
    return f"&H{alfa:02X}{c[4:6]}{c[2:4]}{c[0:2]}".upper()


def ass_tempo(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t - h * 3600 - m * 60
    return f"{h}:{m:02d}:{s:05.2f}"


def ass_texto(t: str) -> str:
    return t.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def montar_ass(fmt: str, plano: dict, brief: dict, transcricao: dict | None, mantidos: list[list[float]], dur_final: float) -> str:
    W, H = FORMATOS[fmt]
    vertical = H > W
    marca = brief.get("marca") or {}
    fonte = marca.get("fonte") or "Manrope"
    cor = (marca.get("cores") or {}).get("principal") or "#F2C46D"
    estilo_leg = (plano.get("legendas") or {}).get("estilo", "frase")
    base = H if vertical else H * 1.25
    tam_leg = int(base * (0.034 if estilo_leg == "discreta" else 0.042))
    tam_tit = int(base * (0.058 if vertical else 0.05))
    mv = int(H * (0.22 if vertical else 0.09))  # área segura do Reels/TikTok
    ml = int(W * (0.1 if vertical else 0.08))
    # nome + OAB acima da área das legendas (até 2 linhas)
    mv_sub = int(H * (0.37 if vertical else 0.24))
    branco, preto = ass_cor("#F4F5F7"), ass_cor("#000000")
    destaque = ass_cor(cor)
    caixa = ass_cor("#101216", 0x40)

    linhas = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Leg,{fonte},{tam_leg},{branco},{branco},{preto},{ass_cor('#000000', 0x80)},{0 if estilo_leg == 'discreta' else -1},0,0,0,100,100,0,0,1,{2 if estilo_leg == 'discreta' else 5},{0 if estilo_leg == 'discreta' else 2},2,{ml},{ml},{mv},1",
        f"Style: Titulo,{fonte},{tam_tit},{branco},{branco},{caixa},{caixa},-1,0,0,0,100,100,0,0,3,{int(tam_tit * 0.35)},0,8,{ml},{ml},{int(H * (0.14 if vertical else 0.1))},1",
        f"Style: Nome,{fonte},{int(base * 0.032)},{branco},{branco},{ass_cor('#101216', 0x20)},{ass_cor('#101216', 0x20)},-1,0,0,0,100,100,0,0,3,{int(base * 0.012)},0,1,{ml},{ml},{mv_sub + int(base * 0.062)},1",
        f"Style: Sub,{fonte},{int(base * 0.022)},{ass_cor('#101216')},{ass_cor('#101216')},{destaque},{destaque},0,0,0,0,100,100,0,0,3,{int(base * 0.01)},0,1,{ml},{ml},{mv_sub},1",
        f"Style: Cta,{fonte},{int(base * 0.04)},{ass_cor('#101216')},{ass_cor('#101216')},{destaque},{destaque},-1,0,0,0,100,100,0,0,3,{int(base * 0.018)},0,2,{ml},{ml},{int(H * (0.34 if vertical else 0.2))},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    ev = []

    tit = plano.get("titulo")
    if tit and tit.get("texto"):
        a = remapear_preso(float(tit.get("inicio", 0)), mantidos)
        b = min(dur_final, max(a + 1.5, remapear_preso(float(tit.get("fim", 3)), mantidos)))
        ev.append(f"Dialogue: 3,{ass_tempo(a)},{ass_tempo(b)},Titulo,,0,0,0,,{{\\fad(200,250)\\t(0,180,\\fscx106\\fscy106)\\t(180,320,\\fscx100\\fscy100)}}{ass_texto(tit['texto'])}")

    lt = plano.get("lower_third")
    if lt and lt.get("nome"):
        a = remapear_preso(float(lt.get("inicio", 0.6)), mantidos)
        b = min(dur_final - 0.2, remapear_preso(float(lt.get("fim", 4.6)), mantidos))
        if b - a > 1:
            ev.append(f"Dialogue: 2,{ass_tempo(a)},{ass_tempo(b)},Nome,,0,0,0,,{{\\fad(250,250)}}{ass_texto(lt['nome'])}")
            if lt.get("linha2"):
                ev.append(f"Dialogue: 2,{ass_tempo(a + 0.15)},{ass_tempo(b)},Sub,,0,0,0,,{{\\fad(250,250)}}{ass_texto(lt['linha2'])}")

    cta = plano.get("cta")
    if cta and cta.get("texto"):
        a = max(0.0, dur_final - 3.2)
        texto = ass_texto(cta["texto"]) + (f"\\N{{\\fs{int(base * 0.028)}\\b0}}{ass_texto(cta['linha2'])}" if cta.get("linha2") else "")
        ev.append(f"Dialogue: 3,{ass_tempo(a)},{ass_tempo(dur_final)},Cta,,0,0,0,,{{\\fad(300,0)}}{texto}")

    leg = plano.get("legendas") or {}
    if leg.get("ativar") and transcricao:
        termos = {normalizar(w) for d in plano.get("destaques", []) for w in re.findall(r"\w+", d.get("termo", ""))}
        # palavras cujo início caiu dentro de um corte não aparecem na legenda
        palavras = [w for w in palavras_da(transcricao) if remapear(w["i"] + 0.02, mantidos) is not None]
        por_grupo = 3 if estilo_leg == "palavra" else 6
        caixa_alta = estilo_leg == "palavra" and (plano.get("estilo") in ("performance", "dinamico"))
        fim_titulo = remapear_preso(float(tit.get("fim", 3)), mantidos) if tit else 0.0
        for i in range(0, len(palavras), por_grupo):
            grupo = palavras[i : i + por_grupo]
            tempos = [(remapear(w["i"], mantidos), remapear(w["f"], mantidos)) for w in grupo]
            if all(a is None for a, _ in tempos):
                continue
            ini = next(a for a, _ in tempos if a is not None)
            fim = max(b for _, b in tempos if b is not None) if any(b is not None for _, b in tempos) else ini + 0.6
            if fim <= fim_titulo:
                continue
            ini = max(ini, fim_titulo)
            def fmt_palavra(w: dict, ativa: bool) -> str:
                txt = ass_texto(w["p"].upper() if caixa_alta else w["p"])
                chave = normalizar(re.sub(r"[^\w]", "", w["p"]))
                if chave in termos or ativa:
                    return f"{{\\1c{destaque}}}{txt}{{\\1c{branco}}}"
                return txt
            if estilo_leg == "palavra":
                # uma linha por palavra ativa (efeito palavra a palavra)
                for j, (a, b) in enumerate(tempos):
                    if a is None:
                        continue
                    prox = next((x for x, _ in tempos[j + 1 :] if x is not None), None)
                    b2 = prox if prox is not None else (b or a + 0.4)
                    if b2 - a < 0.05:
                        continue
                    texto = " ".join(fmt_palavra(w, k == j) for k, w in enumerate(grupo))
                    ev.append(f"Dialogue: 1,{ass_tempo(max(a, fim_titulo))},{ass_tempo(b2)},Leg,,0,0,0,,{texto}")
            else:
                texto = " ".join(fmt_palavra(w, False) for w in grupo)
                ev.append(f"Dialogue: 1,{ass_tempo(ini)},{ass_tempo(fim)},Leg,,0,0,0,,{texto}")

    return "\n".join(linhas + ev) + "\n"


def montar_ass_cartao(fmt: str, brief: dict, texto: str, sub: str) -> str:
    W, H = FORMATOS[fmt]
    marca = brief.get("marca") or {}
    fonte = marca.get("fonte") or "Manrope"
    base = H if H > W else H * 1.25
    return "\n".join([
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: C,{fonte},{int(base * 0.045)},{ass_cor('#F4F5F7')},{ass_cor('#F4F5F7')},{ass_cor('#000000')},{ass_cor('#000000', 0xFF)},-1,0,0,0,100,100,2,0,1,0,0,5,60,60,0,1",
        f"Style: S,{fonte},{int(base * 0.024)},{ass_cor((marca.get('cores') or {}).get('principal') or '#F2C46D')},{ass_cor('#F2C46D')},{ass_cor('#000000')},{ass_cor('#000000', 0xFF)},0,0,0,0,100,100,4,0,1,0,0,5,60,60,0,1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        f"Dialogue: 0,0:00:00.00,0:00:10.00,C,,0,0,0,,{{\\pos({W // 2},{int(H * 0.56)})\\fad(250,200)}}{ass_texto(texto)}",
        f"Dialogue: 0,0:00:00.15,0:00:10.00,S,,0,0,0,,{{\\pos({W // 2},{int(H * 0.56 + base * 0.06)})\\fad(300,200)}}{ass_texto(sub)}" if sub else "",
    ]) + "\n"


def escapar_filtro(caminho: Path) -> str:
    return str(caminho).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def renderizar_formato(fmt: str, brief: dict, plano: dict, analise: dict, transcricao: dict | None, work: Path, ativos: dict) -> dict:
    W, H = FORMATOS[fmt]
    info = analise["probe"]
    dur = info["duracao_s"]
    mantidos = trechos_mantidos(dur, plano.get("cortes", []))
    dur_final = sum(e - s for s, e in mantidos)
    partes = pedacos(mantidos, plano.get("zooms", []) if ligado_plano(plano, "zooms") else [])
    rostos = analise.get("rostos", [])
    padrao = centro_rosto(rostos, 0, dur, (0.5, 0.45))

    original = work / "original"
    saida = work / "saida" / f"{chave_formato(fmt)}.mp4"
    saida.parent.mkdir(parents=True, exist_ok=True)
    ass = work / "saida" / f"{chave_formato(fmt)}.ass"
    ass.write_text(montar_ass(fmt, plano, brief, transcricao, mantidos, dur_final), encoding="utf-8")
    fontsdir = ativos.get("fontes")

    entradas = ["-i", str(original)]
    idx = 1
    logo_idx = musica_idx = None
    if ativos.get("logo") and plano.get("logo"):
        entradas += ["-i", str(ativos["logo"])]
        logo_idx = idx
        idx += 1
    if ativos.get("musica") and plano.get("musica"):
        entradas += ["-stream_loop", "-1", "-i", str(ativos["musica"])]
        musica_idx = idx
        idx += 1

    f: list[str] = []
    tem_audio = info["tem_audio"]
    for i, p in enumerate(partes):
        cx, cy = centro_rosto(rostos, p["i"], p["f"], padrao)
        cw, ch, x, y = recorte(info["largura"], info["altura"], fmt, cx, cy, p["zoom"])
        f.append(f"[0:v]trim=start={p['i']:.3f}:end={p['f']:.3f},setpts=PTS-STARTPTS,crop={cw}:{ch}:{x}:{y},scale={W}:{H}:flags=lanczos,setsar=1,fps=30[v{i}]")
        if tem_audio:
            f.append(f"[0:a]atrim=start={p['i']:.3f}:end={p['f']:.3f},asetpts=PTS-STARTPTS[a{i}]")
        else:
            f.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={p['f'] - p['i']:.3f}[a{i}]")
    f.append("".join(f"[v{i}][a{i}]" for i in range(len(partes))) + f"concat=n={len(partes)}:v=1:a=1[vc][ac]")

    # imagem: leve correção + legendas/grafismos + logo
    vf = "[vc]eq=contrast=1.04:saturation=1.05"
    vf += f",ass='{escapar_filtro(ass)}'" + (f":fontsdir='{escapar_filtro(fontsdir)}'" if fontsdir else "")
    vf += ",format=yuv420p[vt]"
    f.append(vf)
    rotulo_v = "vt"
    if logo_idx is not None:
        lw = int(W * (0.16 if H > W else 0.1))
        f.append(f"[{logo_idx}:v]scale={lw}:-1,format=rgba,colorchannelmixer=aa=0.85[lg]")
        f.append(f"[vt][lg]overlay=x=W-w-{int(W * 0.05)}:y={int(H * (0.07 if H > W else 0.06))}:format=auto[vl]")
        rotulo_v = "vl"

    # áudio: limpeza, voz e loudness (-14 LUFS)
    af = "[ac]highpass=f=70,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=150,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[av]"
    f.append(af)
    rotulo_a = "av"
    if musica_idx is not None:
        f.append(f"[{musica_idx}:a]aresample=48000,atrim=duration={dur_final:.3f},loudnorm=I=-34:TP=-6:LRA=11,afade=t=in:d=1,afade=t=out:st={max(0.0, dur_final - 2):.3f}:d=2[mu]")
        f.append("[av][mu]amix=inputs=2:duration=first:normalize=0[am]")
        rotulo_a = "am"

    # vinheta de abertura/encerramento
    vin = plano.get("vinheta")
    if vin and (vin.get("abertura") or vin.get("encerramento")):
        texto = vin.get("texto") or ""
        oab = ((brief.get("marca") or {}).get("oab") or (brief.get("advogado") or {}).get("oab") or "")
        cartao = work / "saida" / f"cartao-{chave_formato(fmt)}.ass"
        cartao.write_text(montar_ass_cartao(fmt, brief, texto, oab), encoding="utf-8")
        fundo = (brief.get("marca") or {}).get("cores", {}).get("fundo") or "#101216"
        segs = []
        for nome, ligado_, d in (("ab", vin.get("abertura"), 1.4), ("en", vin.get("encerramento"), 1.8)):
            if not ligado_:
                continue
            g = f"color=c={fundo.replace('#', '0x')}:s={W}x{H}:r=30:d={d},format=yuv420p,ass='{escapar_filtro(cartao)}'" + (f":fontsdir='{escapar_filtro(fontsdir)}'" if fontsdir else "")
            if logo_idx is not None:
                f.append(f"[{logo_idx}:v]scale={int(W * 0.28)}:-1,format=rgba[lg{nome}]")
                f.append(f"{g}[c{nome}0]")
                f.append(f"[c{nome}0][lg{nome}]overlay=x=(W-w)/2:y=H*0.38-h:format=auto,fade=t=in:d=0.3,fade=t=out:st={d - 0.3}:d=0.3,setsar=1[c{nome}]")
            else:
                f.append(f"{g},fade=t=in:d=0.3,fade=t=out:st={d - 0.3}:d=0.3,setsar=1[c{nome}]")
            f.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={d}[s{nome}]")
            segs.append(nome)
        if segs:
            ordem = (["ab"] if "ab" in segs else []) + ["main"] + (["en"] if "en" in segs else [])
            labels = "".join(f"[{rotulo_v}][{rotulo_a}]" if o == "main" else f"[c{o}][s{o}]" for o in ordem)
            f.append(f"{labels}concat=n={len(ordem)}:v=1:a=1[vfin][afin]")
            rotulo_v, rotulo_a = "vfin", "afin"

    f.append(f"[{rotulo_v}]format=yuv420p[vout]")
    rotulo_v = "vout"
    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *entradas, "-filter_complex", ";".join(f),
            "-map", f"[{rotulo_v}]", "-map", f"[{rotulo_a}]",
            "-c:v", "libx264", "-profile:v", "high", "-preset", os.environ.get("TRIBUNA_PRESET", "medium"), "-crf", "20", "-r", "30",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", str(saida)]
    (work / "saida" / f"{chave_formato(fmt)}.cmd.txt").write_text(" ".join(args), encoding="utf-8")
    sh(args)

    # miniatura: quadro com o rosto, por volta de 1/4 do vídeo
    mini = work / "saida" / f"{chave_formato(fmt)}.jpg"
    final = probe(saida)
    t_mini = min(max(1.0, final["duracao_s"] * 0.25), max(0.0, final["duracao_s"] - 0.5))
    sh(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t_mini:.2f}", "-i", str(saida), "-frames:v", "1", "-q:v", "3", str(mini)])

    # conferência
    if final["largura"] != W or final["altura"] != H:
        raise RuntimeError(f"{fmt}: resolução {final['largura']}x{final['altura']} diferente de {W}x{H}")
    if not final["tem_audio"]:
        raise RuntimeError(f"{fmt}: saída sem áudio")
    if final["duracao_s"] < 0.8:
        raise RuntimeError(f"{fmt}: duração inválida")
    log(f"{fmt}: {final['duracao_s']:.1f}s · {saida.stat().st_size / 1e6:.1f} MB")
    return {"formato": fmt, "arquivo": saida.name, "miniatura": mini.name, "duracao_s": round(final["duracao_s"], 2), "largura": W, "altura": H, "tamanho_bytes": saida.stat().st_size}


def ligado_plano(plano: dict, chave: str) -> bool:
    return bool(plano.get(chave))


def preparar_ativos(brief: dict, work: Path) -> dict:
    urls = brief.get("urls", {})
    ativos: dict = {}
    pasta = work / "ativos"
    if urls.get("logo"):
        try:
            ativos["logo"] = baixar(urls["logo"], pasta / "logo")
        except Exception as e:  # noqa: BLE001
            log(f"logo indisponível: {e}")
    for i, url in enumerate(urls.get("fontes") or []):
        try:
            baixar(url, pasta / "fontes" / f"fonte-{i}.ttf")
            ativos["fontes"] = pasta / "fontes"
        except Exception as e:  # noqa: BLE001
            log(f"fonte indisponível: {e}")
    if urls.get("musica"):
        try:
            ativos["musica"] = baixar(urls["musica"], pasta / "musica")
        except Exception as e:  # noqa: BLE001
            log(f"trilha indisponível: {e}")
    return ativos


def cmd_renderizar(brief: dict, work: Path, enviar_arquivos: bool = True) -> dict:
    analise = ler_json(work / "analise.json")
    plano = ler_json(work / "plano.json")
    if not analise or not plano:
        raise RuntimeError("rode 'analisar' e 'planejar' antes de 'renderizar'")
    transcricao = ler_json(work / "transcricao.json")
    formatos = brief.get("projeto", {}).get("formatos") or ["9:16"]
    ativos = preparar_ativos(brief, work)
    resultados = []
    for fmt in formatos:
        if fmt not in FORMATOS:
            log(f"formato desconhecido ignorado: {fmt}")
            continue
        etapa(f"renderizando {fmt}")
        resultados.append(renderizar_formato(fmt, brief, plano, analise, transcricao, work, ativos))

    dur = analise["probe"]["duracao_s"]
    mantidos = trechos_mantidos(dur, plano.get("cortes", []))
    report = {
        "status": "ok",
        "versao": brief.get("versao", 1),
        "formatos": resultados,
        "cortes": len(plano.get("cortes", [])),
        "duracao_original_s": round(dur, 2),
        "duracao_final_s": round(sum(e - s for s, e in mantidos), 2),
        "legendas": bool((plano.get("legendas") or {}).get("ativar") and transcricao),
        "oab_alertas": plano.get("oab_alertas", []),
        "observacoes": plano.get("observacoes", ""),
    }
    gravar_json(work / "saida" / "report.json", report)

    if enviar_arquivos:
        etapa("enviando")
        cmd_enviar(brief, work)
    return report


def cmd_enviar(brief: dict, work: Path) -> None:
    up = (brief.get("urls") or {}).get("upload") or {}
    saida = work / "saida"
    outputs = Path("/mnt/session/outputs")
    for fmt in brief.get("projeto", {}).get("formatos") or []:
        alvo = up.get(fmt) or {}
        video, mini = saida / f"{chave_formato(fmt)}.mp4", saida / f"{chave_formato(fmt)}.jpg"
        if alvo.get("video") and video.exists():
            enviar(alvo["video"], video, "video/mp4")
        if alvo.get("miniatura") and mini.exists():
            enviar(alvo["miniatura"], mini, "image/jpeg")
    if up.get("plano") and (work / "plano.json").exists():
        enviar(up["plano"], work / "plano.json", "application/json")
    if up.get("transcricao") and (work / "transcricao.json").exists():
        enviar(up["transcricao"], work / "transcricao.json", "application/json")
    # report.json vai por último: a plataforma usa a presença dele como sinal de entrega
    if up.get("report") and (saida / "report.json").exists():
        enviar(up["report"], saida / "report.json", "application/json")
    if outputs.exists():
        for arq in saida.glob("*"):
            if arq.suffix in (".mp4", ".jpg", ".json"):
                shutil.copy2(arq, outputs / arq.name)
        for extra in ("plano.json", "transcricao.json"):
            if (work / extra).exists():
                shutil.copy2(work / extra, outputs / extra)
    log("arquivos enviados")


def gravar_erro(brief: dict, work: Path, motivo: str) -> None:
    saida = work / "saida"
    saida.mkdir(parents=True, exist_ok=True)
    report = {"status": "erro", "versao": brief.get("versao", 1), "motivo": motivo[:1500], "formatos": []}
    gravar_json(saida / "report.json", report)
    url = ((brief.get("urls") or {}).get("upload") or {}).get("report")
    if url:
        try:
            enviar(url, saida / "report.json", "application/json")
        except Exception as e:  # noqa: BLE001
            log(f"falha ao enviar report de erro: {e}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Editor de vídeo jurídico da TRIBUNA")
    ap.add_argument("comando", choices=["analisar", "planejar", "renderizar", "enviar", "tudo"])
    ap.add_argument("--brief", required=True, type=Path)
    ap.add_argument("--work", default=Path("/work"), type=Path)
    ap.add_argument("--sem-envio", action="store_true")
    ap.add_argument("--report-erro", action="store_true", help="em caso de falha, envia report.json com status erro")
    a = ap.parse_args()
    brief = json.loads(a.brief.read_text(encoding="utf-8"))
    a.work.mkdir(parents=True, exist_ok=True)
    inicio = time.time()
    try:
        if a.comando in ("analisar", "tudo"):
            cmd_analisar(brief, a.work)
        if a.comando in ("planejar", "tudo"):
            cmd_planejar(brief, a.work)
        if a.comando in ("renderizar", "tudo"):
            report = cmd_renderizar(brief, a.work, enviar_arquivos=not a.sem_envio)
            print(json.dumps(report, ensure_ascii=False, indent=2))
        if a.comando == "enviar":
            cmd_enviar(brief, a.work)
    except Exception as e:  # noqa: BLE001
        log(f"ERRO: {e}")
        if a.report_erro:
            gravar_erro(brief, a.work, str(e))
        return 1
    log(f"concluído em {time.time() - inicio:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())

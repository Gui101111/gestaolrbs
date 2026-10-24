#!/usr/bin/env python3
"""Gera um clipe vertical (1080x1920) para a campanha CPMV do Canal Foco.

O clipe sai pronto para Reels/TikTok/Shorts, seguindo as regras da campanha:
- usa só o trecho do episódio "5 Milionários x 5 Novatos" que você indicar;
- a logo do Canal Foco fica visível do primeiro ao último frame, grande o
  bastante para ler "Completo no YouTube";
- legendas palavra por palavra vêm da transcrição do próprio episódio
  (nada de fala inventada ou distorcida);
- duração mínima de 15 s (padrão: 30 s).

Elementos de retenção: flash + zoom de entrada nos 3 primeiros segundos,
manchete com "pop" animado, legendas dinâmicas com a palavra ativa em
destaque, zooms de corte (jump zoom) ao longo do vídeo, barra de progresso
e chamada final para o episódio completo.

Exemplo:
    python3 gerar_clipe.py --video episodio.mp4 --inicio 12:34 \
        --legendas episodio.pt.json3 --logo logo_canal_foco.png \
        --saida clipe.mp4
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

LARGURA, ALTURA = 1080, 1920
FPS = 30

# Layout (em pixels do quadro 1080x1920). As áreas de cima e de baixo ficam
# longe das bordas cobertas pela interface do Reels/TikTok.
MANCHETE_Y = (205, 318)        # centro das duas linhas da manchete
LOGO_CENTRO_Y = 470
LOGO_ALTURA_MAX = 170
VIDEO_Y, VIDEO_ALT = 580, 900  # janela do vídeo principal
LEGENDA_Y = 1385               # base das legendas (sobre o terço inferior do vídeo)
BARRA_ALT = 10
CTA_Y = 1600

AMARELO = "&H0000D4FF&"        # #FFD400 em BGR do ASS
BRANCO = "&H00FFFFFF&"

DIR = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(DIR, "fonts")


def tempo(valor):
    """Converte '75', '1:15' ou '00:01:15.5' em segundos."""
    partes = [float(p) for p in str(valor).split(":")]
    s = 0.0
    for p in partes:
        s = s * 60 + p
    return s


def ass_tempo(s):
    s = max(0.0, s)
    h = int(s // 3600)
    m = int(s % 3600 // 60)
    cs = int(round((s - int(s)) * 100))
    seg = int(s % 60)
    if cs == 100:
        seg, cs = seg + 1, 0
    return f"{h}:{m:02d}:{seg:02d}.{cs:02d}"


def ass_texto(t):
    return t.replace("\\", "").replace("{", "(").replace("}", ")")


# ---------------------------------------------------------------- legendas

def palavras_json3(caminho):
    """Palavras com tempo do formato json3 das legendas do YouTube."""
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    palavras = []
    for ev in dados.get("events", []):
        inicio = ev.get("tStartMs", 0) / 1000
        for seg in ev.get("segs") or []:
            texto = seg.get("utf8", "").strip()
            if not texto:
                continue
            t = inicio + seg.get("tOffsetMs", 0) / 1000
            for w in texto.split():
                palavras.append([t, None, w])
    palavras.sort(key=lambda p: p[0])
    for i, p in enumerate(palavras):
        prox = palavras[i + 1][0] if i + 1 < len(palavras) else p[0] + 0.6
        p[1] = min(prox, p[0] + 1.2)
    return palavras


def palavras_srt_vtt(caminho):
    """Palavras de .srt/.vtt; o tempo de cada fala é dividido pelas letras."""
    with open(caminho, encoding="utf-8") as f:
        conteudo = f.read()
    blocos = re.split(r"\n\s*\n", conteudo.replace("\r", ""))
    padrao = re.compile(r"([\d:.,]+)\s+-->\s+([\d:.,]+)")
    palavras = []
    for bloco in blocos:
        linhas = bloco.strip().split("\n")
        for i, linha in enumerate(linhas):
            m = padrao.search(linha)
            if not m:
                continue
            ini = tempo(m.group(1).replace(",", "."))
            fim = tempo(m.group(2).replace(",", "."))
            texto = " ".join(linhas[i + 1:])
            texto = re.sub(r"<[^>]+>", "", texto)
            ws = texto.split()
            total = sum(len(w) for w in ws) or 1
            t = ini
            for w in ws:
                d = (fim - ini) * len(w) / total
                palavras.append([t, t + d, w])
                t += d
            break
    # legendas automáticas em VTT repetem a linha anterior; remove duplicatas
    limpas = []
    for p in palavras:
        if limpas and p[2] == limpas[-1][2] and p[0] - limpas[-1][0] < 1.5:
            continue
        limpas.append(p)
    return limpas


def carregar_palavras(caminho, inicio, duracao):
    if caminho.endswith(".json3") or caminho.endswith(".json"):
        palavras = palavras_json3(caminho)
    else:
        palavras = palavras_srt_vtt(caminho)
    sel = []
    for ini, fim, w in palavras:
        if inicio - 0.05 <= ini < inicio + duracao:
            sel.append((ini - inicio, min(fim, inicio + duracao) - inicio, w))
    return sel


def agrupar(palavras, max_palavras=3, max_letras=16, pausa=0.45):
    grupos, atual = [], []
    for p in palavras:
        letras = sum(len(w) + 1 for _, _, w in atual) + len(p[2])
        quebra = atual and (
            len(atual) >= max_palavras
            or letras > max_letras
            or p[0] - atual[-1][1] > pausa
            or re.search(r"[.!?,;:]$", atual[-1][2])
        )
        if quebra:
            grupos.append(atual)
            atual = []
        atual.append(p)
    if atual:
        grupos.append(atual)
    return grupos


def eventos_legenda(palavras, fim_legendas):
    eventos = []
    for g in agrupar(palavras):
        fim_grupo = min(g[-1][1] + 0.15, fim_legendas)
        for i, (ini, fim, _) in enumerate(g):
            ate = g[i + 1][0] if i + 1 < len(g) else fim_grupo
            if ate <= ini:
                continue
            partes = []
            for j, (_, _, w) in enumerate(g):
                w = ass_texto(w.upper())
                if j == i and i == 0:
                    # o grupo inteiro já entra com "pop"; a palavra ativa só muda de cor
                    partes.append(f"{{\\c{AMARELO}}}{w}{{\\c{BRANCO}}}")
                elif j == i:
                    efeito = f"{{\\c{AMARELO}\\t(0,80,\\fscx110\\fscy110)}}"
                    partes.append(f"{efeito}{w}{{\\c{BRANCO}\\fscx100\\fscy100}}")
                else:
                    partes.append(w)
            entrada = ""
            if i == 0:
                entrada = "{\\fscx75\\fscy75\\t(0,110,\\fscx100\\fscy100)}"
            linha = entrada + " ".join(partes)
            eventos.append(
                f"Dialogue: 2,{ass_tempo(ini)},{ass_tempo(ate)},Legenda,,0,0,0,,"
                f"{{\\pos(540,{LEGENDA_Y})}}{linha}")
    return eventos


# ------------------------------------------------------------ texto/ASS

def linha_com_destaque(texto):
    """*palavra* vira amarelo."""
    return re.sub(r"\*([^*]+)\*",
                  lambda m: f"{{\\c{AMARELO}}}{m.group(1)}{{\\c{BRANCO}}}",
                  ass_texto(texto))


def gerar_ass(args, duracao, palavras, caminho):
    linhas_manchete = [l.strip() for l in args.manchete.split("|") if l.strip()][:2]
    cta_ini = max(duracao - args.cta_duracao, 3.2)
    eventos = []

    # Manchete: cada linha entra com "pop" escalonado e fica até o fim.
    for i, texto in enumerate(linhas_manchete):
        ini = 0.05 + i * 0.25
        y = MANCHETE_Y[i] if len(linhas_manchete) > 1 else sum(MANCHETE_Y) // 2
        pop = ("{\\fscx0\\fscy0\\t(0,140,\\fscx118\\fscy118)"
               "\\t(140,240,\\fscx100\\fscy100)}")
        if i == 1:
            pop = pop.replace("fscx100\\fscy100", "fscx115\\fscy115").replace(
                "fscx118\\fscy118", "fscx132\\fscy132")
        eventos.append(
            f"Dialogue: 3,{ass_tempo(ini)},{ass_tempo(duracao)},Manchete,,0,0,0,,"
            f"{{\\pos(540,{y})}}{pop}{linha_com_destaque(texto)}")

    if palavras:
        eventos += eventos_legenda(palavras, cta_ini if args.cta_sobre_legenda else duracao)

    # Chamada final para o episódio completo.
    if args.cta:
        entrada_cta = ("{\\fscx0\\fscy0\\t(0,160,\\fscx115\\fscy115)\\t(160,260,\\fscx100\\fscy100)"
                   "\\t(600,900,\\frz-2)\\t(900,1200,\\frz2)\\t(1200,1500,\\frz0)}")
        eventos.append(
            f"Dialogue: 4,{ass_tempo(cta_ini)},{ass_tempo(duracao)},CTA,,0,0,0,,"
            f"{{\\pos(540,{CTA_Y})}}{entrada_cta}{linha_com_destaque(args.cta)}")

    cabecalho = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {LARGURA}
PlayResY: {ALTURA}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Manchete,Anton,{args.manchete_tamanho},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,40,40,0,1
Style: Legenda,Anton,{args.legenda_tamanho},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,3,2,90,90,0,1
Style: CTA,Anton,72,&H00000000,&H00000000,&H0000D4FF,&H0000D4FF,0,0,0,0,100,100,1,0,3,18,0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(cabecalho + "\n".join(eventos) + "\n")


# ----------------------------------------------------------------- ffmpeg

def escapar_filtro(caminho):
    return caminho.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def expr_zoom(cortes):
    """Zoom de entrada (1.18 -> 1.0 em 0.6 s) + alternância 1.0/1.10 a cada corte."""
    T = f"(on/{FPS})"
    entrada = f"0.18*pow(max(0,1-{T}/0.6),2)"
    if cortes:
        passos = "+".join(f"gte({T},{c:.3f})" for c in cortes)
        alterna = f"0.10*mod({passos},2)"
    else:
        alterna = "0"
    return f"1+{entrada}+{alterna}"


def montar_filtro(args, duracao, ass, tem_logo, com_audio=True):
    cx = min(max(args.crop_x, 0.0), 1.0)
    proporcao = LARGURA / VIDEO_ALT
    fx2, fy2 = LARGURA * 2, VIDEO_ALT * 2
    z = expr_zoom(args.cortes)
    partes = [
        f"[0:v]fps={FPS},setpts=PTS-STARTPTS,split[a][b]",
        # fundo: o próprio vídeo, ampliado, desfocado e escurecido
        f"[a]scale=-2:{ALTURA},crop={LARGURA}:{ALTURA},gblur=sigma=38,"
        f"eq=brightness=-0.18:saturation=1.25[fundo]",
        # vídeo principal recortado em {LARGURA}x{VIDEO_ALT} com zooms dinâmicos
        f"[b]crop='min(iw,ih*{proporcao:.4f})':ih:'(iw-min(iw,ih*{proporcao:.4f}))*{cx:.3f}':0,"
        f"scale={fx2}:{fy2},"
        f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:"
        f"s={LARGURA}x{VIDEO_ALT}:fps={FPS},setsar=1[frente]",
        f"[fundo][frente]overlay=0:{VIDEO_Y}[v1]",
        # contorno fino no vídeo principal
        f"[v1]drawbox=x=0:y={VIDEO_Y - 4}:w={LARGURA}:h=4:color=white@0.85:t=fill,"
        f"drawbox=x=0:y={VIDEO_Y + VIDEO_ALT}:w={LARGURA}:h={BARRA_ALT}:color=black@0.55:t=fill[v2]",
        # barra de progresso amarela
        f"color=c=0xFFD400:s={LARGURA}x{BARRA_ALT}:r={FPS}:d={duracao:.3f}[barra]",
        f"[v2][barra]overlay=x='-{LARGURA}+{LARGURA}*t/{duracao:.3f}':y={VIDEO_Y + VIDEO_ALT}:"
        f"shortest=1[v3]",
        # flash branco de entrada
        f"color=c=white:s={LARGURA}x{ALTURA}:r={FPS}:d=0.35,format=rgba,"
        f"fade=t=out:st=0:d=0.35:alpha=1[flash]",
        f"[v3][flash]overlay=eof_action=pass[v4]",
    ]
    ultimo = "v4"
    if tem_logo:
        partes.append(
            f"[1:v]scale=w='min({args.logo_largura},iw*{LOGO_ALTURA_MAX}/ih)':h=-1,"
            f"format=rgba[logo]")
        partes.append(
            f"[{ultimo}][logo]overlay=x=(W-w)/2:y={LOGO_CENTRO_Y}-h/2:eof_action=repeat[v5]")
        ultimo = "v5"
    partes.append(
        f"[{ultimo}]ass='{escapar_filtro(ass)}':fontsdir='{escapar_filtro(FONTES)}',"
        f"format=yuv420p[vout]")

    if not com_audio:
        return ";".join(partes)
    audio = [f"[0:a]asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-1.5:LRA=11[voz]"]
    if args.efeitos:
        cta_ini = max(duracao - args.cta_duracao, 3.2)
        audio += [
            "anoisesrc=d=0.45:c=pink:a=0.5,highpass=f=700,lowpass=f=5000,"
            "afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.25,volume=0.35,"
            "aformat=sample_rates=48000:channel_layouts=stereo,asplit[w1][w2]",
            f"[w2]adelay={int(cta_ini * 1000)}|{int(cta_ini * 1000)}[w2d]",
            "[voz]aformat=sample_rates=48000:channel_layouts=stereo[voz2]",
            "[voz2][w1][w2d]amix=inputs=3:duration=first:normalize=0[aout]",
        ]
    else:
        audio.append("[voz]anull[aout]")
    return ";".join(partes + audio)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--video", required=True, help="episódio (ou trecho) em mp4")
    p.add_argument("--inicio", default="0", help="início do trecho no vídeo (ex.: 12:34.5)")
    p.add_argument("--duracao", type=float, default=30.0, help="duração em segundos (mín. 15)")
    p.add_argument("--logo", help="PNG da logo do Canal Foco (da Biblioteca da campanha)")
    p.add_argument("--legendas", help="legendas do episódio: .json3 (YouTube), .vtt ou .srt")
    p.add_argument("--legendas-relativas", action="store_true",
                   help="os tempos das legendas já começam no início do trecho")
    p.add_argument("--manchete", default="5 MILIONÁRIOS x 5 NOVATOS|DISPUTAM *R$ 750 MIL*",
                   help="manchete do topo; '|' quebra a linha, *texto* fica amarelo")
    p.add_argument("--manchete-tamanho", type=int, default=92)
    p.add_argument("--legenda-tamanho", type=int, default=100)
    p.add_argument("--cta", default="▶ EPISÓDIO COMPLETO NO YOUTUBE",
                   help="chamada final (vazio desativa)")
    p.add_argument("--cta-duracao", type=float, default=3.5)
    p.add_argument("--cta-sobre-legenda", action="store_true",
                   help="esconde as legendas enquanto a chamada final aparece")
    p.add_argument("--cortes", default="",
                   help="segundos (relativos ao trecho) para os jump zooms, ex.: 4.2,9.8,15")
    p.add_argument("--crop-x", type=float, default=0.5,
                   help="posição horizontal do recorte: 0=esquerda, 0.5=centro, 1=direita")
    p.add_argument("--logo-largura", type=int, default=460)
    p.add_argument("--sem-efeitos", dest="efeitos", action="store_false",
                   help="não adiciona os whooshes de entrada/saída")
    p.add_argument("--previa", help="só gera PNGs nesses segundos (ex.: 0.3,2,15,28)")
    p.add_argument("--saida", default="clipe.mp4")
    args = p.parse_args()

    if args.duracao < 15:
        sys.exit("A campanha exige no mínimo 15 segundos.")
    if not args.logo:
        print("AVISO: sem --logo. A logo do Canal Foco é OBRIGATÓRIA para valer na campanha.",
              file=sys.stderr)
    args.cortes = [float(c) for c in args.cortes.split(",") if c.strip()]

    inicio = tempo(args.inicio)
    duracao = args.duracao
    palavras = []
    if args.legendas:
        base = 0.0 if args.legendas_relativas else inicio
        palavras = carregar_palavras(args.legendas, base, duracao)
        print(f"{len(palavras)} palavras de legenda no trecho.")

    with tempfile.TemporaryDirectory() as tmp:
        ass = os.path.join(tmp, "texto.ass")
        gerar_ass(args, duracao, palavras, ass)
        filtro = montar_filtro(args, duracao, ass, bool(args.logo), not args.previa)
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-stats", "-y",
               "-ss", f"{inicio:.3f}", "-t", f"{duracao:.3f}", "-i", args.video]
        if args.logo:
            cmd += ["-i", args.logo]
        cmd += ["-filter_complex", filtro]
        if args.previa:
            # gera o clipe em baixa qualidade e extrai os quadros pedidos
            temp_mp4 = os.path.join(tmp, "previa.mp4")
            subprocess.run(cmd + ["-map", "[vout]", "-an", "-c:v", "libx264", "-preset",
                                  "ultrafast", "-crf", "28", temp_mp4], check=True)
            base_saida = os.path.splitext(args.saida)[0]
            for s in args.previa.split(","):
                png = f"{base_saida}_{float(s):05.1f}s.png"
                subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                                "-ss", s, "-i", temp_mp4, "-frames:v", "1", png], check=True)
                print(png)
            return
        cmd += ["-map", "[vout]", "-map", "[aout]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", str(FPS),
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                "-movflags", "+faststart", args.saida]
        subprocess.run(cmd, check=True)
    print(f"Clipe gerado: {args.saida}")


if __name__ == "__main__":
    main()

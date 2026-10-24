# Clipes – Campanha CPMV Canal Foco ("5 Milionários x 5 Novatos")

Gera clipes verticais (1080x1920, 30 fps) prontos para Reels, TikTok e Shorts,
já dentro das regras da campanha.

## Regras da campanha (resumo)

- 🎬 Só trechos do episódio "5 Milionários x 5 Novatos" (nada de outros episódios/canais)
- ⏱️ Mínimo de **15 segundos** (o padrão aqui é 30 s)
- 🏷️ Logo do Canal Foco **do início ao fim**, grande o bastante para ler "Completo no YouTube"
- 📝 Legenda do post convidando para ver o episódio completo no YouTube + marcações obrigatórias
- 🖼️ Cada vídeo do mesmo dia com **capa diferente**
- 📌 Manter publicado até **7 dias depois do fim** da campanha (fim: 31/10/2026)
- 🚫 Proibido: inventar/distorcer falas, imagens sem contexto, sensacionalismo, falso react, ASMR/vídeo satisfatório

## Três jeitos de gerar o mesmo clipe

| Ferramenta | Pasta | Quando usar |
|---|---|---|
| **Remotion** (React) | `remotion/` | Melhor animação (molas, tarja amarela, pulso da logo); renderiza por linha de comando |
| **After Effects** | `after-effects/` | Quer ajustar à mão na timeline do AE |
| **ffmpeg** (Python) | `gerar_clipe.py` | Mais rápido e sem dependências além do ffmpeg |

### Remotion

```bash
cd remotion
npm install
# coloque em remotion/public/: episodio.mp4, logo.png e as legendas (.json3 ou .srt)
npx remotion studio                       # editar e ver ao vivo no navegador
npx remotion render ClipeCanalFoco out/clipe.mp4 --props=props.json
```

`props.json` (só o que mudar do padrão):

```json
{
  "video": "episodio.mp4",
  "inicioSeg": 754.5,
  "duracaoSeg": 30,
  "logo": "logo.png",
  "legendas": "episodio.pt.json3",
  "manchete": "5 MILIONÁRIOS x 5 NOVATOS|DISPUTAM *R$ 750 MIL*",
  "cortes": [4.5, 10, 16.5, 22],
  "cropX": 0.5
}
```

Sem `logo` o vídeo mostra um aviso vermelho no lugar, para não sair publicado sem ela.
Licença: o Remotion é gratuito para pessoa física e empresas com até 3 pessoas.

### After Effects

1. Instale a fonte `fonts/Anton-Regular.ttf`.
2. No AE: **Arquivo > Scripts > Executar arquivo de script...** e escolha
   `after-effects/ClipeCanalFoco.jsx`.
3. Responda às perguntas (episódio, logo, legendas, início, duração, cortes, manchete).
4. A composição **"Clipe Canal Foco"** é criada com camadas editáveis; renderize em H.264.

### ffmpeg (Python)

```bash
pip install yt-dlp
./baixar_episodio.sh            # episodio.mp4 + episodio.pt*.json3

python3 gerar_clipe.py \
  --video episodio.mp4 \
  --inicio 12:34 --duracao 30 \
  --legendas episodio.pt.json3 \
  --logo logo_canal_foco.png \
  --cortes 4.5,10,16.5,22 \
  --saida clipe_01.mp4
```

- `--legendas`: o arquivo .json3 baixado (o nome exato aparece no fim do download).
- `--logo`: PNG da logo baixada da Biblioteca da campanha (obrigatória).
- `--manchete`: texto do topo; `|` quebra a linha e `*texto*` fica amarelo.
  Use só informações reais do episódio.
- `--cortes`: segundos (dentro do trecho) dos "jump zooms"; de preferência
  em pausas ou trocas de frase.
- `--crop-x`: 0 a 1, move o recorte para o lado de quem está falando.
- `--previa 0.3,2,15,28`: gera só imagens desses segundos para conferir o layout.

## O que o clipe tem

| Tempo | Elemento |
|---|---|
| 0–0,6 s | Flash branco + zoom de entrada no vídeo |
| 0–0,5 s | Manchete entra com "pop" (2ª linha maior, valor em amarelo) |
| Todo o vídeo | Logo do Canal Foco fixa, legendas palavra por palavra, barra de progresso |
| Cortes | Jump zoom (1,0 ↔ 1,1) para quebrar o padrão e segurar a atenção |
| Últimos 3,5 s | Chamada "▶ EPISÓDIO COMPLETO NO YOUTUBE" com balanço |

O áudio é normalizado em -14 LUFS (padrão das redes) e ganha um "whoosh"
discreto na abertura e na chamada final (`--sem-efeitos` desliga).

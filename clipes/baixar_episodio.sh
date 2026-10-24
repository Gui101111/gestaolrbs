#!/usr/bin/env bash
# Baixa o episódio "5 Milionários x 5 Novatos" (Canal Foco) e as legendas
# automáticas em português com o tempo de cada palavra (formato json3).
# Requer: pip install yt-dlp  e acesso de rede a youtube.com / googlevideo.com
set -euo pipefail

URL="${1:-https://www.youtube.com/watch?v=PJkaoGcXrXQ}"
DESTINO="${2:-episodio}"

python3 -m yt_dlp \
  -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]" \
  --merge-output-format mp4 \
  --write-auto-subs --write-subs --sub-langs "pt.*" --sub-format json3 \
  -o "${DESTINO}.%(ext)s" \
  "$URL"

ls -la "${DESTINO}".*

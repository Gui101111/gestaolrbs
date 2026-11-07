#!/usr/bin/env bash
# Render completo + loudness -14 LUFS + versão leve para celular + folha de conferência tirada do MP4.
# Uso: bash scripts/finish.sh <nome-final>
set -euo pipefail
NAME=$1
BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npx remotion render Episodio out/raw.mp4 --gl=swangle --browser-executable=$BROWSER --concurrency=4 --crf=18 --log=error
python3 scripts/loudnorm.py out/raw.mp4 out/norm.mp4 > /dev/null
ffmpeg -hide_banner -loglevel error -y -i out/norm.mp4 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 192k "out/$NAME.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$NAME.mp4")
rm -rf out/check && mkdir -p out/check
python3 - "$DUR" "$NAME" <<'PY'
import subprocess, sys
dur=float(sys.argv[1]); name=sys.argv[2]
ts=[round(dur*i/16+0.5,2) for i in range(16)]
for t in ts:
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(t),"-i",f"out/{name}.mp4","-frames:v","1","-vf","scale=270:480",f"out/check/t{t:06.2f}.png"],check=True)
from PIL import Image
import glob
fs=sorted(glob.glob("out/check/*.png")); ims=[Image.open(f) for f in fs]; w,h=ims[0].size; cols=8
sheet=Image.new("RGB",(cols*w+(cols+1)*6,2*h+18),(30,30,30))
for i,im in enumerate(ims): sheet.paste(im,(6+(i%cols)*(w+6),6+(i//cols)*(h+6)))
sheet.save("out/check-sheet.png")
PY
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of compact "out/$NAME.mp4"
ffmpeg -hide_banner -i "out/$NAME.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E " I:|Peak:"
echo FINISHED

/**
 * Construção de comandos FFmpeg a partir do plano de edição.
 * Funções puras (sem I/O) — executadas por um worker com FFmpeg instalado.
 * Alternativa equivalente: composição em Remotion (Lambda/Cloud Run) usando o mesmo EditPlan.
 */
import type { EditBrief, EditPlan, Transcript } from "../editing/types";

export const OUTPUT_SIZES: Record<string, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "16:9": { w: 1920, h: 1080 },
};

export type Segment = { start: number; end: number };

/** Trechos mantidos após aplicar os cortes (ordenados e mesclados). */
export function keptSegments(durationSec: number, cuts: EditPlan["cuts"], minLen = 0.08): Segment[] {
  const sorted = [...cuts]
    .map((c) => ({ start: Math.max(0, c.startSec), end: Math.min(durationSec, c.endSec) }))
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);
  const merged: Segment[] = [];
  for (const c of sorted) {
    const last = merged[merged.length - 1];
    if (last && c.start <= last.end) last.end = Math.max(last.end, c.end);
    else merged.push({ ...c });
  }
  const kept: Segment[] = [];
  let cursor = 0;
  for (const c of merged) {
    if (c.start - cursor >= minLen) kept.push({ start: cursor, end: c.start });
    cursor = c.end;
  }
  if (durationSec - cursor >= minLen) kept.push({ start: cursor, end: durationSec });
  return kept;
}

/** Converte um tempo do vídeo original para a linha do tempo editada (ou null se cortado). */
export function remapTime(t: number, kept: Segment[]): number | null {
  let offset = 0;
  for (const s of kept) {
    if (t >= s.start && t <= s.end) return offset + (t - s.start);
    offset += s.end - s.start;
  }
  return null;
}

/** Versão monotônica: tempos dentro de um corte são presos à borda mais próxima do trecho mantido. */
export function remapTimeClamped(t: number, kept: Segment[]): number {
  let offset = 0;
  for (const s of kept) {
    if (t < s.start) return offset;
    if (t <= s.end) return offset + (t - s.start);
    offset += s.end - s.start;
  }
  return offset;
}

/** Recorte centralizado para a proporção desejada. */
export function cropFor(srcW: number, srcH: number, ratio: string) {
  const { w, h } = OUTPUT_SIZES[ratio] ?? OUTPUT_SIZES["9:16"];
  const target = w / h;
  const src = srcW / srcH;
  let cw = srcW;
  let ch = srcH;
  if (src > target) cw = Math.round(srcH * target);
  else ch = Math.round(srcW / target);
  cw -= cw % 2;
  ch -= ch % 2;
  return { cw, ch, x: Math.round((srcW - cw) / 2), y: Math.round((srcH - ch) / 2), outW: w, outH: h };
}

function assTime(t: number) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${s}`;
}

/** Cor no formato de tag inline do ASS (\1c&HBBGGRR&). */
function assInline(hex: string) {
  const c = hex.replace("#", "");
  return `&H${c.slice(4, 6)}${c.slice(2, 4)}${c.slice(0, 2)}&`.toUpperCase();
}

/**
 * Legendas ASS sincronizadas palavra a palavra, com destaque dourado para termos do plano.
 * Agrupa até `maxWords` por linha; tempos remapeados para a linha do tempo editada.
 */
export function buildAssSubtitles(opts: {
  transcript: Transcript;
  plan: EditPlan;
  kept: Segment[];
  ratio: string;
  brandColor?: string;
  font?: string | null;
  maxWords?: number;
}) {
  const { w, h } = OUTPUT_SIZES[opts.ratio] ?? OUTPUT_SIZES["9:16"];
  const style = opts.plan.captions.style;
  const vertical = h > w;
  const fontSize = Math.round((vertical ? 0.052 : 0.06) * h * (style === "discreta" ? 0.75 : 1));
  const highlightColor = assInline(opts.brandColor ?? "#E1C487");
  const baseColor = assInline("#F5F5F2");
  const highlights = new Set(opts.plan.captions.highlights.flatMap((x) => x.term.toLowerCase().split(/\s+/)));
  const maxWords = opts.maxWords ?? (opts.plan.captions.mode === "word" ? 3 : 7);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${w}
PlayResY: ${h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${opts.font ?? "Manrope"},${fontSize},&H00F2F5F5,&H00F2F5F5,&H00000000,&H64000000,${style === "discreta" ? 0 : -1},0,0,0,100,100,0,0,1,${style === "discreta" ? 2 : 4},0,2,${Math.round(w * 0.08)},${Math.round(w * 0.08)},${Math.round(h * (vertical ? 0.2 : 0.1))},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const words = opts.transcript.segments.flatMap((s) => s.words);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const group = words.slice(i, i + maxWords);
    const start = remapTimeClamped(group[0].start, opts.kept);
    const end = remapTimeClamped(group[group.length - 1].end, opts.kept);
    if (end - start < 0.12) continue; // grupo inteiro dentro de um corte
    const text = group
      .map((wd) => {
        const raw = style === "caixa_alta" ? wd.text.toUpperCase() : wd.text;
        const clean = raw.replace(/[{}\\]/g, "");
        const key = wd.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        return highlights.has(key) ? `{\\1c${highlightColor}}${clean}{\\1c${baseColor}}` : clean;
      })
      .join(" ");
    lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${text}`);
  }
  return header + lines.join("\n") + "\n";
}

/**
 * Argumentos do FFmpeg para uma saída (proporção) do projeto.
 * `subtitlesPath` deve apontar para o .ass gerado por buildAssSubtitles.
 */
export function buildFfmpegArgs(opts: {
  input: string;
  output: string;
  ratio: string;
  source: { width: number; height: number; durationSec: number };
  plan: EditPlan;
  brief: EditBrief;
  subtitlesPath?: string;
}) {
  const { plan, brief } = opts;
  const kept = keptSegments(opts.source.durationSec, plan.cuts);
  const crop = cropFor(opts.source.width, opts.source.height, opts.ratio);
  const settings = brief.project.settings;
  const parts: string[] = [];

  kept.forEach((s, i) => {
    parts.push(`[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
    parts.push(`[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
  });
  parts.push(`${kept.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${kept.length}:v=1:a=1[vc][ac]`);

  // Vídeo: enquadramento, zooms, cor e legendas
  const zoomExpr = plan.zooms
    .map((z) => {
      const a = remapTime(z.atSec, kept);
      if (a == null) return null;
      const b = a + z.durationSec;
      return `if(between(it,${a.toFixed(2)},${b.toFixed(2)}),${Math.min(1.25, Math.max(1, z.scale)).toFixed(3)},1)`;
    })
    .filter(Boolean)
    .reduce<string>((acc, e) => (acc === "1" ? (e as string) : `max(${acc},${e})`), "1");

  const vf = [
    `crop=${crop.cw}:${crop.ch}:${crop.x}:${crop.y}`,
    `scale=${crop.outW}:${crop.outH}:flags=lanczos`,
    settings.auto_zoom && zoomExpr !== "1"
      ? `zoompan=z='${zoomExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${crop.outW}x${crop.outH}:fps=30`
      : null,
    settings.improve_lighting
      ? `eq=brightness=${(plan.color.exposure * 0.05).toFixed(3)}:contrast=${(1 + plan.color.contrast * 0.1).toFixed(3)}:saturation=1.04`
      : null,
    settings.improve_lighting && plan.color.temperature !== 0
      ? `colortemperature=temperature=${Math.round(6500 - plan.color.temperature * 600)}`
      : null,
    settings.captions && opts.subtitlesPath ? `ass='${opts.subtitlesPath.replace(/'/g, "\\'")}'` : null,
    "format=yuv420p",
  ].filter(Boolean);
  parts.push(`[vc]${vf.join(",")}[vout]`);

  // Áudio: limpeza e loudness para redes sociais
  const af = [
    settings.reduce_noise ? "afftdn=nf=-25" : null,
    settings.enhance_voice ? "highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=120" : null,
    "loudnorm=I=-14:TP=-1.5:LRA=11",
  ].filter(Boolean);
  parts.push(`[ac]${af.join(",")}[aout]`);

  return [
    "-y",
    "-i",
    opts.input,
    "-filter_complex",
    parts.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    opts.output,
  ];
}

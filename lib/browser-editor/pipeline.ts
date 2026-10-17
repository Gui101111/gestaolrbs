import { faceWithClaude, isSampleError, localReview, reviewWithClaude, type SampleFn } from "@/lib/browser-editor/ai";
import { decodeAudio, detectSpeech, frameEnergy, to16k } from "@/lib/browser-editor/audio";
import { RATIO_VALUE, faceWithDetector, grabFrames, loadVideo } from "@/lib/browser-editor/framing";
import { lookFor, type Look } from "@/lib/browser-editor/looks";
import { buildPlan, markKeywords, segmentsFromScript, wordsFromSegments, wordsToOut } from "@/lib/browser-editor/timeline";
import { loadWhisper, type TransformersLike, type WhisperManifest } from "@/lib/browser-editor/transcribe";
import type { Analysis, EditOptions, Face, Plan, Progress, Segment, Word } from "@/lib/browser-editor/types";

export interface EditorDeps {
  sample: SampleFn | null;
  whisper: { manifest: WhisperManifest; importTransformers: () => Promise<TransformersLike> } | null;
}

const CENTER: Face = { x: 0.5, y: 0.42, by: "centro" };

function needsTranscript(o: EditOptions) {
  return o.captions || o.removeMistakes || (o.hook && !o.hookText.trim()) || o.oabReview || (o.cta && !o.ctaText.trim());
}

function sampleNote(e: unknown, what: string) {
  if (isSampleError(e)) {
    if (e.code === "not_granted") return `${what}: a IA não foi autorizada nesta página; usamos a revisão automática local.`;
    if (e.code === "rate_limited") return `${what}: limite de uso da IA atingido agora; usamos a revisão local.`;
    if (e.code === "cancelled") return "";
  }
  return `${what}: a IA não respondeu; usamos a revisão local.`;
}

/** Lê, ouve, transcreve, revisa com IA e acha o rosto. Nada sai do aparelho além do texto da fala e 3 quadros (para o Claude). */
export async function analyze(file: Blob, url: string, opts: EditOptions, deps: EditorDeps, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<Analysis> {
  const notes: string[] = [];
  onProgress({ step: "ler" });
  const probe = document.createElement("video");
  await loadVideo(probe, url);
  const duration = probe.duration;
  const width = probe.videoWidth;
  const height = probe.videoHeight;
  if (!Number.isFinite(duration) || duration <= 0 || !width || !height) throw new Error("Não conseguimos ler este vídeo. Tente um MP4 ou MOV gravado no celular.");

  // Enquadramento em paralelo (só precisa de quadros do vídeo)
  const srcRatio = width / height;
  const needsFraming = opts.ratios.some((r) => Math.abs(RATIO_VALUE[r] - srcRatio) / srcRatio > 0.03);
  const framing: Promise<Face> = (async () => {
    if (!needsFraming) return CENTER;
    onProgress({ step: "enquadrar" });
    const frames = await grabFrames(probe, [0.2, 0.5, 0.8].map((f) => Math.min(duration - 0.1, duration * f)));
    const local = await faceWithDetector(frames.map((f) => f.canvas));
    if (local) return local;
    if (deps.sample) {
      try {
        const caps = await deps.sample.limits().catch(() => null);
        if (caps?.images) {
          const f = await faceWithClaude(deps.sample, frames.map((x) => x.blob).slice(0, caps.images.maxCount), signal);
          if (f) return f;
        }
      } catch (e) {
        const n = sampleNote(e, "Enquadramento");
        if (n) notes.push(n);
      }
    }
    return CENTER;
  })().catch(() => CENTER);

  onProgress({ step: "audio" });
  const pcm = await decodeAudio(file).catch(() => null);
  const audio = pcm ? to16k(pcm) : null;
  if (signal.aborted) throw new DOMException("cancelado", "AbortError");
  const frameDb = audio ? frameEnergy(audio) : null;
  const { speech, speechDb } = frameDb ? detectSpeech(frameDb) : { speech: [], speechDb: null };
  if (!audio) notes.push("Não conseguimos ler o áudio deste arquivo neste navegador: sem cortes de pausa nem legendas automáticas.");

  let segments: Segment[] = [];
  let transcriptBy: Analysis["transcriptBy"] = "nenhum";
  if (needsTranscript(opts) && audio && speech.length && deps.whisper) {
    onProgress({ step: "transcrever", value: 0, detail: "Baixando o reconhecimento de fala (só na primeira vez)" });
    try {
      const w = deps.whisper;
      const whisper = await loadWhisper(w.manifest, w.importTransformers, (l, t) =>
        onProgress({ step: "transcrever", value: (l / t) * 0.35, detail: `Baixando o reconhecimento de fala: ${Math.round((l / t) * 100)}%` }),
      );
      onProgress({ step: "transcrever", value: 0.35, detail: "Ouvindo a fala" });
      segments = await whisper.transcribe(audio, speech, (d, t) => onProgress({ step: "transcrever", value: 0.35 + 0.65 * (d / Math.max(1, t)), detail: `Ouvindo a fala: trecho ${Math.min(d + 1, t)} de ${t}` }), signal);
      transcriptBy = segments.length ? "whisper" : "nenhum";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      console.warn("[editor] transcrição falhou", e);
      notes.push("A transcrição automática não rodou neste navegador.");
    }
  }
  if (!segments.length && opts.script.trim()) {
    segments = segmentsFromScript(opts.script, speech, duration);
    transcriptBy = segments.length ? "roteiro" : "nenhum";
    if (segments.length) notes.push("Legendas feitas a partir do roteiro colado, com tempo aproximado.");
  }
  if (opts.captions && !segments.length && audio) notes.push("Sem legendas: cole o roteiro no passo Detalhes para legendar.");

  let review = segments.length ? localReview(segments) : null;
  if (segments.length && deps.sample) {
    onProgress({ step: "revisar", detail: "Claude revisando o texto, os cortes e as regras da OAB" });
    try {
      review = await reviewWithClaude(deps.sample, segments, opts, signal);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      const n = sampleNote(e, "Revisão");
      if (n) notes.push(n);
    }
  }

  const face = await framing;
  probe.removeAttribute("src");
  probe.load();
  return {
    duration,
    width,
    height,
    audio,
    pcm,
    frameDb,
    speech,
    silences: [],
    speechDb,
    segments: review?.segments ?? segments,
    transcriptBy,
    review,
    face,
    notes,
  };
}

export interface RenderInputs {
  look: Look;
  plan: Plan;
  words: Word[];
  title: string;
  cta: string;
}

export function renderInputs(a: Analysis, opts: EditOptions): RenderInputs {
  const look = lookFor(opts);
  const plan = buildPlan(a, opts, look);
  const raw = markKeywords(wordsFromSegments(a.segments, a.speech), a.review?.keywords ?? []);
  const cut = new Set(opts.removeMistakes ? (a.review?.cutIds ?? []) : []);
  const kept = cut.size ? raw.filter((w) => !a.segments.some((s) => cut.has(s.id) && w.start >= s.start - 0.01 && w.start < s.end)) : raw;
  return {
    look,
    plan,
    words: wordsToOut(kept, plan.keep),
    title: opts.hookText.trim() || a.review?.title || "",
    cta: opts.ctaText.trim() || a.review?.cta || "Siga para mais conteúdos",
  };
}

export async function loadLogo(blob: Blob | null): Promise<CanvasImageSource | null> {
  if (!blob) return null;
  try {
    if (typeof createImageBitmap === "function") return await createImageBitmap(blob);
  } catch {
    // cai para <img>
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(blob);
  });
}

import { ALL_FORMATS, BlobSource, Input } from 'mediabunny';
import { backend } from '../backend';
import { blobs } from '../idb';
import { probeVideo, renderVideo } from '../render/render';
import { PACE_SILENCE, buildTimeline, effectiveSettings } from '../render/timeline';
import { titleFromFile } from '../defaults';
import type { EditPlan, Project, Transcript } from '../types';
import { ANALYSIS_RATE, decodeAudio, detectVoice, energyProfile, resample, type DecodedAudio } from './audio';
import { ServiceUnavailable, automaticPlan, requestPlan, transcribe } from './ai';
import type { StageId } from './job';

const MAX_DURATION = 20 * 60;

async function save(project: Project) {
  project.updatedAt = new Date().toISOString();
  await backend.saveProject(project);
}

export async function run(original: Project, reuseTranscript: boolean, signal: AbortSignal, update: (s: StageId, p: number) => void, warnings: string[]) {
  const project: Project = { ...original, status: 'processing', error: null };
  const settings = project.settings;
  const file = await blobs.get(project.id, 'source');
  if (!file) throw new Error('O vídeo original não está salvo neste navegador. Crie um novo projeto e envie o arquivo de novo.');

  update('preparando', 0.2);
  const info = await probeVideo(file);
  if (info.duration > MAX_DURATION) throw new Error('O vídeo passa de 20 minutos. Corte em partes menores e envie de novo.');
  project.sourceDuration = info.duration;
  await save(project);
  update('preparando', 1);

  // Áudio: decodifica, prepara a versão de análise e encontra os trechos com voz.
  let audio: DecodedAudio | null = null;
  let mono: Float32Array | null = null;
  let db: Float32Array | null = null;
  let voice: [number, number][] | null = null;
  if (info.hasAudio) {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const track = await input.getPrimaryAudioTrack();
      if (track && (await track.canDecode())) {
        audio = await decodeAudio(track, info.duration, (p) => update('audio', p * 0.8), signal);
        mono = (await resample(audio, ANALYSIS_RATE, true))[0];
        db = energyProfile(mono);
        voice = detectVoice(db, info.duration, PACE_SILENCE[settings.ai.pace]);
      } else {
        warnings.push('Não conseguimos ler o áudio deste vídeo: ele sai sem som original e sem legendas.');
      }
    } finally {
      input.dispose();
    }
  } else {
    warnings.push('O vídeo não tem áudio, então não há legendas nem cortes de pausas.');
  }
  update('audio', 1);

  let transcript: Transcript | null = reuseTranscript ? original.transcript : null;
  if (transcript && Math.abs(transcript.duration - info.duration) > 2) transcript = null;
  if (!transcript && mono && db) {
    try {
      transcript = await transcribe(mono, db, settings.language, (p) => update('transcricao', p), signal);
      project.transcript = transcript;
      await save(project);
    } catch (error) {
      if (signal.aborted) throw error;
      if (!(error instanceof ServiceUnavailable)) throw error;
      warnings.push(`Sem legendas nesta edição: ${error.message}`);
    }
  }
  if (transcript && transcript.words.length === 0) warnings.push('Não detectamos fala no vídeo, então ele saiu sem legendas.');
  update('transcricao', 1);

  // Planejamento com IA (o progresso é estimado enquanto a IA pensa).
  let plan: EditPlan;
  const startedPlan = performance.now();
  const ticker = setInterval(() => update('planejamento', 1 - Math.exp(-(performance.now() - startedPlan) / 14000)), 400);
  try {
    if (transcript && transcript.words.length) {
      try {
        plan = await requestPlan(transcript, info.duration, settings, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        const reason = error instanceof Error ? error.message : 'erro desconhecido';
        warnings.push(`A IA de planejamento não respondeu (${reason}). Usamos a edição automática.`);
        if (settings.prompt.trim()) warnings.push('Seu pedido adicional não foi aplicado nesta edição. Gere de novo quando a IA estiver disponível.');
        plan = automaticPlan(transcript, settings, project.title);
      }
    } else {
      if (settings.prompt.trim()) warnings.push('Seu pedido adicional não foi aplicado porque não havia fala transcrita.');
      plan = automaticPlan(transcript, settings, project.title);
    }
  } finally {
    clearInterval(ticker);
  }
  update('planejamento', 1);

  const eff = effectiveSettings(settings, plan);
  const timeline = buildTimeline({
    duration: info.duration,
    voice,
    words: transcript?.words ?? [],
    plan,
    settings,
    captions: { ...eff.captions, enabled: eff.captions.enabled && Boolean(transcript?.words.length) },
    intro: eff.vinheta.intro,
    outro: eff.vinheta.outro,
  });

  const logoBlob = eff.vinheta.hasLogo ? await blobs.get(project.id, 'logo') : undefined;
  const logo = logoBlob ? await createImageBitmap(logoBlob).catch(() => null) : null;

  const result = await renderVideo({
    file,
    audio,
    timeline,
    format: settings.format,
    fit: settings.fit,
    captions: eff.captions,
    vinheta: eff.vinheta,
    logo,
    signal,
    onProgress: (p) => update('renderizacao', p),
  });
  logo?.close();

  update('salvando', 0.3);
  project.outputExt = result.ext;
  const uploadWarning = await backend.saveOutput(project, result.blob);
  if (uploadWarning) warnings.push(uploadWarning);

  // A IA só dá nome ao projeto se o usuário não escolheu um (título ainda é o nome do arquivo).
  const autoTitle = !original.plan && project.sourceName !== null && project.title === titleFromFile(project.sourceName);
  Object.assign(project, {
    status: 'ready',
    title: autoTitle && plan.source === 'ia' && plan.title ? plan.title : project.title,
    plan,
    outputDuration: timeline.total,
    thumbnail: result.thumbnail,
    error: null,
    report: {
      removedSeconds: timeline.removedSeconds,
      cuts: timeline.cuts,
      captions: timeline.pages.length,
      zooms: timeline.zooms.length,
      warnings: [...warnings],
      codec: result.codec,
    },
  } satisfies Partial<Project>);
  await save(project);
  update('salvando', 1);
}

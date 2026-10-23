import { backend } from '../backend';
import type { Project } from '../types';

export type StageId = 'preparando' | 'audio' | 'transcricao' | 'planejamento' | 'renderizacao' | 'salvando';

export const STAGES: { id: StageId; label: string; weight: number }[] = [
  { id: 'preparando', label: 'Lendo o vídeo', weight: 0.03 },
  { id: 'audio', label: 'Analisando o áudio e as pausas', weight: 0.07 },
  { id: 'transcricao', label: 'Transcrevendo a fala', weight: 0.22 },
  { id: 'planejamento', label: 'Planejando a edição e lendo seu pedido', weight: 0.18 },
  { id: 'renderizacao', label: 'Montando o vídeo final', weight: 0.45 },
  { id: 'salvando', label: 'Salvando no projeto', weight: 0.05 },
];

export interface JobState {
  projectId: string;
  stage: StageId;
  stageProgress: number;
  progress: number;
  status: 'running' | 'done' | 'error';
  error: string | null;
  warnings: string[];
}

interface Job {
  state: JobState;
  controller: AbortController;
  listeners: Set<(s: JobState) => void>;
}

const jobs = new Map<string, Job>();

export const getJob = (projectId: string) => jobs.get(projectId)?.state ?? null;

export function subscribeJob(projectId: string, cb: (s: JobState) => void) {
  const job = jobs.get(projectId);
  if (!job) return () => undefined;
  job.listeners.add(cb);
  return () => {
    job.listeners.delete(cb);
  };
}

export function cancelJob(projectId: string) {
  jobs.get(projectId)?.controller.abort();
}

/** Algum projeto está sendo processado? (para avisar antes de fechar a aba) */
export const hasRunningJobs = () => [...jobs.values()].some((j) => j.state.status === 'running');

function overall(stage: StageId, p: number) {
  let total = 0;
  for (const s of STAGES) {
    if (s.id === stage) return total + s.weight * Math.max(0, Math.min(1, p));
    total += s.weight;
  }
  return total;
}

export function startJob(project: Project, opts: { reuseTranscript: boolean }) {
  if (jobs.get(project.id)?.state.status === 'running') return;
  const job: Job = {
    controller: new AbortController(),
    listeners: new Set(),
    state: { projectId: project.id, stage: 'preparando', stageProgress: 0, progress: 0, status: 'running', error: null, warnings: [] },
  };
  jobs.set(project.id, job);
  const emit = () => job.listeners.forEach((cb) => cb({ ...job.state }));
  const update = (stage: StageId, p: number) => {
    job.state.stage = stage;
    job.state.stageProgress = p;
    job.state.progress = overall(stage, p);
    emit();
  };

  // O motor de vídeo é carregado só quando uma edição começa (deixa o app mais leve).
  import('./run')
    .then(({ run }) => run(project, opts.reuseTranscript, job.controller.signal, update, job.state.warnings))
    .then(() => {
      job.state.status = 'done';
      job.state.progress = 1;
      emit();
    })
    .catch(async (error: unknown) => {
      const canceled = job.controller.signal.aborted;
      const message = canceled ? 'A edição foi cancelada.' : friendlyError(error);
      if (!canceled) console.error(error);
      // Salva antes de avisar, para quem estiver olhando recarregar já com o erro.
      const latest = (await backend.getProject(project.id).catch(() => null)) ?? project;
      await backend.saveProject({ ...latest, status: 'error', error: message, updatedAt: new Date().toISOString() }).catch(() => undefined);
      job.state.status = 'error';
      job.state.error = message;
      emit();
    });
}

function friendlyError(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'O navegador ficou sem espaço para salvar o vídeo. Apague projetos antigos e tente de novo.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Algo deu errado durante a edição. Tente de novo.';
}

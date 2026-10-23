import { ArrowLeft, Check, CircleDot, Download, Loader2, RotateCcw, SlidersHorizontal, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Button, ButtonLink, Notice, buttonClass, formatDate, formatTime } from '../components/ui';
import { backend } from '../lib/backend';
import { STAGES, cancelJob, getJob, startJob, subscribeJob, type JobState } from '../lib/pipeline/job';
import type { InstructionStatus, Project } from '../lib/types';

function slug(text: string) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'video-tribuna'
  );
}

function Processing({ project, job }: { project: Project; job: JobState }) {
  const currentIndex = STAGES.findIndex((s) => s.id === job.stage);
  const visibleStages = STAGES.filter((s) => s.id !== 'transcricao' || !project.transcript || job.stage === 'transcricao');
  return (
    <div className="mx-auto max-w-2xl">
      <div className="panel overflow-hidden">
        <div className="stage-light px-6 pt-10 pb-8 sm:px-10">
          <p className="text-sm font-medium text-spot">Editando</p>
          <h1 className="mt-1 font-display text-[30px] leading-tight font-bold tracking-[-0.02em] sm:text-[36px]">{project.title}</h1>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress * 100)} aria-label="Progresso da edição">
              <div className="h-full rounded-full bg-spot transition-[width] duration-500" style={{ width: `${Math.max(2, job.progress * 100)}%` }} />
            </div>
            <span className="w-12 text-right text-sm font-semibold tabular-nums">{Math.round(job.progress * 100)}%</span>
          </div>
        </div>
        <ol className="divide-y divide-line-soft px-6 sm:px-10">
          {visibleStages.map((stage) => {
            const index = STAGES.findIndex((s) => s.id === stage.id);
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <li key={stage.id} className="flex items-center gap-4 py-4" aria-current={active ? 'step' : undefined}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-mint/15 text-mint' : active ? 'bg-spot/15 text-spot' : 'bg-raised text-faint'}`}>
                  {done ? <Check className="size-4" aria-hidden /> : active ? <Loader2 className="size-4 animate-[spin_1s_linear_infinite]" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className={`flex-1 text-[15px] ${active ? 'font-semibold text-text' : done ? 'text-muted' : 'text-faint'}`}>{stage.label}</span>
                {active && stage.id !== 'planejamento' && <span className="text-sm text-muted tabular-nums">{Math.round(job.stageProgress * 100)}%</span>}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-3 border-t border-line-soft px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-sm text-muted">Mantenha esta aba aberta. Você pode navegar pelo app enquanto isso.</p>
          <Button variant="secondary" size="sm" onClick={() => cancelJob(project.id)}>
            Cancelar edição
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_ICON: Record<InstructionStatus, { icon: typeof Check; className: string; label: string }> = {
  feito: { icon: Check, className: 'text-mint', label: 'Feito' },
  parcial: { icon: CircleDot, className: 'text-spot', label: 'Em parte' },
  nao_possivel: { icon: XCircle, className: 'text-danger', label: 'Não foi possível' },
};

function Result({ project, videoUrl, onDelete }: { project: Project; videoUrl: string | null; onDelete: () => void }) {
  const report = project.report;
  const plan = project.plan;
  const vertical = project.settings.format === '9:16';
  const stats = [
    ['Duração final', formatTime(project.outputDuration), project.sourceDuration ? `antes: ${formatTime(project.sourceDuration)}` : null],
    ['Tempo cortado', report ? `${Math.round(report.removedSeconds)} s` : '--', null],
    ['Cortes', report ? String(report.cuts) : '--', null],
    ['Trechos de legenda', report ? String(report.captions) : '--', null],
  ] as const;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className={`mx-auto w-full ${vertical ? 'max-w-[420px]' : ''}`}>
        {videoUrl ? (
          <video key={videoUrl} src={videoUrl} poster={project.thumbnail ?? undefined} controls playsInline className="w-full rounded-[var(--radius-frame)] bg-black ring-1 ring-line-soft" />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center rounded-[var(--radius-frame)] bg-panel text-center text-sm text-muted">
            Carregando o vídeo…
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-mint">Pronto</p>
          <h1 className="mt-1 font-display text-[30px] leading-tight font-bold tracking-[-0.02em]">{project.title}</h1>
          <p className="mt-1 text-sm text-muted">Editado {formatDate(project.updatedAt).toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={videoUrl ?? undefined} download={`${slug(project.title)}.${project.outputExt ?? 'mp4'}`} className={buttonClass('primary', 'md', videoUrl ? '' : 'pointer-events-none opacity-45')}>
            <Download className="size-4" aria-hidden /> Baixar vídeo
          </a>
          <ButtonLink to={`/projeto/${project.id}/ajustar`} variant="secondary" icon={<SlidersHorizontal className="size-4" aria-hidden />}>
            Ajustar e gerar de novo
          </ButtonLink>
        </div>

        <section className="panel p-5" aria-labelledby="done-title">
          <h2 id="done-title" className="font-display text-lg font-bold">
            O que foi feito
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            {stats.map(([label, value, sub]) => (
              <div key={label}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums">{value}</dd>
                {sub && <dd className="text-xs text-faint">{sub}</dd>}
              </div>
            ))}
          </dl>
          {plan?.summary && <p className="mt-4 border-t border-line-soft pt-4 text-sm leading-relaxed text-muted">{plan.summary}</p>}
        </section>

        {project.settings.prompt && (
          <section className="panel p-5" aria-labelledby="prompt-title">
            <h2 id="prompt-title" className="font-display text-lg font-bold">
              Seu pedido para a IA
            </h2>
            <blockquote className="mt-3 border-l-2 border-spot/60 pl-3 text-sm leading-relaxed whitespace-pre-line text-muted">{project.settings.prompt}</blockquote>
            {plan && plan.instructions.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {plan.instructions.map((ins, i) => {
                  const st = STATUS_ICON[ins.status] ?? STATUS_ICON.parcial;
                  const Icon = st.icon;
                  return (
                    <li key={i} className="flex gap-3">
                      <Icon className={`mt-0.5 size-[18px] shrink-0 ${st.className}`} aria-label={st.label} />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-text">{ins.request}</p>
                        <p className="mt-0.5 leading-relaxed text-muted">{ins.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-spot">Este pedido não foi aplicado nesta versão. Veja o aviso abaixo.</p>
            )}
          </section>
        )}

        {report && report.warnings.length > 0 && (
          <Notice tone="warn">
            <ul className="space-y-1.5">
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Notice>
        )}

        <div className="border-t border-line-soft pt-5">
          <Button variant="ghost" size="sm" onClick={onDelete} icon={<Trash2 className="size-4" aria-hidden />}>
            Excluir projeto
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProjectPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [job, setJob] = useState<JobState | null>(() => getJob(id));
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  const load = useCallback(async () => {
    const p = await backend.getProject(id);
    if (!p) setMissing(true);
    setProject(p);
  }, [id]);

  useEffect(() => {
    load();
    setJob(getJob(id));
    return subscribeJob(id, (s) => {
      setJob(s);
      if (s.status !== 'running') load();
    });
  }, [id, load, runId]);

  const restart = (reuseTranscript: boolean) => {
    if (!project) return;
    startJob(project, { reuseTranscript });
    setRunId((r) => r + 1);
  };

  useEffect(() => {
    if (!project || project.status !== 'ready') return;
    let url: string | null = null;
    let alive = true;
    backend.outputUrl(project).then((u) => {
      url = u;
      if (alive) setVideoUrl(u);
    });
    return () => {
      alive = false;
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [project]);

  const remove = async () => {
    if (!project || !window.confirm(`Excluir "${project.title}"? O vídeo editado também será apagado.`)) return;
    await backend.deleteProject(project);
    navigate('/projetos');
  };

  const running = job?.status === 'running';

  return (
    <AppShell>
      <Link to="/projetos" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Projetos
      </Link>

      {missing && <Notice tone="error">Este projeto não existe ou foi excluído.</Notice>}
      {!project && !missing && <div className="h-96 animate-pulse rounded-[18px] bg-panel" />}

      {project && running && job && <Processing project={project} job={job} />}

      {project && !running && project.status === 'ready' && <Result project={project} videoUrl={videoUrl} onDelete={remove} />}

      {project && !running && project.status !== 'ready' && (
        <div className="mx-auto max-w-xl panel p-6 sm:p-8">
          <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.02em]">{project.title}</h1>
          <div className="mt-4">
            {project.status === 'error' ? (
              <Notice tone="error">{project.error ?? 'A edição falhou.'}</Notice>
            ) : project.status === 'processing' ? (
              <Notice tone="warn">A edição foi interrompida porque a página foi fechada ou recarregada antes de terminar.</Notice>
            ) : (
              <Notice>Este vídeo ainda não foi gerado.</Notice>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => restart(true)} icon={<RotateCcw className="size-4" aria-hidden />}>
              Gerar de novo
            </Button>
            <ButtonLink to={`/projeto/${project.id}/ajustar`} variant="secondary" icon={<SlidersHorizontal className="size-4" aria-hidden />}>
              Ajustar opções
            </ButtonLink>
            <Button variant="ghost" onClick={remove} icon={<Trash2 className="size-4" aria-hidden />}>
              Excluir
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

import { AlertTriangle, Film, MoreHorizontal, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DropZone, isVideoFile } from '../components/DropZone';
import { Notice, formatDate, formatTime } from '../components/ui';
import { backend } from '../lib/backend';
import { useAuth } from '../lib/auth';
import { setPendingFile } from '../lib/pending';
import { getJob, subscribeJob, type JobState } from '../lib/pipeline/job';
import type { Project } from '../lib/types';

const FORMAT_LABEL: Record<string, string> = { '9:16': '9:16', '1:1': '1:1', '16:9': '16:9', original: 'Original' };

function ProjectMenu({ project, onRename, onDelete }: { project: Project; onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Opções de ${project.title}`}
        aria-expanded={open}
        className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-[12px] border border-line bg-panel py-1 shadow-xl shadow-black/40">
          <button role="menuitem" type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-raised" onClick={() => (setOpen(false), onRename())}>
            <Pencil className="size-4 text-muted" aria-hidden /> Renomear
          </button>
          <button role="menuitem" type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-danger hover:bg-raised" onClick={() => (setOpen(false), onDelete())}>
            <Trash2 className="size-4" aria-hidden /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectTile({ project, job, onChanged }: { project: Project; job: JobState | null; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(project.title);
  const running = job?.status === 'running';
  const interrupted = project.status === 'processing' && !running;

  const saveTitle = async () => {
    setRenaming(false);
    const next = title.trim();
    if (!next || next === project.title) return setTitle(project.title);
    await backend.saveProject({ ...project, title: next, updatedAt: new Date().toISOString() });
    onChanged();
  };

  const remove = async () => {
    if (running) return window.alert('Espere a edição terminar (ou cancele) antes de excluir este projeto.');
    if (!window.confirm(`Excluir "${project.title}"? O vídeo editado também será apagado.`)) return;
    await backend.deleteProject(project);
    onChanged();
  };

  return (
    <article>
      <Link to={`/projeto/${project.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[18px] bg-raised ring-1 ring-line-soft transition hover:ring-[#36636d]">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center bg-[linear-gradient(160deg,#1b3a42,#12262b)]">
            <Film className="size-9 text-faint" aria-hidden />
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 rounded-md bg-ink/75 px-1.5 py-0.5 text-[11px] font-semibold text-muted backdrop-blur">{FORMAT_LABEL[project.settings.format]}</span>
        {project.status === 'ready' && !running && (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold tabular-nums backdrop-blur">{formatTime(project.outputDuration)}</span>
        )}
        {running && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent px-3 pt-10 pb-3">
            <p className="text-xs font-semibold text-spot">Editando {Math.round(job.progress * 100)}%</p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-spot transition-[width] duration-300" style={{ width: `${job.progress * 100}%` }} />
            </div>
          </div>
        )}
        {(project.status === 'error' || interrupted) && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-danger/90 px-2 py-0.5 text-xs font-semibold text-ink">
            <AlertTriangle className="size-3.5" aria-hidden /> {interrupted ? 'Interrompido' : 'Falhou'}
          </span>
        )}
        {project.status === 'draft' && !running && <span className="absolute bottom-2.5 left-2.5 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold text-muted">Não gerado</span>}
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              className="field py-1.5 text-[15px]"
              value={title}
              aria-label="Nome do projeto"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                  setTitle(project.title);
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <h3 className="truncate text-[15px] font-semibold">{project.title}</h3>
          )}
          <p className="mt-0.5 text-sm text-muted">{formatDate(project.updatedAt)}</p>
        </div>
        <ProjectMenu project={project} onRename={() => setRenaming(true)} onDelete={remove} />
      </div>
    </article>
  );
}

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Record<string, JobState>>({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setProjects(await backend.listProjects(user.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os projetos.');
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Acompanha as edições que estão rodando para mostrar o progresso no card.
  useEffect(() => {
    if (!projects) return;
    const offs = projects.map((p) => {
      const state = getJob(p.id);
      if (state) setJobs((j) => ({ ...j, [p.id]: state }));
      return subscribeJob(p.id, (s) => {
        setJobs((j) => ({ ...j, [p.id]: s }));
        if (s.status !== 'running') load();
      });
    });
    return () => offs.forEach((off) => off());
  }, [projects, load]);

  const onFile = (file: File) => {
    if (!isVideoFile(file)) return setError('Esse arquivo não parece ser um vídeo. Envie um MP4, MOV ou WebM.');
    setPendingFile(file);
    navigate('/novo');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => !q || p.title.toLowerCase().includes(q));
  }, [projects, query]);

  const firstName = user?.name.split(' ')[0];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-bold tracking-[-0.02em] sm:text-[40px]">Projetos</h1>
          <p className="mt-1 text-muted">{firstName ? `Olá, ${firstName}. ` : ''}Todos os seus vídeos ficam aqui.</p>
        </div>
        {projects && projects.length > 4 && (
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Buscar projeto</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input className="field pl-10" placeholder="Buscar projeto" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
      </div>

      {error && (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {projects === null && !error && (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-[18px] bg-raised/60" />
          ))}
        </div>
      )}

      {projects && projects.length === 0 && (
        <div className="mt-8">
          <DropZone onFile={onFile} label="Enviar o primeiro vídeo" className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-spot text-spot-ink">
              <Upload className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold tracking-[-0.01em]">Envie seu primeiro vídeo</h2>
            <p className="mt-2 max-w-md text-muted">Arraste o arquivo para cá ou clique para escolher. MP4, MOV ou WebM, com até 20 minutos.</p>
          </DropZone>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Envie o vídeo', 'Do jeito que gravou, com pausas e erros.'],
              ['Escolha o estilo', 'Legenda, formato, vinheta e o que a IA deve fazer.'],
              ['Baixe pronto', 'Você assiste quando a edição termina e baixa em MP4.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised font-display text-sm font-bold text-spot">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="mt-0.5 block text-sm text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <div>
            <DropZone onFile={onFile} label="Novo vídeo: arraste ou clique para enviar" className="flex aspect-[3/4] flex-col items-center justify-center rounded-[18px] px-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-spot text-spot-ink">
                <Upload className="size-5" aria-hidden />
              </span>
              <span className="mt-4 font-display text-lg font-bold">Novo vídeo</span>
              <span className="mt-1 text-sm text-muted">Arraste ou clique para enviar</span>
            </DropZone>
          </div>
          {filtered.map((p) => (
            <ProjectTile key={p.id + p.updatedAt} project={p} job={jobs[p.id] ?? null} onChanged={load} />
          ))}
          {filtered.length === 0 && <p className="col-span-full text-muted">Nenhum projeto com "{query}".</p>}
        </div>
      )}
    </AppShell>
  );
}

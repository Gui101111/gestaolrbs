import { ArrowLeft, Film, ImagePlus, Sparkles, X } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CaptionSample } from '../components/CaptionSample';
import { DropZone, isVideoFile } from '../components/DropZone';
import { Button, FieldLabel, Notice, Segmented, Swatches, Toggle, formatBytes, formatTime } from '../components/ui';
import { backend } from '../lib/backend';
import { useAuth } from '../lib/auth';
import { ACCENTS, defaultSettings, newProject, titleFromFile, withDefaults } from '../lib/defaults';
import { blobs } from '../lib/idb';
import { takePendingFile } from '../lib/pending';
import { startJob } from '../lib/pipeline/job';
import { CAPTION_STYLES, CAPTION_STYLE_IDS } from '../lib/render/captions';
import type { AiSettings, CaptionSettings, Project, ProjectSettings, VinhetaSettings } from '../lib/types';

function Section({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="panel p-5 sm:p-6">
      <h2 id={id} className="font-display text-xl font-bold tracking-[-0.01em]">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const PROMPT_EXAMPLES = [
  'Deixe o vídeo com no máximo 60 segundos.',
  'Corte a parte em que eu erro e repito a frase.',
  'Destaque os números e os preços nas legendas.',
  'Coloque um título chamativo no começo.',
  'Use legendas verdes e em maiúsculas.',
];

interface FileInfo {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export function NewVideoPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [existing, setExisting] = useState<Project | null>(null);
  const [settings, setSettings] = useState<ProjectSettings>(defaultSettings);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hasStoredSource, setHasStoredSource] = useState(false);
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);

  const setCaptions = (patch: Partial<CaptionSettings>) => setSettings((s) => ({ ...s, captions: { ...s.captions, ...patch } }));
  const setAi = (patch: Partial<AiSettings>) => setSettings((s) => ({ ...s, ai: { ...s.ai, ...patch } }));
  const setVinheta = (patch: Partial<VinhetaSettings>) => setSettings((s) => ({ ...s, vinheta: { ...s.vinheta, ...patch } }));

  const chooseFile = async (f: File) => {
    setFileError(null);
    if (!isVideoFile(f)) return setFileError('Esse arquivo não parece ser um vídeo. Envie um MP4, MOV ou WebM.');
    setFile(f);
    setInfo(null);
    if (!title || (!editing && file && title === titleFromFile(file.name))) setTitle(titleFromFile(f.name));
    setProbing(true);
    try {
      const { probeVideo } = await import('../lib/render/render');
      const probe = await probeVideo(f);
      if (probe.duration > 20 * 60) {
        setFile(null);
        setFileError('O vídeo passa de 20 minutos. Corte em partes menores e envie de novo.');
      } else setInfo(probe);
    } catch (e) {
      setFile(null);
      setFileError(e instanceof Error ? e.message : 'Não conseguimos ler este arquivo.');
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    if (editing) return;
    const pending = takePendingFile();
    if (pending) chooseFile(pending);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const p = await backend.getProject(id);
      if (!alive) return;
      if (!p) {
        navigate('/projetos', { replace: true });
        return;
      }
      setExisting(p);
      setSettings(withDefaults(p.settings));
      setTitle(p.title);
      const source = await blobs.get(p.id, 'source');
      setHasStoredSource(Boolean(source));
      if (p.sourceDuration) setInfo({ duration: p.sourceDuration, width: 0, height: 0, hasAudio: true });
      const storedLogo = await blobs.get(p.id, 'logo');
      if (storedLogo && alive) setLogo(new File([storedLogo], 'logo', { type: storedLogo.type }));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!logo) return setLogoUrl(null);
    const url = URL.createObjectURL(logo);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const sourceReady = Boolean(file && info) || (editing && hasStoredSource && !file);
  const vinhetaOn = settings.vinheta.intro || settings.vinheta.outro;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!sourceReady) return setError(editing ? 'Envie o vídeo de novo: o original não está mais salvo neste navegador.' : 'Escolha o vídeo que você quer editar.');
    if (settings.vinheta.intro && !settings.vinheta.title.trim() && !logo) return setError('Escreva o título da vinheta de abertura ou envie um logo.');
    setSubmitting(true);
    try {
      const finalSettings: ProjectSettings = { ...settings, prompt: settings.prompt.trim(), vinheta: { ...settings.vinheta, hasLogo: Boolean(logo) } };
      let project: Project;
      let reuseTranscript = false;
      if (existing) {
        reuseTranscript = !file && existing.settings.language === finalSettings.language;
        project = {
          ...existing,
          title: title.trim() || existing.title,
          settings: finalSettings,
          transcript: reuseTranscript ? existing.transcript : null,
          ...(file ? { sourceName: file.name, sourceSize: file.size, sourceDuration: info?.duration ?? null } : {}),
        };
      } else {
        project = newProject(user, finalSettings, file!);
        if (title.trim()) project.title = title.trim();
        project.sourceDuration = info?.duration ?? null;
      }
      if (file) await blobs.put(project.id, 'source', file);
      if (logo) await blobs.put(project.id, 'logo', logo);
      else await blobs.delete(project.id, 'logo');
      project = { ...project, status: 'processing', error: null, updatedAt: new Date().toISOString() };
      await backend.saveProject(project);
      startJob(project, { reuseTranscript });
      navigate(`/projeto/${project.id}`);
    } catch (err) {
      const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
      setError(quota ? 'O navegador está sem espaço para guardar o vídeo. Exclua projetos antigos e tente de novo.' : err instanceof Error ? err.message : 'Não foi possível iniciar a edição.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell showNew={false}>
        <div className="h-96 animate-pulse rounded-[18px] bg-panel" />
      </AppShell>
    );
  }

  const styleCards = CAPTION_STYLE_IDS.map((sid) => ({ id: sid, ...CAPTION_STYLES[sid] }));

  const generateButton = (
    <Button type="submit" form="new-video" size="lg" className="w-full" loading={submitting} disabled={!sourceReady || probing} icon={<Sparkles className="size-5" aria-hidden />}>
      {editing ? 'Gerar de novo' : 'Gerar vídeo'}
    </Button>
  );

  return (
    <AppShell showNew={false}>
      <Link to={editing && existing ? `/projeto/${existing.id}` : '/projetos'} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {editing ? 'Voltar para o projeto' : 'Projetos'}
      </Link>
      <h1 className="mt-3 font-display text-[34px] leading-tight font-bold tracking-[-0.02em] sm:text-[40px]">{editing ? 'Ajustar e gerar de novo' : 'Novo vídeo'}</h1>
      <p className="mt-1 max-w-2xl text-muted">Escolha como o vídeo deve ficar. Você só assiste ao resultado quando a edição terminar.</p>

      <form id="new-video" onSubmit={submit} className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Section id="s-video" title="Vídeo">
            {file || (editing && hasStoredSource) ? (
              <div className="flex items-center gap-4 rounded-[14px] bg-raised/60 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink text-spot">
                  <Film className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{file?.name ?? existing?.sourceName ?? 'Vídeo original'}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {probing ? 'Lendo o arquivo…' : [info?.duration ? `${formatTime(info.duration)} de duração` : null, formatBytes(file?.size ?? existing?.sourceSize)].filter(Boolean).join(', ')}
                  </p>
                  {info && !info.hasAudio && <p className="mt-1 text-sm text-spot">Este vídeo não tem áudio: ele sai sem legendas.</p>}
                </div>
                <label className="cursor-pointer text-sm font-medium text-spot hover:underline">
                  Trocar
                  <input type="file" accept="video/*,.mov,.mkv" className="sr-only" onChange={(e) => e.target.files?.[0] && chooseFile(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <DropZone onFile={chooseFile} label="Escolher o vídeo" className="flex flex-col items-center rounded-[18px] px-6 py-10 text-center">
                <span className="font-display text-lg font-bold">Arraste o vídeo para cá</span>
                <span className="mt-1 text-sm text-muted">ou clique para escolher. MP4, MOV ou WebM, até 20 minutos.</span>
              </DropZone>
            )}
            {editing && !hasStoredSource && !file && <div className="mt-3"><Notice tone="warn">O vídeo original não está salvo neste navegador. Envie o arquivo de novo para gerar outra versão.</Notice></div>}
            {fileError && <p role="alert" className="mt-3 text-sm text-danger">{fileError}</p>}
            <div className="mt-5">
              <FieldLabel htmlFor="title">Nome do projeto</FieldLabel>
              <input id="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Dica rápida de segunda" />
            </div>
          </Section>

          <Section id="s-format" title="Formato" description="Onde o vídeo vai ser publicado.">
            <Segmented
              label="Formato do vídeo"
              wrap
              value={settings.format}
              onChange={(format) => setSettings((s) => ({ ...s, format }))}
              options={[
                { value: '9:16', label: 'Vertical', hint: 'Reels, TikTok' },
                { value: '1:1', label: 'Quadrado', hint: 'Feed' },
                { value: '16:9', label: 'Horizontal', hint: 'YouTube' },
                { value: 'original', label: 'Original', hint: 'Sem mudar' },
              ]}
            />
            {settings.format !== 'original' && (
              <div className="mt-4">
                <FieldLabel>Enquadramento</FieldLabel>
                <Segmented
                  label="Enquadramento"
                  value={settings.fit}
                  onChange={(fit) => setSettings((s) => ({ ...s, fit }))}
                  options={[
                    { value: 'cover', label: 'Preencher a tela' },
                    { value: 'blur', label: 'Inteiro, fundo desfocado' },
                  ]}
                />
              </div>
            )}
          </Section>

          <Section id="s-captions" title="Legendas" description="Geradas a partir da sua fala, sincronizadas palavra por palavra.">
            <Toggle id="cap-on" label="Colocar legendas" checked={settings.captions.enabled} onChange={(enabled) => setCaptions({ enabled })} />
            {settings.captions.enabled && (
              <div className="mt-3 space-y-6">
                <div role="radiogroup" aria-label="Estilo da legenda" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {styleCards.map((st) => {
                    const active = settings.captions.style === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setCaptions({ style: st.id })}
                        className={`rounded-[14px] p-2 text-left transition ${active ? 'bg-raised ring-2 ring-spot' : 'bg-raised/40 ring-1 ring-line-soft hover:ring-[#36636d]'}`}
                      >
                        <CaptionSample plain dims={[1080, 760]} sizeBoost={1.9} settings={{ ...settings.captions, style: st.id, position: 'middle', size: 'md' }} />
                        <span className="mt-2 block px-1 text-sm font-semibold">{st.label}</span>
                        <span className="mb-1 block px-1 text-xs leading-snug text-muted">{st.description}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <FieldLabel>Posição na tela</FieldLabel>
                  <Segmented
                    label="Posição da legenda"
                    value={settings.captions.position}
                    onChange={(position) => setCaptions({ position })}
                    options={[
                      { value: 'bottom', label: 'Embaixo', hint: 'Recomendado' },
                      { value: 'middle', label: 'No centro' },
                      { value: 'top', label: 'Em cima' },
                    ]}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Tamanho</FieldLabel>
                    <Segmented
                      label="Tamanho da legenda"
                      value={settings.captions.size}
                      onChange={(size) => setCaptions({ size })}
                      options={[
                        { value: 'sm', label: 'Pequeno' },
                        { value: 'md', label: 'Médio' },
                        { value: 'lg', label: 'Grande' },
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Cor de destaque</FieldLabel>
                    <Swatches label="Cor de destaque da legenda" colors={ACCENTS} value={settings.captions.color} onChange={(color) => setCaptions({ color })} />
                  </div>
                </div>
                <div className="divide-y divide-line-soft border-t border-line-soft">
                  <Toggle id="cap-upper" label="Tudo em letras maiúsculas" checked={settings.captions.uppercase} onChange={(uppercase) => setCaptions({ uppercase })} />
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <label htmlFor="lang" className="text-[15px] font-medium">
                      Idioma da fala
                    </label>
                    <select id="lang" className="field w-auto min-w-48" value={settings.language} onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value as ProjectSettings['language'] }))}>
                      <option value="pt">Português</option>
                      <option value="en">Inglês</option>
                      <option value="es">Espanhol</option>
                      <option value="auto">Detectar sozinho</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section id="s-ai" title="Edição com IA" description="O que a IA faz automaticamente no seu vídeo.">
            <div className="divide-y divide-line-soft">
              <div>
                <Toggle id="ai-silence" label="Cortar pausas e silêncios" description="Remove os momentos em que você não está falando." checked={settings.ai.removeSilences} onChange={(removeSilences) => setAi({ removeSilences })} />
                {settings.ai.removeSilences && (
                  <div className="pb-4">
                    <Segmented
                      label="Ritmo dos cortes"
                      value={settings.ai.pace}
                      onChange={(pace) => setAi({ pace })}
                      options={[
                        { value: 'suave', label: 'Suave', hint: 'Só pausas longas' },
                        { value: 'equilibrado', label: 'Equilibrado', hint: 'Recomendado' },
                        { value: 'acelerado', label: 'Acelerado', hint: 'Ritmo de Reels' },
                      ]}
                    />
                  </div>
                )}
              </div>
              <Toggle id="ai-fillers" label="Tirar vícios de linguagem e repetições" description={'"Éé", "tipo", "né", gaguejos e frases que você repetiu.'} checked={settings.ai.removeFillers} onChange={(removeFillers) => setAi({ removeFillers })} />
              <Toggle id="ai-zoom" label="Zoom dinâmico" description="Aproxima a imagem nos momentos fortes e disfarça os cortes." checked={settings.ai.zooms} onChange={(zooms) => setAi({ zooms })} />
              <Toggle id="ai-keywords" label="Destacar palavras-chave" description="As palavras mais importantes aparecem na cor de destaque." checked={settings.ai.highlightKeywords} onChange={(highlightKeywords) => setAi({ highlightKeywords })} />
              <Toggle id="ai-hook" label="Título de gancho no início" description="Uma frase curta no topo nos primeiros segundos, criada pela IA." checked={settings.ai.hookTitle} onChange={(hookTitle) => setAi({ hookTitle })} />
            </div>
          </Section>

          <Section id="s-vinheta" title="Vinheta" description="Uma abertura e um encerramento curtos, com o seu nome ou marca.">
            <div className="divide-y divide-line-soft">
              <Toggle id="v-intro" label="Vinheta de abertura" description="2 segundos antes do vídeo." checked={settings.vinheta.intro} onChange={(intro) => setVinheta({ intro })} />
              <Toggle id="v-outro" label="Vinheta de encerramento" description="3 segundos no final." checked={settings.vinheta.outro} onChange={(outro) => setVinheta({ outro })} />
            </div>
            {vinhetaOn && (
              <div className="mt-4 space-y-5 border-t border-line-soft pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Estilo</FieldLabel>
                    <Segmented
                      label="Estilo da vinheta"
                      value={settings.vinheta.style}
                      onChange={(style) => setVinheta({ style })}
                      options={[
                        { value: 'escura', label: 'Escura' },
                        { value: 'clean', label: 'Clara' },
                        { value: 'vibrante', label: 'Colorida' },
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Cor</FieldLabel>
                    <Swatches label="Cor da vinheta" colors={ACCENTS} value={settings.vinheta.color} onChange={(color) => setVinheta({ color })} />
                  </div>
                </div>
                {settings.vinheta.intro && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="v-title">Título da abertura</FieldLabel>
                      <input id="v-title" className="field" maxLength={60} value={settings.vinheta.title} onChange={(e) => setVinheta({ title: e.target.value })} placeholder="Seu nome ou sua marca" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="v-sub" hint="Opcional">Subtítulo</FieldLabel>
                      <input id="v-sub" className="field" maxLength={80} value={settings.vinheta.subtitle} onChange={(e) => setVinheta({ subtitle: e.target.value })} placeholder="Ex.: Dicas de finanças" />
                    </div>
                  </div>
                )}
                {settings.vinheta.outro && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="v-out">Texto do encerramento</FieldLabel>
                      <input id="v-out" className="field" maxLength={60} value={settings.vinheta.outroTitle} onChange={(e) => setVinheta({ outroTitle: e.target.value })} placeholder="Ex.: Siga para mais" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="v-out-sub" hint="Opcional">Subtítulo</FieldLabel>
                      <input id="v-out-sub" className="field" maxLength={80} value={settings.vinheta.outroSubtitle} onChange={(e) => setVinheta({ outroSubtitle: e.target.value })} placeholder="Ex.: @seuperfil" />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  {logoUrl ? (
                    <div className="flex items-center gap-3 rounded-[12px] bg-raised/60 py-2 pr-2 pl-3">
                      <img src={logoUrl} alt="Logo escolhido" className="size-10 rounded-md object-contain" />
                      <span className="text-sm text-muted">Logo da vinheta</span>
                      <button type="button" onClick={() => setLogo(null)} className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text" aria-label="Remover logo">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-raised px-3.5 text-sm font-medium hover:border-[#36636d]">
                      <ImagePlus className="size-4 text-muted" aria-hidden />
                      Enviar logo (opcional)
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && setLogo(e.target.files[0])} />
                    </label>
                  )}
                </div>
                <div className="border-t border-line-soft">
                  <Toggle id="v-sound" label="Som na vinheta" description="Um efeito curto na abertura e no encerramento." checked={settings.vinheta.sound} onChange={(sound) => setVinheta({ sound })} />
                </div>
              </div>
            )}
          </Section>

          <Section
            id="s-prompt"
            title="Pedido para a IA"
            description="Opcional. Escreva do seu jeito o que mais você quer. A IA lê o pedido inteiro e, no final, mostra como atendeu cada item."
          >
            <label htmlFor="prompt" className="sr-only">
              Pedido para a IA
            </label>
            <textarea
              id="prompt"
              rows={5}
              maxLength={4000}
              className="field resize-y leading-relaxed"
              value={settings.prompt}
              onChange={(e) => setSettings((s) => ({ ...s, prompt: e.target.value }))}
              placeholder="Ex.: Corte a parte em que falo do preço antigo e deixe o vídeo com menos de 45 segundos."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPT_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, prompt: s.prompt.trim() ? `${s.prompt.trim()}\n${ex}` : ex }))}
                  className="rounded-full border border-line px-3 py-1.5 text-left text-[13px] text-muted transition-colors hover:border-[#36636d] hover:text-text"
                >
                  {ex}
                </button>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="panel p-5">
            <p className="text-sm font-semibold">Amostra do estilo</p>
            <p className="mt-0.5 text-xs text-muted">Só a aparência da legenda. O seu vídeo aparece quando ficar pronto.</p>
            <div className="mx-auto mt-4 max-w-[230px]">
              <CaptionSample settings={settings.captions} format={settings.format} hook={settings.ai.hookTitle} />
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              {[
                ['Formato', { '9:16': 'Vertical 9:16', '1:1': 'Quadrado 1:1', '16:9': 'Horizontal 16:9', original: 'Original' }[settings.format]],
                ['Legenda', settings.captions.enabled ? `${CAPTION_STYLES[settings.captions.style].label}, ${{ bottom: 'embaixo', middle: 'no centro', top: 'em cima' }[settings.captions.position]}` : 'Desligada'],
                ['Vinheta', settings.vinheta.intro && settings.vinheta.outro ? 'Abertura e encerramento' : settings.vinheta.intro ? 'Abertura' : settings.vinheta.outro ? 'Encerramento' : 'Desligada'],
                ['Pedido para a IA', settings.prompt.trim() ? 'Sim' : 'Nenhum'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="mt-5 hidden lg:block">{generateButton}</div>
            <p className="mt-3 hidden text-xs leading-relaxed text-faint lg:block">A edição roda neste navegador. Mantenha a aba aberta até terminar.</p>
          </div>
        </aside>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-ink/90 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        {error && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        )}
        {generateButton}
      </div>
    </AppShell>
  );
}

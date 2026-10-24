-- =====================================================================
-- Parte 2: edição automática com Claude Managed Agents
--  * editing_sessions: dados internos da sessão do agente (só admin/servidor)
--  * render_jobs: revisão humana e alertas da OAB (visíveis ao dono)
--  * renders.published: entrega só aparece ao cliente depois de liberada
--  * app_settings: provedor de edição trocável sem deploy
--  * processed_webhooks: deduplicação de webhooks
--  * buckets: report.json no rendered-videos e editing-assets (fontes, trilhas)
-- =====================================================================

-- Jobs: revisão humana e alertas ------------------------------------------
alter table public.render_jobs
  add column review_status text not null default 'none' check (review_status in ('none', 'pending', 'released')),
  add column compliance_flags jsonb not null default '[]'::jsonb,
  add column output_version integer;

create index render_jobs_review_idx on public.render_jobs (review_status) where review_status = 'pending';

-- Entregas: publicadas ou aguardando liberação ------------------------------
alter table public.renders
  add column published boolean not null default true;

drop policy "renders: ler os próprios ou admin" on public.renders;
create policy "renders: ler os próprios publicados ou admin" on public.renders
  for select to authenticated
  using ((user_id = (select auth.uid()) and published) or (select public.is_admin()));

-- Sessões do agente (nunca expostas ao navegador do cliente) ----------------
create table public.editing_sessions (
  job_id uuid primary key references public.render_jobs (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('claude', 'claude-local')),
  session_id text not null,
  version integer not null check (version > 0),
  status text not null default 'running'
    check (status in ('running', 'finalizing', 'awaiting_followup', 'in_review', 'delivered', 'failed', 'archived')),
  stop_reason text,
  followups integer not null default 0,
  usage jsonb,
  cost_cents integer,
  active_seconds integer,
  report jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index editing_sessions_project_idx on public.editing_sessions (project_id, created_at desc);
create index editing_sessions_session_idx on public.editing_sessions (session_id, created_at desc);
create index editing_sessions_status_idx on public.editing_sessions (status, started_at);

create trigger editing_sessions_updated_at before update on public.editing_sessions
  for each row execute function public.set_updated_at();

alter table public.editing_sessions enable row level security;
create policy "editing_sessions: admin lê" on public.editing_sessions
  for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.editing_sessions from authenticated, anon;

-- Configurações da plataforma (admin) ----------------------------------------
create table public.app_settings (
  key text primary key check (char_length(key) between 1 and 64),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "app_settings: admin lê" on public.app_settings
  for select to authenticated using ((select public.is_admin()));
create policy "app_settings: admin grava" on public.app_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Webhooks já processados (reenvios trazem o mesmo id) -----------------------
create table public.processed_webhooks (
  id text primary key,
  source text not null,
  received_at timestamptz not null default now()
);
alter table public.processed_webhooks enable row level security;
-- sem políticas: só o servidor (service role) lê e grava

-- Storage --------------------------------------------------------------------
update storage.buckets
  set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'application/json']
  where id = 'rendered-videos';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editing-assets', 'editing-assets', false, 52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'font/ttf', 'font/otf', 'application/x-font-ttf', 'application/octet-stream']
)
on conflict (id) do nothing;

create policy "editing-assets: admin lê" on storage.objects
  for select to authenticated using (bucket_id = 'editing-assets' and (select public.is_admin()));
create policy "editing-assets: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'editing-assets' and (select public.is_admin()));
create policy "editing-assets: admin atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'editing-assets' and (select public.is_admin()));
create policy "editing-assets: admin exclui" on storage.objects
  for delete to authenticated using (bucket_id = 'editing-assets' and (select public.is_admin()));

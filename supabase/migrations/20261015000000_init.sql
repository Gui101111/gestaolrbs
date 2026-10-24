-- =====================================================================
-- TRIBUNA — esquema inicial
-- Auth, perfis, marca, planos/assinaturas/uso, projetos, arquivos,
-- jobs de edição, renders, ajustes, notificações, lista de espera.
-- RLS em todas as tabelas. Mudanças de status críticas via RPC.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');
create type public.project_status as enum ('draft', 'queued', 'processing', 'ready', 'revision_requested', 'completed', 'failed');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'expired');
create type public.file_kind as enum ('original', 'take', 'attachment');
create type public.upload_status as enum ('pending', 'uploading', 'uploaded', 'failed');
create type public.revision_status as enum ('open', 'in_progress', 'resolved');
create type public.payment_status as enum ('pending', 'confirmed', 'received', 'overdue', 'refunded', 'failed', 'canceled');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text,
  phone text check (char_length(phone) <= 30),
  office_name text check (char_length(office_name) <= 120),
  oab_number text check (char_length(oab_number) <= 20),
  oab_uf char(2),
  legal_area text,
  practice_areas text[] not null default '{}',
  main_goal text,
  role public.user_role not null default 'user',
  onboarding_completed_at timestamptz,
  terms_accepted_at timestamptz,
  default_editing_style text,
  default_platforms text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Dados do usuário. id = auth.users.id.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Identidade visual do escritório
-- ---------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  office_name text check (char_length(office_name) <= 120),
  professional_name text check (char_length(professional_name) <= 120),
  oab_display text check (char_length(oab_display) <= 60),
  logo_path text,
  primary_color text not null default '#C6A15B' check (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text not null default '#0B1625' check (secondary_color ~* '^#[0-9a-f]{6}$'),
  accent_color text not null default '#F5F5F2' check (accent_color ~* '^#[0-9a-f]{6}$'),
  font text check (char_length(font) <= 60),
  website text check (char_length(website) <= 200),
  instagram text check (char_length(instagram) <= 80),
  whatsapp text check (char_length(whatsapp) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_kits_updated_at before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Planos, assinaturas, pagamentos e uso
-- ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'BRL',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  trial_days integer check (trial_days is null or trial_days > 0),
  videos_per_month integer check (videos_per_month is null or videos_per_month >= 0),
  minutes_per_month integer check (minutes_per_month is null or minutes_per_month >= 0),
  max_video_duration_sec integer check (max_video_duration_sec is null or max_video_duration_sec > 0),
  max_upload_mb integer not null default 2048 check (max_upload_mb > 0),
  revisions_per_video integer not null default 1 check (revisions_per_video >= 0),
  max_resolution text not null default '1080p',
  storage_gb integer,
  render_priority text not null default 'standard' check (render_priority in ('standard', 'priority', 'express')),
  allowed_aspect_ratios text[] not null default '{9:16,1:1,4:5,16:9}',
  features text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.plans.price_cents is 'Preço mensal em centavos. NULL = valor ainda não definido (checkout desabilitado).';

create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  status public.subscription_status not null default 'incomplete',
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null,
  provider_payment_id text unique,
  amount_cents integer not null default 0,
  status public.payment_status not null default 'pending',
  billing_type text,
  invoice_url text,
  description text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  videos_created integer not null default 0,
  minutes_used numeric(10, 2) not null default 0,
  storage_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);

create trigger usage_updated_at before update on public.usage
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Novo projeto' check (char_length(name) between 1 and 140),
  status public.project_status not null default 'draft',
  objective text,
  legal_area text,
  editing_style text,
  platforms text[] not null default '{}',
  aspect_ratios text[] not null default '{}',
  aspect_ratio text generated always as (aspect_ratios[1]) stored,
  settings jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  instructions text check (char_length(instructions) <= 1200),
  wizard_step smallint not null default 1 check (wizard_step between 1 and 10),
  source_duration_sec numeric(10, 2),
  source_width integer,
  source_height integer,
  source_size_bytes bigint,
  thumbnail_path text,
  rights_confirmed_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  revisions_used integer not null default 0,
  parent_project_id uuid references public.projects (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_created_idx on public.projects (user_id, created_at desc);
create index projects_status_idx on public.projects (status, submitted_at);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Depois de enviado, o usuário só pode renomear o projeto.
create or replace function public.guard_project_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and not public.is_admin() and old.status <> 'draft' then
    if new.objective is distinct from old.objective
      or new.legal_area is distinct from old.legal_area
      or new.editing_style is distinct from old.editing_style
      or new.platforms is distinct from old.platforms
      or new.aspect_ratios is distinct from old.aspect_ratios
      or new.settings is distinct from old.settings
      or new.options is distinct from old.options
      or new.instructions is distinct from old.instructions
      or new.rights_confirmed_at is distinct from old.rights_confirmed_at
      or new.source_duration_sec is distinct from old.source_duration_sec then
      raise exception 'project_locked' using errcode = 'P0001',
        hint = 'Projetos enviados não podem ser alterados. Crie uma nova versão.';
    end if;
  end if;
  return new;
end;
$$;

create trigger projects_guard before update on public.projects
  for each row execute function public.guard_project_update();

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.file_kind not null default 'original',
  bucket text not null default 'original-videos',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  duration_sec numeric(10, 2),
  width integer,
  height integer,
  status public.upload_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_files_project_idx on public.project_files (project_id, sort_order);
create index project_files_path_idx on public.project_files (bucket, storage_path);

create trigger project_files_updated_at before update on public.project_files
  for each row execute function public.set_updated_at();

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.job_status not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  current_step text not null default 'upload_completed',
  provider text not null default 'manual',
  external_id text,
  attempts integer not null default 0,
  kind text not null default 'initial' check (kind in ('initial', 'revision', 'version')),
  brief jsonb,
  edit_plan jsonb,
  step_history jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index render_jobs_project_idx on public.render_jobs (project_id, created_at desc);
create index render_jobs_status_idx on public.render_jobs (status, created_at);

create trigger render_jobs_updated_at before update on public.render_jobs
  for each row execute function public.set_updated_at();

create table public.renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.render_jobs (id) on delete set null,
  aspect_ratio text not null,
  bucket text not null default 'rendered-videos',
  storage_path text not null,
  thumbnail_path text,
  file_name text,
  resolution text,
  width integer,
  height integer,
  duration_sec numeric(10, 2),
  file_size bigint,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index renders_project_idx on public.renders (project_id, version desc);

create trigger renders_updated_at before update on public.renders
  for each row execute function public.set_updated_at();

create table public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  comment text not null check (char_length(comment) between 3 and 2000),
  timestamp_sec numeric(10, 2),
  status public.revision_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_revisions_project_idx on public.project_revisions (project_id, created_at desc);

create trigger project_revisions_updated_at before update on public.project_revisions
  for each row execute function public.set_updated_at();

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger project_notes_updated_at before update on public.project_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Notificações e lista de espera
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create trigger notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  plan_slug text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index waitlist_email_idx on public.waitlist (lower(email));

create trigger waitlist_updated_at before update on public.waitlist
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Novo usuário: perfil, marca e (se ativo) período de avaliação
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial public.plans%rowtype;
begin
  insert into public.profiles (id, email, full_name, avatar_url, terms_accepted_at)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120),
    new.raw_user_meta_data ->> 'avatar_url',
    case when coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') = 'true' then now() end
  )
  on conflict (id) do nothing;

  insert into public.brand_kits (user_id, professional_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120))
  on conflict (user_id) do nothing;

  select * into v_trial from public.plans where slug = 'avaliacao' and is_active limit 1;
  if found then
    insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
    values (new.id, v_trial.id, 'trialing', 'trial', now(), now() + make_interval(days => coalesce(v_trial.trial_days, 14)))
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Uso: período corrente (ciclo da assinatura ou mês civil)
-- ---------------------------------------------------------------------
create or replace function public.ensure_usage(p_user uuid)
returns public.usage
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_row public.usage%rowtype;
begin
  select * into v_sub from public.subscriptions where user_id = p_user;
  if found and v_sub.current_period_start is not null and v_sub.current_period_end is not null
     and now() between v_sub.current_period_start and v_sub.current_period_end then
    v_start := v_sub.current_period_start;
    v_end := v_sub.current_period_end;
  else
    v_start := date_trunc('month', now());
    v_end := date_trunc('month', now()) + interval '1 month';
  end if;

  insert into public.usage (user_id, period_start, period_end)
  values (p_user, v_start, v_end)
  on conflict (user_id, period_start) do nothing;

  select * into v_row from public.usage where user_id = p_user and period_start = v_start for update;
  return v_row;
end;
$$;

-- Leitura do uso corrente pelo próprio usuário
create or replace function public.get_my_usage()
returns public.usage
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return public.ensure_usage(auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: enviar projeto para edição (consome cota e cria o job)
-- ---------------------------------------------------------------------
create or replace function public.submit_project(p_project_id uuid)
returns public.render_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_project public.projects%rowtype;
  v_sub public.subscriptions%rowtype;
  v_plan public.plans%rowtype;
  v_usage public.usage%rowtype;
  v_job public.render_jobs%rowtype;
  v_minutes numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_project from public.projects where id = p_project_id and user_id = v_uid for update;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  if v_project.status <> 'draft' then
    raise exception 'project_not_draft' using errcode = 'P0001';
  end if;
  if v_project.objective is null or v_project.legal_area is null or v_project.editing_style is null
     or coalesce(array_length(v_project.platforms, 1), 0) = 0 then
    raise exception 'project_incomplete' using errcode = 'P0001';
  end if;
  if v_project.rights_confirmed_at is null then
    raise exception 'rights_not_confirmed' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.project_files f
    where f.project_id = p_project_id and f.kind = 'original' and f.status = 'uploaded'
  ) then
    raise exception 'missing_video' using errcode = 'P0001';
  end if;

  select * into v_sub from public.subscriptions where user_id = v_uid;
  if not found or v_sub.status not in ('active', 'trialing')
     or (v_sub.current_period_end is not null and v_sub.current_period_end < now()) then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  select * into v_plan from public.plans where id = v_sub.plan_id;
  if not found then
    raise exception 'subscription_required' using errcode = 'P0001';
  end if;

  if v_plan.max_video_duration_sec is not null
     and coalesce(v_project.source_duration_sec, 0) > v_plan.max_video_duration_sec then
    raise exception 'video_too_long' using errcode = 'P0001';
  end if;

  v_usage := public.ensure_usage(v_uid);
  if v_plan.videos_per_month is not null and v_usage.videos_created >= v_plan.videos_per_month then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  v_minutes := round(coalesce(v_project.source_duration_sec, 0) / 60.0, 2);
  if v_plan.minutes_per_month is not null and v_usage.minutes_used + v_minutes > v_plan.minutes_per_month then
    raise exception 'minutes_exceeded' using errcode = 'P0001';
  end if;

  update public.usage
     set videos_created = videos_created + 1,
         minutes_used = minutes_used + v_minutes
   where id = v_usage.id;

  update public.projects
     set status = 'queued', submitted_at = now()
   where id = p_project_id;

  insert into public.render_jobs (project_id, user_id, status, progress, current_step, kind, step_history)
  values (
    p_project_id, v_uid, 'queued', 0, 'upload_completed',
    case when v_project.parent_project_id is null then 'initial' else 'version' end,
    jsonb_build_array(jsonb_build_object('step', 'upload_completed', 'at', now()))
  )
  returning * into v_job;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_uid, 'project_submitted', 'Projeto enviado para edição',
          format('“%s” entrou na fila de processamento.', v_project.name),
          '/app/projetos/' || p_project_id);

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: solicitar ajuste
-- ---------------------------------------------------------------------
create or replace function public.request_revision(p_project_id uuid, p_comment text, p_timestamp_sec numeric default null)
returns public.project_revisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_project public.projects%rowtype;
  v_plan public.plans%rowtype;
  v_rev public.project_revisions%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into v_project from public.projects where id = p_project_id and user_id = v_uid for update;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  if v_project.status not in ('ready', 'completed') then
    raise exception 'project_not_ready' using errcode = 'P0001';
  end if;

  select pl.* into v_plan
    from public.subscriptions s join public.plans pl on pl.id = s.plan_id
   where s.user_id = v_uid;
  if found and v_project.revisions_used >= v_plan.revisions_per_video then
    raise exception 'revisions_exceeded' using errcode = 'P0001';
  end if;

  insert into public.project_revisions (project_id, user_id, comment, timestamp_sec)
  values (p_project_id, v_uid, left(trim(p_comment), 2000), p_timestamp_sec)
  returning * into v_rev;

  update public.projects
     set status = 'revision_requested', revisions_used = revisions_used + 1, completed_at = null
   where id = p_project_id;

  insert into public.render_jobs (project_id, user_id, status, progress, current_step, kind, step_history)
  values (p_project_id, v_uid, 'queued', 40, 'planning', 'revision',
          jsonb_build_array(jsonb_build_object('step', 'planning', 'at', now())));

  return v_rev;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: aprovar entrega
-- ---------------------------------------------------------------------
create or replace function public.approve_project(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.projects%rowtype;
begin
  update public.projects
     set status = 'completed', completed_at = now()
   where id = p_project_id and user_id = auth.uid() and status = 'ready'
  returning * into v_row;
  if not found then
    raise exception 'project_not_ready' using errcode = 'P0001';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: duplicar projeto / criar nova versão
-- ---------------------------------------------------------------------
create or replace function public.duplicate_project(p_project_id uuid, p_as_version boolean default false)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src public.projects%rowtype;
  v_new public.projects%rowtype;
  v_root uuid;
begin
  select * into v_src from public.projects where id = p_project_id and user_id = auth.uid();
  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  v_root := coalesce(v_src.parent_project_id, v_src.id);

  insert into public.projects (
    user_id, name, status, objective, legal_area, editing_style, platforms, aspect_ratios,
    settings, options, instructions, wizard_step, source_duration_sec, source_width, source_height,
    source_size_bytes, thumbnail_path, parent_project_id, version
  )
  values (
    v_src.user_id,
    left(case when p_as_version then v_src.name else v_src.name || ' (cópia)' end, 140),
    'draft', v_src.objective, v_src.legal_area, v_src.editing_style, v_src.platforms, v_src.aspect_ratios,
    v_src.settings, v_src.options, v_src.instructions,
    case when p_as_version then 3 else 2 end,
    v_src.source_duration_sec, v_src.source_width, v_src.source_height, v_src.source_size_bytes,
    v_src.thumbnail_path,
    case when p_as_version then v_root else null end,
    case when p_as_version then
      (select coalesce(max(p.version), 1) + 1 from public.projects p where p.id = v_root or p.parent_project_id = v_root)
    else 1 end
  )
  returning * into v_new;

  -- Reaproveita o vídeo original já enviado (mesmo objeto no Storage)
  insert into public.project_files (project_id, user_id, kind, bucket, storage_path, file_name, mime_type, size_bytes, duration_sec, width, height, status, sort_order)
  select v_new.id, f.user_id, f.kind, f.bucket, f.storage_path, f.file_name, f.mime_type, f.size_bytes, f.duration_sec, f.width, f.height, f.status, f.sort_order
    from public.project_files f
   where f.project_id = v_src.id and f.status = 'uploaded';

  return v_new;
end;
$$;

-- Funções internas não devem ser chamadas diretamente pelo cliente
revoke execute on function public.ensure_usage(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.submit_project(uuid) from public, anon;
revoke execute on function public.request_revision(uuid, text, numeric) from public, anon;
revoke execute on function public.approve_project(uuid) from public, anon;
revoke execute on function public.duplicate_project(uuid, boolean) from public, anon;
revoke execute on function public.get_my_usage() from public, anon;
grant execute on function public.submit_project(uuid) to authenticated;
grant execute on function public.request_revision(uuid, text, numeric) to authenticated;
grant execute on function public.approve_project(uuid) to authenticated;
grant execute on function public.duplicate_project(uuid, boolean) to authenticated;
grant execute on function public.get_my_usage() to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.brand_kits enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.usage enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.render_jobs enable row level security;
alter table public.renders enable row level security;
alter table public.project_revisions enable row level security;
alter table public.project_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlist enable row level security;

-- Perfis --------------------------------------------------------------
create policy "profiles: ler o próprio ou admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: atualizar o próprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Usuário não altera role, e-mail nem datas de sistema
revoke update on public.profiles from authenticated;
grant update (
  full_name, avatar_url, phone, office_name, oab_number, oab_uf, legal_area, practice_areas,
  main_goal, onboarding_completed_at, terms_accepted_at, default_editing_style, default_platforms, preferences
) on public.profiles to authenticated;

-- Marca ---------------------------------------------------------------
create policy "brand_kits: ler o próprio ou admin" on public.brand_kits
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "brand_kits: inserir o próprio" on public.brand_kits
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "brand_kits: atualizar o próprio" on public.brand_kits
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Planos --------------------------------------------------------------
create policy "plans: públicos e ativos" on public.plans
  for select to anon, authenticated using ((is_active and is_public) or (select public.is_admin()));
create policy "plans: plano da própria assinatura" on public.plans
  for select to authenticated using (
    exists (select 1 from public.subscriptions s where s.plan_id = plans.id and s.user_id = (select auth.uid()))
  );
create policy "plans: admin gerencia" on public.plans
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Assinaturas, pagamentos e uso (escrita apenas pelo servidor) --------
create policy "subscriptions: ler a própria ou admin" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "payments: ler os próprios ou admin" on public.payments
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "usage: ler o próprio ou admin" on public.usage
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Projetos ------------------------------------------------------------
create policy "projects: ler os próprios ou admin" on public.projects
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "projects: criar rascunho próprio" on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'draft');
create policy "projects: atualizar os próprios" on public.projects
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "projects: excluir os próprios" on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "projects: admin atualiza" on public.projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke update on public.projects from authenticated;
grant update (
  name, objective, legal_area, editing_style, platforms, aspect_ratios, settings, options, instructions,
  wizard_step, source_duration_sec, source_width, source_height, source_size_bytes, thumbnail_path, rights_confirmed_at
) on public.projects to authenticated;

-- Arquivos do projeto -------------------------------------------------
create policy "project_files: ler os próprios ou admin" on public.project_files
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "project_files: inserir em projeto próprio" on public.project_files
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.status = 'draft')
  );
create policy "project_files: atualizar os próprios" on public.project_files
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "project_files: excluir os próprios" on public.project_files
  for delete to authenticated using (user_id = (select auth.uid()));

-- Jobs, renders, ajustes (escrita pelo servidor/admin) ----------------
create policy "render_jobs: ler os próprios ou admin" on public.render_jobs
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "render_jobs: admin gerencia" on public.render_jobs
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "renders: ler os próprios ou admin" on public.renders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "renders: admin gerencia" on public.renders
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "project_revisions: ler os próprios ou admin" on public.project_revisions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "project_revisions: admin gerencia" on public.project_revisions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "project_notes: somente admin" on public.project_notes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Notificações --------------------------------------------------------
create policy "notifications: ler as próprias" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marcar como lida" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: excluir as próprias" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Lista de espera: qualquer pessoa pode entrar, ninguém lê pela API pública
create policy "waitlist: inscrever-se" on public.waitlist
  for insert to anon, authenticated with check (true);
create policy "waitlist: admin lê" on public.waitlist
  for select to authenticated using ((select public.is_admin()));

-- =====================================================================
-- Storage
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('original-videos', 'original-videos', false, 2147483648, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('rendered-videos', 'rendered-videos', false, 4294967296, array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']),
  ('brand-assets', 'brand-assets', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('thumbnails', 'thumbnails', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Convenção de caminho: <user_id>/<...>. A primeira pasta é sempre o dono.

create policy "originals: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'original-videos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "originals: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'original-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "originals: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'original-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "originals: dono exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'original-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "rendered: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'rendered-videos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "rendered: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rendered-videos' and (select public.is_admin()));
create policy "rendered: admin atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'rendered-videos' and (select public.is_admin()));
create policy "rendered: admin exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'rendered-videos' and (select public.is_admin()));

create policy "brand: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-assets' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "brand: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brand: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brand: dono exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "thumbs: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'thumbnails' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "thumbs: dono ou admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'thumbnails' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "thumbs: dono ou admin atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'thumbnails' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "thumbs: dono exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- =====================================================================
-- Realtime (progresso do processamento e notificações)
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.render_jobs, public.projects, public.notifications;
  end if;
end;
$$;

-- =====================================================================
-- Planos iniciais (preços indefinidos: editar pelo painel admin)
-- =====================================================================
insert into public.plans (slug, name, description, price_cents, trial_days, videos_per_month, minutes_per_month, max_video_duration_sec, max_upload_mb, revisions_per_video, max_resolution, storage_gb, render_priority, features, is_featured, is_active, is_public, sort_order)
values
  ('avaliacao', 'Avaliação', 'Período de avaliação concedido no cadastro.', 0, 14, 1, 15, 300, 1024, 1, '1080p', 2, 'standard',
    array['1 vídeo para conhecer a plataforma', 'Todos os estilos de edição', 'Exportação em 1080p'], false, true, false, 0),
  ('inicial', 'Plano Inicial', 'Para quem está começando a produzir conteúdo com regularidade.', null, null, 8, 60, 600, 2048, 1, '1080p', 10, 'standard',
    array['8 vídeos por mês', 'Até 60 minutos processados', 'Exportação MP4 em 1080p', 'Todos os formatos de saída', '1 ajuste por vídeo'], false, true, true, 1),
  ('profissional', 'Plano Profissional', 'Para advogados que publicam toda semana e investem em anúncios.', null, null, 20, 180, 1200, 4096, 2, '1080p', 50, 'priority',
    array['20 vídeos por mês', 'Até 180 minutos processados', 'Renderização prioritária', 'Identidade visual do escritório', '2 ajustes por vídeo'], true, true, true, 2),
  ('escritorio', 'Plano Escritório', 'Para escritórios com vários advogados e calendário editorial.', null, null, 60, 600, 2400, 8192, 3, '4K', 200, 'express',
    array['60 vídeos por mês', 'Até 600 minutos processados', 'Exportação em até 4K', 'Renderização expressa', '3 ajustes por vídeo'], false, true, true, 3)
on conflict (slug) do nothing;

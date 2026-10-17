-- =====================================================================
-- TRIBUNA v2: pastas, tratamento (Dr./Dra.), primeiro download e novas rotas
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfil: tratamento usado no "Bem-vindo, Dr. …"
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists treatment text check (treatment in ('dr', 'dra'));
grant update (treatment) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Projeto: primeiro download (etapa 4 de "Conclua sua configuração").
-- Gravado apenas pelo servidor na rota de download.
-- ---------------------------------------------------------------------
alter table public.projects
  add column if not exists first_downloaded_at timestamptz;

-- ---------------------------------------------------------------------
-- Pastas (até 3 níveis)
-- ---------------------------------------------------------------------
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  color text not null default 'gold' check (color in ('gold', 'cyan', 'blue', 'violet', 'mint', 'gray')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
comment on table public.folders is 'Pastas de vídeos do usuário (até 3 níveis).';
create index folders_owner_parent_idx on public.folders (owner_id, parent_id, position);

create trigger folders_updated_at before update on public.folders
  for each row execute function public.set_updated_at();

-- Nível de uma pasta (1 = raiz)
create or replace function public.folder_level(p_folder uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  with recursive up as (
    select id, parent_id, 1 as lvl from public.folders where id = p_folder
    union all
    select f.id, f.parent_id, up.lvl + 1 from public.folders f join up on f.id = up.parent_id where up.lvl < 10
  )
  select coalesce(max(lvl), 0) from up;
$$;

-- Altura da subárvore (1 = pasta sem subpastas)
create or replace function public.folder_height(p_folder uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  with recursive down as (
    select id, 1 as lvl from public.folders where id = p_folder
    union all
    select f.id, down.lvl + 1 from public.folders f join down on f.parent_id = down.id where down.lvl < 10
  )
  select coalesce(max(lvl), 1) from down;
$$;

-- Mesmo dono do pai, sem ciclos e no máximo 3 níveis (inclui a subárvore movida)
create or replace function public.guard_folder()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_owner uuid;
  v_parent_level integer;
  v_height integer;
begin
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'folder_owner_locked' using errcode = 'P0001';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  select owner_id into v_parent_owner from public.folders where id = new.parent_id;
  if v_parent_owner is null or v_parent_owner <> new.owner_id then
    raise exception 'folder_parent_invalid' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and exists (
    with recursive up as (
      select id, parent_id from public.folders where id = new.parent_id
      union all
      select f.id, f.parent_id from public.folders f join up on f.id = up.parent_id
    )
    select 1 from up where id = new.id
  ) then
    raise exception 'folder_cycle' using errcode = 'P0001';
  end if;

  v_parent_level := public.folder_level(new.parent_id);
  v_height := case when tg_op = 'UPDATE' then public.folder_height(new.id) else 1 end;
  if v_parent_level + v_height > 3 then
    raise exception 'folder_depth' using errcode = 'P0001',
      hint = 'As pastas podem ter no máximo 3 níveis.';
  end if;

  return new;
end;
$$;

create trigger folders_guard before insert or update of parent_id, owner_id on public.folders
  for each row execute function public.guard_folder();

alter table public.folders enable row level security;

create policy "folders: ler as próprias ou admin" on public.folders
  for select to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "folders: criar as próprias" on public.folders
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "folders: atualizar as próprias" on public.folders
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "folders: excluir as próprias" on public.folders
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.folders from anon;
revoke update on public.folders from authenticated;
grant select, insert, delete on public.folders to authenticated;
grant update (name, color, position, parent_id) on public.folders to authenticated;

-- ---------------------------------------------------------------------
-- Projetos em pastas
-- ---------------------------------------------------------------------
alter table public.projects
  add column if not exists folder_id uuid references public.folders (id) on delete set null;
create index if not exists projects_folder_idx on public.projects (user_id, folder_id, created_at desc);

grant update (folder_id) on public.projects to authenticated;

-- A pasta precisa ser do mesmo dono do vídeo
create or replace function public.guard_project_folder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.folder_id is not null
     and (tg_op = 'INSERT' or new.folder_id is distinct from old.folder_id)
     and not exists (select 1 from public.folders f where f.id = new.folder_id and f.owner_id = new.user_id) then
    raise exception 'folder_invalid' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger projects_folder_guard before insert or update of folder_id on public.projects
  for each row execute function public.guard_project_folder();

-- ---------------------------------------------------------------------
-- Duplicar mantém a pasta
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
    source_size_bytes, thumbnail_path, parent_project_id, version, folder_id
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
    else 1 end,
    v_src.folder_id
  )
  returning * into v_new;

  insert into public.project_files (project_id, user_id, kind, bucket, storage_path, file_name, mime_type, size_bytes, duration_sec, width, height, status, sort_order)
  select v_new.id, f.user_id, f.kind, f.bucket, f.storage_path, f.file_name, f.mime_type, f.size_bytes, f.duration_sec, f.width, f.height, f.status, f.sort_order
    from public.project_files f
   where f.project_id = v_src.id and f.status = 'uploaded';

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- Envio: link da notificação aponta para a nova página do vídeo
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
  values (v_uid, 'project_submitted', 'Vídeo enviado para edição',
          format('“%s” entrou na fila de edição.', v_project.name),
          '/app/video/' || p_project_id);

  return v_job;
end;
$$;

-- Notificações antigas passam a apontar para a nova rota
update public.notifications
   set link = regexp_replace(link, '^/app/projetos/', '/app/video/')
 where link ~ '^/app/projetos/[0-9a-f-]{36}$';

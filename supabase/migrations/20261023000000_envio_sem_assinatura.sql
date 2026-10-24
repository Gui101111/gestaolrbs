-- =====================================================================
-- Envio simples (fase de testes)
-- O vídeo é enviado para edição sem exigir assinatura. Os limites do
-- plano (duração, vídeos e minutos por mês, ajustes por vídeo) valem só
-- para assinatura paga ativa (status 'active'); sem ela (nenhuma
-- assinatura, avaliação ou vencida) o envio é liberado. O uso continua
-- sendo contado em public.usage.
-- =====================================================================
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
  v_paid boolean := false;
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

  -- Limites do plano só para assinatura paga ativa
  select * into v_sub from public.subscriptions where user_id = v_uid;
  if found and v_sub.status = 'active'
     and (v_sub.current_period_end is null or v_sub.current_period_end >= now()) then
    select * into v_plan from public.plans where id = v_sub.plan_id;
    v_paid := found;
  end if;

  if v_paid and v_plan.max_video_duration_sec is not null
     and coalesce(v_project.source_duration_sec, 0) > v_plan.max_video_duration_sec then
    raise exception 'video_too_long' using errcode = 'P0001';
  end if;

  v_usage := public.ensure_usage(v_uid);
  if v_paid and v_plan.videos_per_month is not null and v_usage.videos_created >= v_plan.videos_per_month then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  v_minutes := round(coalesce(v_project.source_duration_sec, 0) / 60.0, 2);
  if v_paid and v_plan.minutes_per_month is not null and v_usage.minutes_used + v_minutes > v_plan.minutes_per_month then
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

-- Pedido de ajuste: limite por vídeo só com assinatura paga ativa
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
   where s.user_id = v_uid and s.status = 'active'
     and (s.current_period_end is null or s.current_period_end >= now());
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

-- Tribuna: estrutura do banco no Supabase.
-- Cole este arquivo inteiro em Supabase → SQL Editor → New query → Run.

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  status text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Cada conta vê só os próprios projetos" on public.projects;
create policy "Cada conta vê só os próprios projetos"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vídeos finais: bucket privado, uma pasta por conta (<user_id>/<projeto>.mp4).
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

drop policy if exists "Ler os próprios vídeos" on storage.objects;
create policy "Ler os próprios vídeos" on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Enviar os próprios vídeos" on storage.objects;
create policy "Enviar os próprios vídeos" on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Atualizar os próprios vídeos" on storage.objects;
create policy "Atualizar os próprios vídeos" on storage.objects for update
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Apagar os próprios vídeos" on storage.objects;
create policy "Apagar os próprios vídeos" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

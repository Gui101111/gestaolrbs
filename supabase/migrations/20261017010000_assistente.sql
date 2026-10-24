-- "Perguntar à Tribuna" com IA (Parte 2, seção 2.10): registro para limite diário por usuário
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 600),
  answer text,
  created_at timestamptz not null default now()
);
create index assistant_messages_user_day_idx on public.assistant_messages (user_id, created_at desc);

alter table public.assistant_messages enable row level security;
create policy "assistant_messages: ler as próprias" on public.assistant_messages
  for select to authenticated using (user_id = (select auth.uid()));
-- gravação só pelo servidor (service role)
revoke insert, update, delete on public.assistant_messages from authenticated, anon;

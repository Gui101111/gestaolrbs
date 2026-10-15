# TRIBUNA — edição de vídeo com IA para advogados

SaaS que transforma vídeos brutos gravados por advogados em vídeos profissionais para Reels, TikTok, Shorts, Stories, Feed, Meta Ads, YouTube e LinkedIn.
O advogado envia o vídeo, escolhe objetivo, área, estilo e formato, e recebe o MP4 pronto na plataforma.

> O nome **TRIBUNA** é provisório. Nome, slogan, contatos, redes e números da landing ficam em [`config/site.ts`](config/site.ts).

## Stack

- **Next.js 16** (App Router, Turbopack, `proxy.ts`), **React 19**, **TypeScript** estrito
- **Tailwind CSS v4** + componentes no padrão **shadcn/ui** (Radix), identidade preto/azul-marinho/dourado
- **Motion** (Framer Motion), **GSAP + ScrollTrigger**, **Lenis**; WebGL próprio para a estátua interativa
- **Supabase**: Auth (e-mail com confirmação + Google), Postgres com **RLS em todas as tabelas**, Storage privado, Realtime
- **Upload retomável (TUS)** direto do navegador para o Storage — o arquivo nunca passa pelo servidor do Next
- **Resend** (e-mails transacionais), **Asaas** (assinaturas cartão/Pix) atrás de `PaymentProvider`
- **Claude** (`@anthropic-ai/sdk`) para análise semântica e plano de edição; FFmpeg para renderização

## Estrutura

```
app/
  (marketing)/          landing, termos, privacidade
  (auth)/               login, register, forgot-password, reset-password, verify-email
  auth/confirm|callback rotas de confirmação de e-mail e OAuth
  onboarding/           primeiro acesso (nome, escritório, OAB, área, objetivo)
  app/                  área logada: dashboard, projetos/novo, projetos/[id], biblioteca,
                        marca, assinatura, perfil, configuracoes
  admin/                visão geral, fila de projetos, entrega manual, planos, usuários
  api/                  jobs/callback, webhooks/asaas, projects/[id]/download
components/
  ui/ animations/ landing/ auth/ dashboard/ projects/ upload/ video/ brand-kit/ billing/ admin/ account/
lib/                    supabase (clientes), auth (DAL), actions (server actions), validations, constants
services/
  editing/              tipos (EditBrief, EditPlan), provedores, briefing, despacho, ciclo de vida do job
  ai/                   transcrição (Whisper HTTP) e análise (Claude → plano estruturado)
  rendering/            construção de comandos FFmpeg + legendas ASS
  payments/             PaymentProvider + Asaas
  email/                Resend + templates
  storage/              URLs assinadas e convenções de caminho
hooks/                  upload TUS, media queries
types/                  tipos gerados do banco + domínio
supabase/               config.toml, migrations, templates de e-mail
workers/                worker de edição de referência (pipeline de IA completo)
```

## Rodando localmente

Pré-requisitos: Node 22+, Docker (para o Supabase local) e FFmpeg (apenas para o worker).

```bash
npm install
npx supabase start          # sobe Postgres, Auth, Storage, Realtime e Mailpit
npx supabase db reset       # aplica supabase/migrations
cp .env.example .env.local  # preencha com as chaves exibidas pelo `supabase start`
npm run dev                 # http://localhost:3000
```

- E-mails locais (confirmação, recuperação) chegam no **Mailpit**: http://127.0.0.1:54324
- Para virar administrador: `update public.profiles set role = 'admin' where email = 'voce@exemplo.com';`
- Tipos do banco: `npm run db:types`

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:reset`, `db:types`, `worker`, `test:rls`, `test:e2e`.

### Testes

- `npm run test:rls` — 44 verificações de isolamento entre usuários (RLS, Storage, RPCs, colunas protegidas). Só roda contra o Supabase local.
- `npm run test:e2e` — Playwright (desktop + mobile): landing, rotas protegidas, validações, páginas legais e o fluxo completo cadastro → confirmação por e-mail (Mailpit) → onboarding → upload TUS → envio para edição. Requer `npm run dev` e o Supabase local. Em ambientes com Chromium próprio, use `PLAYWRIGHT_CHROMIUM_PATH=/caminho/do/chromium`.

## Supabase em produção

1. Crie o projeto e rode as migrations: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
2. **Auth → URL Configuration**: Site URL = `https://seudominio.com.br`; Redirect URLs = `https://seudominio.com.br/**`.
3. **Auth → Providers → Email**: ative “Confirm email”. Senha mínima: 8.
4. **Auth → Email Templates**: cole os HTML de `supabase/templates/` (confirmation, recovery, email_change, magic_link, invite). Eles usam `token_hash` e apontam para `/auth/confirm`, o que funciona mesmo se o e-mail for aberto em outro dispositivo.
5. **Auth → SMTP**: configure o SMTP do Resend (host `smtp.resend.com`, porta 465, usuário `resend`, senha = API key) para enviar os e-mails de autenticação com o seu domínio.
6. **Storage**: os buckets são criados pela migration (todos privados). Em planos pagos do Supabase, ajuste o limite global de upload (Settings → Storage) para ≥ 2 GB.
7. Realtime já é habilitado para `render_jobs`, `projects` e `notifications` pela migration.

### Login com Google

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: tipo externo, nome do app, domínio e e-mail de suporte.
2. **Credentials → Create credentials → OAuth client ID** → “Web application”.
   - Authorized JavaScript origins: `https://seudominio.com.br`
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`
3. Supabase → Auth → Providers → **Google**: cole Client ID e Client Secret e salve.
4. Local: defina `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET`, mude `enabled = true` em `[auth.external.google]` no `config.toml` e reinicie o Supabase.

## Pagamentos (Asaas)

- `ASAAS_ENV=sandbox` e `ASAAS_API_KEY` (chave do ambiente sandbox).
- Webhook: Asaas → Integrações → Webhooks → URL `https://seudominio.com.br/api/webhooks/asaas`, token de autenticação = `ASAAS_WEBHOOK_TOKEN`. Eventos: cobranças e assinaturas.
- Preços **não ficam no código**: edite em `/admin/planos`. Plano sem preço mostra “Valor em breve” e coleta e-mails na lista de espera.
- Novos cadastros recebem o plano oculto **Avaliação** (configurável/desativável no admin).
- Para trocar de gateway, implemente `PaymentProvider` em `services/payments/`.

## Motor de edição

O envio de um projeto chama a RPC `submit_project` (valida assinatura, cota e duração, consome a cota e cria o `render_job`) e despacha o job ao provedor definido em `VIDEO_EDITING_PROVIDER`:

| Provedor | Comportamento |
| --- | --- |
| `manual` (padrão) | O job fica na fila; a equipe avança as etapas e envia os MP4 por formato em `/admin/projetos/[id]`. O cliente acompanha em tempo real. |
| `external` | O briefing JSON é enviado a `EDITING_WORKER_URL`. O worker reporta progresso em `/api/jobs/callback` (Bearer `JOBS_CALLBACK_SECRET`). |
| `claude` | Esqueleto para Claude Managed Agents (ver `services/editing/providers/claude-agent.ts`). |

O worker de referência (`npm run worker`) executa: download → transcrição (`TRANSCRIPTION_URL`, compatível com Whisper) → análise com Claude (`services/ai/analysis.ts`, saída estruturada validada por Zod) → FFmpeg por proporção (cortes, zoom, cor, limpeza de áudio, loudness, legendas ASS com termos jurídicos destacados) → upload → callback.

Contrato do callback:

```json
{ "jobId": "uuid", "status": "running|succeeded|failed", "step": "transcribing", "progress": 30,
  "outputs": [{ "aspectRatio": "9:16", "path": "<user>/<project>/9x16.mp4", "width": 1080, "height": 1920, "durationSec": 62.4, "sizeBytes": 38211234 }] }
```

## Segurança

- RLS em todas as tabelas; o usuário só lê/edita os próprios dados. Colunas sensíveis (role, status, cota) só mudam por RPC `security definer` ou pelo servidor.
- Projetos enviados ficam bloqueados para edição (trigger); “Criar nova versão” gera um novo rascunho.
- Arquivos sempre privados e entregues por URL assinada de curta duração.
- `proxy.ts` renova a sessão e faz checagens otimistas; a autorização real acontece nos layouts, actions e no banco.
- Exclusão de conta (LGPD) remove arquivos de todos os buckets e o usuário.

## Deploy

**Vercel**: importe o repositório, configure as variáveis de `.env.example` e faça o deploy.

**Docker / EasyPanel**:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://seudominio.com.br \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
  -t tribuna .
docker run -p 3000:3000 --env-file .env.production tribuna
```

## Conformidade

O produto é uma ferramenta de criação e edição. A linguagem da plataforma evita promessas de resultado, e a revisão de conformidade sinaliza falas que possam conflitar com o Provimento 205/2021 da OAB — a responsabilidade pelo conteúdo permanece com o advogado. Termos de Uso e Política de Privacidade são textos-base para revisão jurídica.

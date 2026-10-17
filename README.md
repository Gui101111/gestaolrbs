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
workers/                worker de edição próprio (provedor external)
sandbox/                editor de referência em Python (usado pelo agente e pelo worker)
```

## Rodando localmente

Pré-requisitos: Node 22+, Docker (para o Supabase local) e, para editar vídeos localmente, FFmpeg + Python 3 (`pip install "opencv-python-headless<5"`; opcional `faster-whisper`).

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

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:reset`, `db:types`, `worker`, `test:rls`, `test:e2e`, `claude:setup`, `claude:test`, `assets:setup`, `sandbox:teste`.

### Testes

- `npm run test:rls` — 69 verificações de isolamento entre usuários (RLS, Storage, RPCs, colunas protegidas, pastas, sessões do agente, entregas em revisão). Só roda contra o Supabase local.
- `npm run test:e2e` — Playwright (desktop + mobile): landing, rotas novas e antigas, validações, páginas legais, 404, cadastro → confirmação por e-mail (Mailpit) → onboarding → upload TUS → envio, e recuperação de senha. Requer `npm run dev` e o Supabase local. Em ambientes com Chromium próprio, use `PLAYWRIGHT_CHROMIUM_PATH=/caminho/do/chromium`.
- Edição automática pela interface (`e2e/editing.spec.ts`): envio → agente → liberação no admin → assistir/baixar → ajuste → v2. Rode com `CLAUDE_LOCAL_SANDBOX=1` no `.env.local` e `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` de um admin.
- `npm run claude:test -- video.mp4 [--formatos 9:16,1:1] [--estilo dinamico] [--provedor external]` — fluxo de edição completo pelo terminal, com report, tempo e custo. Gere um vídeo de teste com fala, pausas e frases sensíveis: `npm run sandbox:teste -- --saida /tmp/teste --imagem public/media/justica-busto.webp [--vertical]`.

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

O envio de um projeto chama a RPC `submit_project` (valida assinatura, cota e duração, consome a cota e cria o `render_job`) e despacha o job ao provedor ativo. O admin troca o provedor em `/admin` sem deploy (tabela `app_settings`); o padrão vem de `VIDEO_EDITING_PROVIDER`.

| Provedor | Comportamento |
| --- | --- |
| `manual` (padrão) | O job fica na fila; a equipe avança as etapas e envia os MP4 por formato em `/admin/projetos/[id]`. O cliente acompanha em tempo real. |
| `claude` | **Claude Managed Agents** edita na sandbox da Anthropic (Parte 2, abaixo). Com `HUMAN_REVIEW=true`, a equipe confere e clica "Liberar para o cliente". |
| `external` | Worker próprio (`npm run worker`, porta 8787) num servidor com FFmpeg + Python. Usa o mesmo editor de referência, sem IA; reporta em `/api/jobs/callback` (Bearer `JOBS_CALLBACK_SECRET`). |

O editor de referência (`sandbox/tribuna_editor.py`) analisa (silêncios, rosto com OpenCV, transcrição com faster-whisper), gera o plano e renderiza cada formato (9:16, 1:1, 4:5, 16:9) com legendas palavra a palavra, nome + OAB, título, CTA, vinheta, logo e trilha da marca, reenquadramento pelo rosto, loudness −14 LUFS e miniaturas, e confere tudo com ffprobe. Assets (fontes OFL e trilhas provisórias) ficam em `supabase/assets/` e vão para o bucket `editing-assets` com `npm run assets:setup`.

### Edição com Claude (Parte 2)

Fluxo: o servidor cria a sessão do agente com o brief e URLs assinadas e responde na hora. O agente baixa o original direto do Storage, roda o editor de referência, revisa o plano com julgamento (vícios, título, destaques, alertas OAB), renderiza e envia os arquivos de volta pelas URLs assinadas. O webhook `session.status_idled` confere o Storage (plano B: Files API; depois, um pedido para concluir) e registra as entregas. O cron `/api/cron/editing` (a cada 10 min, `vercel.json`) cobre webhooks perdidos e atualiza o progresso. Ajustes vão para a mesma sessão; a aprovação do cliente arquiva a sessão. O id da sessão e o custo ficam só em `editing_sessions` (admin).

1. platform.claude.com → conta de desenvolvedor → créditos → workspace `tribuna` → API key do workspace.
2. `.env.local` e Vercel: `ANTHROPIC_API_KEY` (nunca com `NEXT_PUBLIC_`).
3. `npm run claude:setup` (com `NEXT_PUBLIC_SUPABASE_URL` de produção) → copie `CLAUDE_ENVIRONMENT_ID`, `CLAUDE_AGENT_ID` e `CLAUDE_TOOLKIT_FILE_ID`. Alterou o guia (`lib/claude/guia-edicao.ts`) ou o editor? `npm run claude:setup -- --atualizar`.
4. Depois do deploy: Console → Webhooks (workspace `tribuna`) → `https://SEU-DOMINIO/api/webhooks/claude`, eventos `session.status_idled` e `session.status_terminated` (opcional `session.status_run_started`) → segredo em `ANTHROPIC_WEBHOOK_SIGNING_KEY`.
5. `/admin` → Motor de edição → Claude. Teste com `npm run claude:test -- video.mp4` e veja o custo em Console → Usage.

Sem a chave, `CLAUDE_LOCAL_SANDBOX=1` (só em desenvolvimento) roda o mesmo fluxo nesta máquina, com webhook assinado de verdade.

"Perguntar à Tribuna" (painel de ajuda) responde com `claude-haiku-5-5` quando `ANTHROPIC_API_KEY` existe, só sobre a plataforma, gravação e regras gerais da OAB (base: `content/como-fazer.ts`), com limite diário (`ASSISTANT_DAILY_LIMIT`, padrão 20).

## Segurança

- RLS em todas as tabelas (inclusive `editing_sessions`, `app_settings` e `processed_webhooks`, só servidor/admin); o usuário só lê/edita os próprios dados. Colunas sensíveis (role, status, cota) só mudam por RPC `security definer` ou pelo servidor.
- Projetos enviados ficam bloqueados para edição (trigger); “Criar nova versão” gera um novo rascunho.
- Arquivos sempre privados e entregues por URL assinada de curta duração.
- `proxy.ts` renova a sessão e faz checagens otimistas; a autorização real acontece nos layouts, actions e no banco.
- Exclusão de conta (LGPD) remove arquivos de todos os buckets e o usuário.

## Deploy

Passo a passo para publicar (a ordem importa):

1. **Supabase** (produção): crie o projeto, `npx supabase link --project-ref <ref>` e `npx supabase db push`; siga "Supabase em produção" acima; rode `npm run assets:setup` com as chaves de produção.
2. **Vercel**: importe o repositório do GitHub, framework Next.js, e configure as variáveis de `.env.example` (produção: `NEXT_PUBLIC_SITE_URL` com o domínio final, chaves do Supabase, `JOBS_CALLBACK_SECRET`, `CRON_SECRET`, Resend, Asaas e, para a Parte 2, as da Anthropic). Faça o deploy e aponte o domínio.
3. **Cron**: `vercel.json` agenda `/api/cron/editing` a cada 10 min (exige plano Pro; no Hobby a Vercel só permite 1 execução por dia).
4. **Webhooks**: Asaas → `/api/webhooks/asaas`; Anthropic → `/api/webhooks/claude`.
5. **Admin**: cadastre-se e rode `update public.profiles set role = 'admin' where email = 'voce@exemplo.com';` no SQL Editor.
6. Ative o Google (opcional) e teste: cadastro, e-mail de confirmação, envio de um vídeo, liberação no admin, download.

**Docker / EasyPanel** (alternativa à Vercel):

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

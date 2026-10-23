# Tribuna — editor de vídeos com IA

Você envia o vídeo do jeito que gravou e recebe pronto para postar: sem as pausas, sem os "éé", com legenda sincronizada, zoom nos momentos fortes e vinheta. Cada pessoa tem a própria conta e os próprios projetos.

## O que tem nesta versão

- **Login por conta**: criar conta, entrar, sair (e recuperar senha quando o Supabase está configurado).
- **Tela de projetos logo depois do login**: todos os vídeos da conta, com miniatura, duração e status. Para começar um vídeo novo, é só arrastar o arquivo para a tela.
- **Criação de vídeo simples**, numa tela só:
  - **Formato**: vertical 9:16, quadrado 1:1, horizontal 16:9 ou original. O vídeo pode preencher a tela ou aparecer inteiro com fundo desfocado.
  - **Legendas** em 6 estilos (Recomendada, Discreta, Caixa, Karaokê, Impacto e Minimalista), na **posição** embaixo (recomendado), no centro ou em cima. Também dá para escolher o tamanho, a cor de destaque, deixar tudo em maiúsculas e definir o idioma da fala.
  - **Edição com IA**: corte de pausas (com ritmo suave, equilibrado ou acelerado), remoção de vícios de linguagem e repetições, zoom dinâmico, destaque de palavras-chave e título de gancho.
  - **Vinheta** de abertura e de encerramento, com estilo, cor, textos, logo e som.
  - **Pedido para a IA** (opcional): texto livre. A IA lê o pedido inteiro, aplica o que for possível e, no final, mostra como atendeu cada item (feito, em parte ou não foi possível).
- **Sem prévia antes da edição**: o vídeo só aparece depois de pronto, junto com o botão de baixar e o resumo do que foi feito.
- Removido tudo o que era de advocacia (informações da OAB).

## Testar no seu computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
cp .env.example .env   # depois preencha as chaves (veja abaixo)
npm run dev
```

Abra http://localhost:5173 no Chrome ou no Edge.

Sem nenhuma chave o app já funciona: cria contas, corta as pausas pela análise do áudio, coloca a vinheta e gera o MP4. Mas aí o vídeo sai **sem legendas** e sem a leitura do pedido pela IA, e a tela de resultado avisa isso.

### Chaves de IA (arquivo `.env` ou variáveis na Vercel)

| Variável | Para quê | Onde conseguir |
| --- | --- | --- |
| `OPENAI_API_KEY` | Transcrição com o tempo de cada palavra (Whisper) | platform.openai.com |
| `GROQ_API_KEY` | Alternativa mais barata para a transcrição (opcional) | console.groq.com |
| `ANTHROPIC_API_KEY` | Planejamento da edição e leitura do pedido adicional (Claude) | console.anthropic.com |

As chaves ficam só no servidor (pasta `api/`) e nunca vão para o navegador.

## Publicar na Vercel

1. Na Vercel, **Add New → Project** e importe este repositório.
2. O framework é detectado como **Vite**. Não precisa mudar nada no build.
3. Em **Settings → Environment Variables**, adicione as chaves da tabela acima (e as do Supabase, se for usar).
4. Faça o deploy. As funções `api/transcribe` e `api/plan` sobem junto.

## Contas na nuvem com Supabase (opcional, recomendado para produção)

Sem Supabase o app roda em **modo local**: as contas e os projetos ficam guardados no navegador de quem usa. É ótimo para testar, mas a conta não aparece em outro aparelho.

Para ter contas de verdade:

1. Crie um projeto em supabase.com.
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria a tabela de projetos, as regras para cada conta ver só os próprios projetos e o bucket privado `videos`.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Adicione na Vercel (ou no `.env`):
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
5. Em **Authentication → URL Configuration**, coloque o endereço do seu site em **Site URL**. Se não quiser exigir confirmação de e-mail, desligue **Confirm email** em **Authentication → Providers → Email**.
6. Faça um novo deploy.

Com o Supabase ligado, as rotas de IA só atendem quem está logado, então ninguém de fora gasta as suas chaves.

## Como funciona por dentro

```
Navegador                                         Servidor (Vercel)
─────────                                         ─────────────────
1. Lê o vídeo e analisa o áudio (pausas)
2. Envia só o áudio, em trechos ───────────────▶  api/transcribe → Whisper
                                 ◀─────────────── palavras com tempo
3. Envia transcrição + opções + pedido ────────▶  api/plan → Claude
                                 ◀─────────────── plano (cortes, destaques, zooms…)
4. Monta o vídeo final (WebCodecs) e salva o MP4
```

- O vídeo **não é enviado** para o servidor: só o áudio, para transcrever. A montagem acontece no navegador, então a aba precisa ficar aberta até terminar (dá para navegar pelo app enquanto isso).
- O resultado é MP4 (H.264 + AAC), que funciona no Instagram, TikTok, YouTube e WhatsApp.
- Navegadores: Chrome, Edge ou Safari atualizados. Vídeos de até 20 minutos.

## Estrutura

```
api/                 funções da Vercel (transcrição e plano de edição)
src/pages/           telas: login, projetos, novo vídeo, projeto
src/components/      componentes visuais
src/lib/backend.ts   contas e projetos (modo local ou Supabase)
src/lib/pipeline/    etapas da edição (áudio, IA, orquestração)
src/lib/render/      legendas, vinheta, linha do tempo e renderização
supabase/schema.sql  banco de dados para o modo nuvem
```

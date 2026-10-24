# O app inteiro no navegador (modo demonstração)

É o que vai publicado como artifact no claude.ai: **as mesmas páginas, layouts
e ações do app** (landing, entrar/criar conta, onboarding, Início, Projetos com
pastas, Novo vídeo, página do vídeo, Exemplos, Como fazer, Marca, Assinatura,
Configurações) rodando numa página só, com o **editor de vídeo de verdade** no
lugar do worker. Nada vai para servidor: os dados ficam no navegador de quem usa.

## Como funciona

O `build.mjs` empacota o código do app com esbuild e troca só o que depende de
servidor:

| No app | Na demonstração (`src/`) |
| --- | --- |
| Supabase (banco, auth, storage, realtime) | `demo/db.ts` + `demo/supabase.ts`: tabelas no `localStorage`, arquivos no IndexedDB, mesma API do cliente (`from().select().eq()…`, `rpc`, `storage`, `auth`, `channel`) |
| Funções SQL (`submit_project`, `request_revision`…) | `demo/rpc.ts`, com as mesmas regras de cota e status |
| Rotas do Next | `demo/router.ts` + `demo/routes.tsx`: rotas no hash (`#/app/projetos`); páginas de servidor chamadas como funções async |
| `next/link`, `next/navigation`, `next/headers`, `next/cache` | `shims/` |
| Server actions | as reais, embrulhadas (`demo/actions.ts`) para que `redirect()` vire navegação |
| Worker de edição (`dispatchJob`) | `demo/worker.ts`: o editor de `lib/browser-editor/` com as opções do projeto e da marca; atualiza `render_jobs` passo a passo e grava o MP4 e a capa |
| Ajustes ("Solicitar ajuste") | Claude (capacidade `sample`) transforma o pedido em mudanças na edição; sem ela, regras por palavras-chave |
| E-mail, pagamentos, Claude Managed Agents | desligados (`shims/email.ts`, `payments.ts`, `session-lifecycle.ts`) |

Cadastro sai com e-mail confirmado e período de avaliação do Plano
Profissional. "Continuar com Google" cria uma conta de demonstração.
`#/demo/recomecar` apaga tudo deste navegador.

## O editor (tudo em `lib/browser-editor/`)

| Etapa | Como |
| --- | --- |
| Pausas | Áudio decodificado (Web Audio), energia por quadro de 20 ms, limiar adaptativo; corta silêncios conforme o estilo |
| Legendas | Whisper base (transformers.js + ONNX Runtime em WebAssembly), palavra a palavra |
| Revisão com IA | Claude (capacidade `sample` do artifact): corrige a transcrição, tira frases repetidas, respeita a duração pedida e os pedidos da pessoa, sugere título, destaques e alertas da OAB |
| Enquadramento | `FaceDetector` do navegador → Claude olhando 3 quadros → centro |
| Grafismos | Canvas: título, nome e OAB, legendas, zoom, barra de progresso, chamada final, vinheta, logo |
| Áudio | Filtro de voz, compressor, normalização e limitador (OfflineAudioContext) |
| Exportação | WebCodecs (H.264/AAC, ou VP9/Opus) + `mp4-muxer`, quadro a quadro a 30 fps; sem WebCodecs, MediaRecorder em tempo real |
| Download | Capacidade `downloads` do artifact; fora do claude.ai, link de download comum |

## Gerar

```bash
cd preview && npm install --ignore-scripts && cd ..
npm run build                       # o CSS vem do build do Next
node preview/build.mjs              # saída em preview/dist
(cd preview && npm run typecheck)   # tipos do código da demonstração
```

O build baixa o modelo `sts-whisper-base` do npm (Xenova/whisper-base,
quantizado) para `preview/.cache` e o divide em partes de até 12 MB (extensão
`.wasm`) em `dist/modelos/`. O ONNX Runtime vai em `dist/ort/`.

Para testar localmente: `cd preview/dist && python3 -m http.server` e abra
`http://localhost:8000/`.

## Publicar como artifact

Publique `dist/index.html` com os demais arquivos de `dist/` em `files`
(as partes vão com extensão `.wasm`, que o artifact serve) e as capacidades
`{ downloads: true, sample: { images: true } }`. Cada publicação aceita até
64 MB: mande primeiro a página, os scripts, a mídia, o `ort/` e o encoder, e
depois as partes do decoder.

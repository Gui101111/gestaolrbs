# Página inicial com o editor no navegador

Versão estática da landing (a mesma dos componentes do app) com o **editor de
vídeo rodando no navegador**: a pessoa envia o vídeo, escolhe estilo, formatos
e detalhes, e baixa o MP4 editado. Nada é enviado para servidor. É o que vai
publicado como artifact no claude.ai.

## O que o editor faz (tudo em `lib/browser-editor/`)

| Etapa | Como |
| --- | --- |
| Pausas | Áudio decodificado (Web Audio), energia por quadro de 20 ms, limiar adaptativo; corta silêncios conforme o estilo |
| Legendas | Whisper base (transformers.js + ONNX Runtime em WebAssembly), palavra a palavra |
| Revisão com IA | Claude (capacidade `sample` do artifact): corrige a transcrição, tira frases repetidas, sugere título, destaques e alertas da OAB |
| Enquadramento | `FaceDetector` do navegador → Claude olhando 3 quadros → centro; ajuste manual depois |
| Grafismos | Canvas: título, nome e OAB, legendas, zoom, barra de progresso, chamada final, vinheta, logo |
| Áudio | Filtro de voz, compressor, normalização e limitador (OfflineAudioContext) |
| Exportação | WebCodecs (H.264/AAC, ou VP9/Opus) + `mp4-muxer`, quadro a quadro a 30 fps; sem WebCodecs, MediaRecorder em tempo real |
| Download | Capacidade `downloads` do artifact; fora do claude.ai, link de download comum |

Sem a capacidade `sample` (fora do claude.ai), a revisão é local: título pela
primeira frase e alertas da OAB por regras.

## Gerar

```bash
cd preview && npm install --ignore-scripts && cd ..
npm run build            # o CSS vem do build do Next
node preview/build.mjs   # saída em preview/dist
```

O build baixa o modelo `sts-whisper-base` do npm (Xenova/whisper-base,
quantizado) para `preview/.cache` e o divide em partes de até 12 MB (extensão `.wasm`) em
`dist/modelos/`. O ONNX Runtime vai em `dist/ort/`.

Para testar localmente: `cd preview/dist && python3 -m http.server` e abra
`http://localhost:8000/#editor`.

## Publicar como artifact

Publique `dist/index.html` com os demais arquivos de `dist/` em `files`
(as partes vão com extensão `.wasm`, que o artifact serve) e as capacidades
`{ downloads: true, sample: { images: true } }`. Cada publicação aceita até
64 MB: mande primeiro a página, os scripts, a mídia, o `ort/` e o encoder, e
depois as partes do decoder.

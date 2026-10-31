# Status de produção · vídeo Remotion · auxílio-acidente

| Campo | Valor |
| --- | --- |
| Fase atual | **CONCLUÍDO**: MP4 final gerado e verificado. |
| Versão do roteiro | v1 (31/10/2026) |
| Aprovação | v1 aprovada em 31/10/2026: o usuário pediu "o vídeo pronto pra eu baixar em MP4" depois de receber a v1. |
| Origem do pedido | Skill `remotion-problem-resolve-video` com o tema "Auxílio-acidente: Se machucou no trabalho e voltou a trabalhar? Você pode ter direito a um benefício todo mês." |

## Arquivos

- `roteiro.md`: briefing, tabela cronológica (16 cenas, 2700 frames), estrutura de dados, áudio, critérios de aceite, fontes
- `scene-plan.ts`: tipos + 16 cenas completas (vira `src/data/scenes.ts` na Fase 2); o cabeçalho traz os parâmetros de `utils/timing.ts`
- `narration.json`: falas s1…s16 (entrada do `scripts/voiceover.py`)

## Preferências do usuário

- Tom descontraído e divertido, para informar e entreter.
- Gancho nos 3 primeiros segundos com **pergunta** (o usuário deixou a escolha comigo, com preferência por pergunta).
- **Voz feminina natural**, não de locutora.
- Canal "Advogado de Bolso", com a mascote Lia (do kit do canal em `../ep01-auxilio-acidente/`).

## Premissas

- 90 s, 1080 × 1920, 30 fps, pt-BR, público leigo.
- TTS gratuito: edge-tts `pt-BR-ThalitaMultilingualNeural`, +6 %. ElevenLabs só com autorização.
- Trilha e efeitos sintetizados por código.

## Pendências para a Fase 2 (após aprovação)

1. Criar o projeto Remotion isolado (ex.: `advogado-de-bolso/video-remotion-ep01-auxilio-acidente/projeto/`), instalar dependências e copiar template e scripts.
2. Gerar a narração s1…s16 → `prepare_vo.py` → cortes derivados da voz.
   Se não couber em 90 s: reduzir as pausas para 0,4 s. Se ainda assim não couber, pedir aprovação para um corte de texto.
3. Construir o diorama (ilha, depósito, INSS, cofrinho com corte, canos com moedas, personagens low-poly Marcos e Lia, mão detalhada).
4. Sintetizar os efeitos novos (`rewind`, `coin`, `boing`, `siren`, `stamp`, `crack`, `lock`, `phone`, `gavel`) e adaptar a trilha.
5. Rodar `tsc` e lint, gerar stills e folhas de contato, revisar visualmente, renderizar o MP4, conferir com ffprobe e medir o áudio, normalizar a −14 LUFS.

## Histórico

- 31/10/2026: Fase 1 v1 entregue.
- 31/10/2026: v1 aprovada (pedido do MP4). Fase 2 iniciada em `projeto/`. Voz gerada (edge-tts Thalita +9 %, 81,8 s de fala). Efeitos e trilha sintetizados. `tsc` ok. 4 rodadas de stills revisadas e corrigidas.
- 31/10/2026: render completo concluído. Medido: H.264 1080×1920, 30 fps, 2700 frames, 90,0 s, AAC; −14,0 LUFS, pico −1,4 dBFS, sem clipping. Entrega: `advogado-de-bolso-auxilio-acidente.mp4` (36 MB, versão leve para celular, CRF 21).

## Como renderizar de novo

```bash
cd projeto && npm install
python3 scripts/sfx.py && python3 scripts/music.py
npx remotion render AuxilioAcidente out/auxilio-acidente-raw.mp4 --gl=swangle --concurrency=4 --crf=18
python3 scripts/loudnorm.py out/auxilio-acidente-raw.mp4 out/auxilio-acidente.mp4
```

Com GPU, use `--gl=angle`. Neste ambiente sem GPU foi usado `--gl=swangle` com `--browser-executable` apontando para o Chromium local.
A narração (`public/audio/vo`) é regenerada com `scripts/voiceover.py --provider edge --voice pt-BR-ThalitaMultilingualNeural --rate +9%` seguido de `scripts/prepare_vo.py`.
- 31/10/2026: o usuário reprovou o vídeo v1 (voz com sotaque inglês, chamada para ação, animação pouco dinâmica). Roteiro **v2** em `roteiro-v2.md`: AGUARDANDO APROVAÇÃO e o vídeo de exemplo do usuário. Implementação da v2 não iniciada.

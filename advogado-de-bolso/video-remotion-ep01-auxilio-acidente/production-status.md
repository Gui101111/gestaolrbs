# Status de produção · vídeo Remotion · auxílio-acidente

| Campo | Valor |
| --- | --- |
| Fase atual | **Fase 1 concluída: AGUARDANDO APROVAÇÃO.** Implementação e renderização não iniciadas. |
| Versão do roteiro | v1 (31/10/2026) |
| Aprovação | Pendente. Nenhuma versão foi aprovada ainda. |
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

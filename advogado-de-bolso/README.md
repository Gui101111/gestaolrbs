# Advogado de Bolso: kit do canal

Canal de animações 3D curtas (Reels, TikTok, Shorts) que explicam direitos em linguagem simples.
A mascote é a **Lia**, uma advogada em miniatura que mora no bolso da camisa das pessoas.

## Conteúdo

| Pasta / arquivo | O que é |
| --- | --- |
| `perfil/` | Imagens de perfil 3D (ícone e versão com nome) + prompt da mascote |
| `ep01-auxilio-acidente/PROMPT-MESTRE.md` | Bíblia de estilo, personagens, prompt único e os **20 prompts de clipe** prontos para colar |
| `ep01-auxilio-acidente/roteiro.md` | Tabela cena a cena com tempos, textos na tela, efeitos, checagem jurídica e legenda do post |
| `ep01-auxilio-acidente/narracao/narracao-completa.mp3` | **Narração pronta** (voz feminina natural, 89,7 s) |
| `ep01-auxilio-acidente/narracao/legendas.srt` | Legendas sincronizadas palavra a palavra (importe no CapCut) |
| `ep01-auxilio-acidente/narracao/amostras-de-voz/` | Mesma frase em 3 vozes, para comparar |

## Status

- EP01 (auxílio-acidente): roteiro v1, narração e prompts prontos. **Falta gerar os clipes de vídeo** na IA de vídeo e editar.

## Aviso importante sobre o nome

Pelo Estatuto da Advocacia (Lei 8.906/94, art. 3º), a denominação "advogado" é privativa de quem é inscrito na OAB.
Se o canal não tiver um advogado inscrito como responsável, vale confirmar com um profissional se o nome é adequado.
Em todo caso, mantenha o aviso "conteúdo informativo" e evite oferecer serviços ou prometer resultado (Provimento OAB 205/2021).

## Série de vídeos 3D (Remotion)

Todos os vídeos são verticais 9:16 (1080×1920, 30 fps), com voz `pt-BR-FranciscaNeural` e áudio em −14 LUFS.
O tom é só informativo: o fim de cada vídeo convida a compartilhar com um amigo.

| Ep. | Tema | Arquivo | Duração |
| --- | --- | --- | --- |
| 01 | Auxílio-acidente (v2) | `video-remotion-ep01-auxilio-acidente/advogado-de-bolso-auxilio-acidente-v2.mp4` | 67 s |
| 02 | BPC/LOAS | `video-ep02-bpc-loas/advogado-de-bolso-bpc-loas.mp4` | 53 s |
| 03 | Auxílio-doença (incapacidade temporária) | `video-ep03-auxilio-doenca/advogado-de-bolso-auxilio-doenca.mp4` | 62 s |
| 04 | Salário-maternidade | `video-ep04-salario-maternidade/advogado-de-bolso-salario-maternidade.mp4` | 62 s |
| 05 | Seguro-desemprego | `video-ep05-seguro-desemprego/advogado-de-bolso-seguro-desemprego.mp4` | 57 s |
| 06 | Pensão por morte | `video-ep06-pensao-por-morte/advogado-de-bolso-pensao-por-morte.mp4` | 62 s |

Para refazer um episódio, entre na pasta `projeto/` dele e rode:

```bash
python3 scripts/episode_vo.py       # gera a voz e ajusta os tempos
python3 scripts/sfx.py              # gera os efeitos sonoros
python3 scripts/music.py            # gera a trilha
bash scripts/finish.sh <nome>       # renderiza, ajusta o volume e gera a versão para celular e a folha de conferência
```

O texto de cada episódio fica em `scripts/narration.json` e as cenas em `src/data/scenes.ts`.

## Série 2: comédia "mito" + Halloween

Vídeos curtos (41–49 s) com piada, vilão zoeiro (cunhado, vizinha fofoqueira, sogra, compadre), NEGADO → recurso com a advogada de bolso → APROVADO → óculos de "mito". Detalhes e descrições prontas para postar em [`serie2/README.md`](serie2/README.md).

Nos projetos da série 2, a trilha é gerada com `python3 scripts/funk.py`, que é original e livre de direitos: funk, terror e forró.

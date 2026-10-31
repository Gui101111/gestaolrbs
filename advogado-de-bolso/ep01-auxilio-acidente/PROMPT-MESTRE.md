# Advogado de Bolso · EP01 · Auxílio-acidente: prompt mestre

Vídeo vertical 9:16 (1080 × 1920), com cerca de 1min31s (89,7 s de narração mais 1,8 s de cartão final), em animação 3D estilizada.
A narração **já está pronta**: `narracao/narracao-completa.mp3`. As legendas sincronizadas estão em `narracao/legendas.srt`.

Como usar:
1. Gere as **imagens de referência** dos dois personagens (seção 2).
2. Gere os **20 clipes** (seção 4) na sua IA de vídeo (Kling, Veo/Flow, Hailuo, Sora, Runway etc.).
   Sempre que a ferramenta deixar, use **imagem de referência / image-to-video** com as referências da etapa 1.
   É isso que mantém a Lia e o Marcos com a mesma cara em todos os clipes.
3. No CapCut (ou outro editor): coloque a narração, encaixe cada clipe no tempo indicado, importe o `.srt`
   e adicione os textos da coluna "Texto na tela" do `roteiro.md`.

> Os prompts dos clipes estão em **inglês** porque as IAs de vídeo obedecem melhor em inglês.
> Acima de cada um há um resumo em português. Todos pedem **"no text / no dialogue"**: texto e voz entram na edição.

---

## 1. Bíblia de estilo (vale para tudo)

| Item | Definição |
| --- | --- |
| Visual | 3D estilizado nível filme de animação para família: formas arredondadas, pele com leve translucidez, olhos grandes e expressivos, materiais macios. Nada realista nem assustador. |
| Luz | Luz principal quente (dourada) vinda de cima à esquerda, contraluz azul fria, sombras suaves, leve profundidade de campo. |
| Paleta | Azul-marinho `#0B2160` e azul-jeans `#2C5CC2` (marca), dourado `#F2BD3A`, branco. **Problema = vermelho**, **solução = verde**, termo técnico = azul, atenção = amarelo. |
| Câmera | Sempre em movimento leve (dolly-in, órbita curta, travelling). Nunca parada por mais de 2 s. Planos médios e closes, legíveis no celular. |
| Ritmo | Corte a cada 3 a 6 s. |
| Assinatura do canal | A **Lia**, advogada em miniatura que mora no **bolso da camisa** do personagem: ela sai do bolso para explicar. |
| Proibido | Sangue, ferimentos explícitos, texto gerado pela IA (sai com erros), logos reais, marcas. |

---

## 2. Personagens: gere estas imagens de referência primeiro

### Lia, a "Advogada de Bolso" (mascote do canal)

```text
Character design sheet of "Lia", a tiny palm-sized Brazilian female lawyer, about 10 cm tall, shown
full body in three views (front, three-quarter, side) plus a close-up of her face. Late 20s, warm brown
skin, curly dark hair tied in a high bun, big friendly brown eyes, round gold-rimmed glasses, confident
kind smile. Outfit: tailored navy-blue blazer with a tiny gold scales-of-justice lapel pin, white blouse,
navy trousers, white sneakers. Stylized 3D animated-feature-film character, soft subsurface skin,
rounded proportions, soft studio lighting, clean light-grey background, no text.
```

### Marcos, o trabalhador

```text
Character design sheet of "Marcos", a 38-year-old Brazilian warehouse worker, full body in three views
(front, three-quarter, side) plus a face close-up. Light-brown skin, short black hair, light stubble,
friendly round face, warm eyes. Outfit: light-blue denim work shirt with ONE chest pocket on his left
side, sleeves rolled up, grey cargo pants, brown work boots. Stylized 3D animated-feature-film
character, soft subsurface skin, rounded proportions, soft studio lighting, clean light-grey
background, no text.
```

### Os dois juntos (referência de escala)

```text
Stylized 3D animated-film still, vertical 9:16. Marcos (38-year-old Brazilian warehouse worker,
light-brown skin, short black hair, light stubble, light-blue denim work shirt with a chest pocket on
his left side) looks down smiling at his shirt pocket, where Lia (tiny 10 cm Brazilian female lawyer,
curly dark hair in a high bun, round gold glasses, navy-blue blazer) peeks out waist-up and waves.
Bright warehouse with cardboard boxes and shelves in the soft-focus background, warm key light, cool
blue rim light, no text.
```

---

## 3. Prompt mestre (versão única)

Use este bloco em ferramentas que geram vídeos longos com várias cenas, ou cole num assistente
(ChatGPT/Gemini) pedindo para ele dividir em clipes para a sua ferramenta.

```text
Crie um vídeo vertical 9:16 de ~90 segundos em animação 3D estilizada, nível filme de animação para
família (formas arredondadas, olhos grandes, pele macia, luz cinematográfica quente com contraluz azul,
profundidade de campo leve). Canal "Advogado de Bolso". Tema: AUXÍLIO-ACIDENTE do INSS.

PERSONAGENS (manter idênticos em todas as cenas):
- LIA: advogada brasileira em miniatura (10 cm), pele morena, cabelo cacheado escuro preso em coque
  alto, óculos redondos dourados, blazer azul-marinho com broche dourado de balança da justiça, blusa
  branca, tênis brancos. Mora no bolso da camisa do Marcos e sai dele para explicar. Simpática,
  confiante, expressiva.
- MARCOS: trabalhador de depósito, 38 anos, pele parda, cabelo preto curto, barba rala, rosto
  simpático, camisa jeans azul-clara com UM bolso no peito do lado esquerdo, calça cargo cinza, botas.

REGRAS: sem texto gerado na imagem, sem legendas, sem logos, sem sangue ou ferimentos explícitos,
sem falas (a narração entra depois). Câmera sempre em movimento suave; corte a cada 3–6 s.
Vermelho = problema, verde = solução.

SEQUÊNCIA:
1. (0–9 s) Marcos volta ao trabalho no depósito, carregando caixas, mão direita com leve cicatriz.
   A Lia sai do bolso da camisa e ergue uma moeda de ouro gigante para a câmera, com sorriso esperto.
2. (9–17 s) Flashback em tom sépia: Marcos escorrega de uma escada no depósito e cai sobre caixas
   (queda cômica, segura). Depois, em casa no sofá, mão e punho direitos engessados na tipoia; Lia
   sentada no gesso como num banco.
3. (17–26 s) Consultório da perícia: médico simpático tira o gesso e carimba um papel. De volta ao
   trabalho, close na mão direita: indicador e médio não dobram por inteiro, ele não consegue segurar
   bem a alça de uma caixa. Leve vinheta vermelha, rosto preocupado.
4. (26–35 s) A Lia pula para o ombro do Marcos, estala os dedos e um selo-escudo dourado brilhante
   surge flutuando sobre a mão dele, com raios de luz. Ela examina os dedos rígidos com uma lupa
   minúscula.
5. (35–42 s) Marcos recebe o envelope do salário do gerente e, ao mesmo tempo, uma moeda de ouro cai
   do alto na carteira dele; duas pilhas de moedas crescem lado a lado; a Lia vira as folhas de um
   calendário de parede, mês a mês.
6. (42–51 s) Marcos levanta a mão com cara de dúvida; a Lia dá de ombros sorrindo. Tela dividida em
   três painéis verticais: tombo leve de moto num gramado, escorregão no chão molhado da cozinha,
   tropeço numa pelada de bairro (tudo cômico, ninguém se machuca).
7. (51–63 s) Uma corda de veludo como entrada de evento; a Lia é a "porteira". Passam com luz verde:
   Marcos com uma carteira de trabalho azul na mão, uma empregada doméstica de avental, um trabalhador
   portuário de capacete com saca no ombro e um pequeno agricultor de chapéu de palha com cesto de
   verduras. Por último, um rapaz com notebook e uma vendedora de comida de rua param na corda com
   luz vermelha; a Lia faz cara de "sinto muito".
8. (63–71 s) A Lia corta uma moeda de ouro gigante ao meio, como uma pizza; uma metade flutua para a
   carteira do Marcos. Time-lapse: folhas de calendário voam, o cabelo do Marcos fica grisalho e ele
   termina numa festinha de aposentadoria com bolo e balões.
9. (71–82 s) Marcos espera em frente a uma caixa de correio vazia; a Lia bate no relógio de pulso. Os
   dois organizam laudos, exames e raio-x numa pasta azul na mesa da cozinha. Marcos liga num celular
   com a Lia de headset no ombro. Um carimbo vermelho bate num papel; a Lia ergue um martelinho de juiz,
   determinada, com a fachada de um tribunal com colunas ao fundo.
10. (82–90 s) Marcos sorri trabalhando, a Lia no bolso; ela aponta para a câmera, mostra um celular
    (gesto de "compartilha"), pisca e desliza de volta para dentro do bolso.
```

---

## 4. Os 20 clipes, prontos para colar

Gere cada clipe com 5 s ou 8 s (o que a ferramenta oferecer) e **corte no tempo indicado**.
Os tempos batem com a narração `narracao-completa.mp3`.

### Clipe 01 · 0:00.0 → 0:04.5 · Volta ao trabalho
_Marcos volta ao depósito, cumprimenta colegas e carrega uma caixa._
```text
Stylized 3D animated-film shot, vertical 9:16. Marcos (38-year-old Brazilian warehouse worker,
light-brown skin, short black hair, light stubble, light-blue denim work shirt with a chest pocket on
his left side, grey cargo pants) walks back into a bright warehouse full of shelves and cardboard boxes,
smiling and waving at coworkers, then picks up a box. His right hand shows a small faint scar. Camera:
slow dolly-in from medium-wide to medium shot. Warm morning light through high windows, cool blue rim
light, shallow depth of field. No text, no logos, no dialogue, ambient sound only.
```

### Clipe 02 · 0:04.5 → 0:09.3 · A Lia sai do bolso com a moeda
_A Lia sai do bolso, olha para a câmera e ergue uma moeda de ouro gigante._
```text
Stylized 3D animated-film close-up, vertical 9:16. On the chest pocket of a light-blue denim work shirt,
Lia (tiny 10 cm Brazilian female lawyer, warm brown skin, curly dark hair in a high bun, round gold
glasses, navy-blue blazer with a tiny gold scales pin, white blouse) pops out of the pocket, looks
straight at the camera with a knowing smile, then pulls out a shiny gold coin as big as her torso and
holds it up proudly; tiny sparkles. Camera: slow push-in and slight orbit. Warm key light, cool blue
rim light, warehouse bokeh behind. No text, no logos, no dialogue.
```

### Clipe 03 · 0:09.3 → 0:13.4 · Flashback: a queda
_Flashback em sépia: Marcos escorrega da escada e cai sobre caixas (cômico, sem ferimento visível)._
```text
Stylized 3D animated-film shot, vertical 9:16, warm sepia flashback color grade with soft film grain.
In a warehouse, Marcos (Brazilian worker, light-brown skin, short black hair, light-blue denim work
shirt) stands on a metal ladder reaching for a box on a high shelf; the ladder wobbles, he slips and
falls in a comedic slow-motion arc onto a pile of soft cardboard boxes, landing on his right hand and
grimacing. Safe cartoon physics, no blood, no visible injury. Camera: low angle tilting down to follow
the fall. No text, no dialogue.
```

### Clipe 04 · 0:13.4 → 0:17.2 · Em casa, afastado (auxílio-doença)
_Marcos no sofá com a mão engessada; a Lia sentada no gesso, balançando os pés._
```text
Stylized 3D animated-film shot, vertical 9:16, gentle sepia flashback grade. Cozy Brazilian living room.
Marcos (light-brown skin, short black hair, light stubble, casual t-shirt) sits on a sofa, right hand and
wrist in a white cast with an arm sling, looking bored at the TV. Lia (tiny 10 cm Brazilian female
lawyer, curly dark hair in a high bun, round gold glasses, navy-blue blazer) sits on top of the cast like
a bench, swinging her legs and nodding. A blue paper envelope rests on the coffee table. Camera: slow
lateral travelling. No readable text, no logos, no dialogue.
```

### Clipe 05 · 0:17.2 → 0:21.2 · Perícia e alta
_Na perícia, o médico tira o gesso e carimba um papel; Marcos sorri, aliviado._
```text
Stylized 3D animated-film shot, vertical 9:16, normal color grade. Clean medical office. A friendly
middle-aged doctor in a white coat removes the cast from Marcos's right hand, then stamps a document on
the desk with a satisfying thump. Marcos (Brazilian worker, light-brown skin, short black hair, light
stubble, light-blue denim work shirt) smiles with relief. Camera: medium shot, slow push-in toward the
stamp. Soft daylight. No readable text on the document, no logos, no dialogue.
```

### Clipe 06 · 0:21.2 → 0:26.3 · A mão que não fecha (PROBLEMA)
_Close na mão: dois dedos não dobram, a caixa escorrega; vinheta vermelha._
```text
Stylized 3D animated-film extreme close-up, vertical 9:16. Back in the warehouse, Marcos's right hand
slowly tries to close into a fist, but the index and middle fingers stay stiff and only bend halfway. He
tries to grip the handle of a cardboard box and it slips from his fingers. Cut-in to his worried face,
looking at his hand. Subtle red vignette at the frame edges, cooler desaturated light. Camera: macro
push-in on the hand, then rack focus to his face. No blood, no text, no dialogue.
```

### Clipe 07 · 0:26.3 → 0:31.0 · A revelação: auxílio-acidente (SOLUÇÃO)
_A Lia pula para o ombro, estala os dedos e surge um selo-escudo dourado sobre a mão._
```text
Stylized 3D animated-film shot, vertical 9:16. Lia (tiny 10 cm Brazilian female lawyer, warm brown skin,
curly dark hair in a high bun, round gold glasses, navy-blue blazer with gold scales pin) jumps out of
the chest pocket of Marcos's light-blue denim shirt onto his shoulder and snaps her fingers. A glowing
golden shield-shaped emblem with a scales-of-justice symbol materializes and floats above Marcos's
stiff right hand, casting warm light rays and sparkles; the red tint fades into warm green-gold light.
Marcos looks amazed. Camera: quick orbit from his shoulder to the hand. No text, no dialogue.
```

### Clipe 08 · 0:31.0 → 0:35.4 · Sequela permanente
_A Lia examina os dedos rígidos com uma lupa; os dedos brilham levemente._
```text
Stylized 3D animated-film close-up, vertical 9:16. Lia (tiny 10 cm Brazilian female lawyer, curly dark
hair in a high bun, round gold glasses, navy-blue blazer) stands on Marcos's open right palm and
inspects his stiff index and middle fingers with a tiny brass magnifying glass, explaining with
expressive hand gestures. The two stiff fingers glow with a soft blue outline. Camera: slow orbit
around the hand, shallow depth of field, warehouse bokeh. No text, no dialogue.
```

### Clipe 09 · 0:35.4 → 0:41.7 · Salário + auxílio juntos
_Marcos recebe o salário e uma moeda de ouro cai na carteira; duas pilhas crescem; calendário vira._
```text
Stylized 3D animated-film shot, vertical 9:16. In the warehouse, a friendly manager hands Marcos
(Brazilian worker, light-brown skin, light-blue denim work shirt) a pay envelope; at the same moment a
shiny gold coin drops from above into his open wallet. Beside him, two stacks of coins grow side by side.
On the wall, Lia (tiny 10 cm female lawyer, curly hair in a high bun, round gold glasses, navy-blue
blazer) flips the pages of a big wall calendar month by month, each flip adding a coin. Joyful mood,
warm light. Camera: slow crane up. No readable text, no logos, no dialogue.
```

### Clipe 10 · 0:41.7 → 0:45.4 · "Mas não foi no trabalho?"
_Marcos levanta o dedo com cara de dúvida; a Lia dá de ombros e sorri: "tudo bem"._
```text
Stylized 3D animated-film medium close-up, vertical 9:16. Marcos (Brazilian worker, light-brown skin,
short black hair, light stubble, light-blue denim work shirt with chest pocket) raises one finger with a
doubtful, questioning face and a raised eyebrow. Lia (tiny 10 cm female lawyer, curly hair in a high
bun, round gold glasses, navy-blue blazer), sitting on the edge of his shirt pocket, shrugs with a
relaxed reassuring smile and an "it's fine" hand wave. Soft yellow accent light. Camera: subtle
push-in. No text, no dialogue.
```

### Clipe 11 · 0:45.4 → 0:51.0 · Moto, casa, futebol
_Tela dividida em três: tombo de moto na grama, escorregão na cozinha, tropeço no futebol._
```text
Stylized 3D animated-film split screen, vertical 9:16, divided into three horizontal stacked panels.
Top: a man on a small motorcycle slowly tips over onto soft grass on a sunny weekend road. Middle: a man
slips on a wet kitchen floor at home, arms flailing. Bottom: a man trips over the ball during a
neighborhood soccer match on a dirt field at sunset. All comedic, safe cartoon physics, no injuries
shown, bright saturated colors. Each panel animates in sequence top to bottom. No text, no dialogue.
```

### Clipe 12 · 0:51.0 → 0:55.9 · A corda de veludo: carteira assinada passa
_A Lia é a "porteira" de uma corda de veludo; Marcos mostra a carteira de trabalho e passa com luz verde._
```text
Stylized 3D animated-film shot, vertical 9:16. A small elegant entrance with a gold post and a red
velvet rope, like a VIP line, on a navy-blue stage. Lia (tiny 10 cm Brazilian female lawyer, curly dark
hair in a high bun, round gold glasses, navy-blue blazer) stands on top of the gold post like a
doorkeeper holding a tiny clipboard. Marcos (Brazilian worker, light-brown skin, light-blue denim work
shirt) walks up holding a blue Brazilian work booklet; a green light glows, Lia nods and the rope opens.
Camera: slow lateral travelling. No readable text, no logos, no dialogue.
```

### Clipe 13 · 0:55.9 → 1:00.5 · Doméstica, avulso e produtor rural passam
_Passam, cada um com luz verde: empregada doméstica, trabalhador portuário e pequeno agricultor._
```text
Stylized 3D animated-film shot, vertical 9:16. Same velvet-rope entrance on a navy-blue stage, Lia (tiny
female lawyer, navy-blue blazer, round gold glasses) on top of the gold post. One by one, three
characters walk through as a green light glows for each: a Brazilian domestic worker in an apron, a
port dock worker with a hard hat carrying a sack on his shoulder, and a small family farmer with a
straw hat holding a basket of vegetables. Each one smiles and waves. Camera: steady tracking shot
following the line. No text, no dialogue.
```

### Clipe 14 · 1:00.5 → 1:03.1 · MEI e autônomo ficam de fora
_Um freelancer com notebook e uma vendedora de rua param na corda; luz vermelha; a Lia faz cara de "sinto muito"._
```text
Stylized 3D animated-film shot, vertical 9:16. Same velvet-rope entrance. A young freelancer holding a
laptop and a street food vendor with a small cart step up to the rope; a soft red light glows and the
rope stays closed. They shrug, a bit disappointed. Lia (tiny female lawyer, navy-blue blazer, round gold
glasses) on the gold post gives an apologetic, sympathetic face with her hand on her chest. Respectful
tone, no mockery. Camera: slow push-in. No text, no dialogue.
```

### Clipe 15 · 1:03.1 → 1:07.6 · Metade do salário de benefício
_A Lia corta uma moeda de ouro gigante ao meio, como pizza; uma metade flutua para a carteira de Marcos._
```text
Stylized 3D animated-film shot, vertical 9:16. On a wooden table, a giant shiny gold coin lies flat. Lia
(tiny 10 cm Brazilian female lawyer, curly dark hair in a high bun, round gold glasses, navy-blue
blazer) rolls a big pizza cutter across it, splitting it cleanly into two halves with a sparkle. One
half lifts off and floats gently into Marcos's open brown wallet held at the edge of the frame. Camera:
top-down shot that tilts into a three-quarter view. Warm light. No text, no dialogue.
```

### Clipe 16 · 1:07.6 → 1:11.5 · Até a aposentadoria
_Time-lapse: o calendário voa, Marcos envelhece e termina numa festinha de aposentadoria._
```text
Stylized 3D animated-film time-lapse, vertical 9:16. Calendar pages fly off a wall calendar in fast
motion while Marcos (Brazilian man, light-brown skin, friendly face) keeps working; his hair and stubble
gradually turn grey. He ends at a cheerful retirement party in the warehouse with a cake, colorful
balloons and coworkers clapping; Lia (tiny female lawyer, navy-blue blazer) throws confetti from his
shirt pocket. Camera: continuous slow dolly-in through the transition. No readable text, no dialogue.
```

### Clipe 17 · 1:11.5 → 1:16.9 · Não é automático: junte os laudos
_Marcos espera na caixa de correio vazia; a Lia bate no relógio. Depois os dois organizam laudos e exames numa pasta._
```text
Stylized 3D animated-film shot, vertical 9:16. Marcos (Brazilian worker, light-brown skin, short black
hair, light stubble) waits beside an empty mailbox; Lia (tiny 10 cm female lawyer, round gold glasses,
navy-blue blazer) on his shoulder taps her wristwatch impatiently. Match cut to a kitchen table: the two
of them organize medical reports, an X-ray film and exam papers into a blue folder; Lia drags a sheet of
paper bigger than herself. Soft yellow accent light. Camera: slow push-in. No readable text, no
dialogue.
```

### Clipe 18 · 1:16.9 → 1:19.6 · Pedido pelo telefone 135
_Marcos liga pelo celular; a Lia, de headset, ajuda no ombro dele._
```text
Stylized 3D animated-film medium close-up, vertical 9:16. Marcos (Brazilian worker, light-brown skin,
short black hair, light stubble, light-blue denim work shirt) makes a phone call on his smartphone,
holding the blue folder of medical documents. Lia (tiny 10 cm female lawyer, curly hair in a high bun,
round gold glasses, navy-blue blazer) sits on his shoulder wearing a tiny headset, giving a thumbs up.
Cozy kitchen background. Camera: gentle orbit. No readable text on the phone screen, no dialogue.
```

### Clipe 19 · 1:19.6 → 1:22.0 · Negado? Recurso ou Justiça
_Um carimbo vermelho bate no papel; a Lia ergue um martelinho de juiz em frente a um tribunal._
```text
Stylized 3D animated-film shot, vertical 9:16. A red rubber stamp slams down onto a document (no
readable text). Quick whip-pan to Lia (tiny 10 cm Brazilian female lawyer, curly dark hair in a high
bun, round gold glasses, navy-blue blazer) standing determined, raising a tiny wooden judge's gavel,
with the grand facade of a classical courthouse with columns behind her at golden hour. Heroic low
angle, warm golden light. No text, no dialogue.
```

### Clipe 20 · 1:22.0 → 1:29.7 · Final
_Marcos feliz trabalhando; a Lia aponta para a câmera, mostra o celular (compartilhe), pisca e volta para o bolso._
```text
Stylized 3D animated-film shot, vertical 9:16. Marcos (Brazilian worker, light-brown skin, short black
hair, light stubble, light-blue denim work shirt with chest pocket) works happily in the bright
warehouse, confident and relaxed. Camera pushes in to his chest pocket: Lia (tiny 10 cm Brazilian female
lawyer, curly dark hair in a high bun, round gold glasses, navy-blue blazer with gold scales pin) pops
out, points straight at the viewer, holds up a tiny smartphone as if to say "share this", winks and
slides back down into the pocket. Warm light, sparkles. No text, no dialogue.
```

### Cartão final · 1:29.7 → 1:31.5
Não precisa de IA. Use `../perfil/perfil-com-nome.png` em tela cheia, com um leve zoom, e adicione:
**"Siga o Advogado de Bolso"** + _"Conteúdo informativo. Cada caso precisa de análise individual."_

---

## 5. Voz (já gerada)

- **Arquivo:** `narracao/narracao-completa.mp3` (89,7 s, normalizado a −14 LUFS, o padrão das redes).
- **Voz:** Thalita (neural pt-BR, Microsoft), feminina, tom de conversa, velocidade +6 %. É gratuita.
- **Amostras para comparar:** `narracao/amostras-de-voz/` (Thalita, Francisca e Ava).
- **Para trocar a voz ou o texto:** edite `narracao/narration.json` e rode
  `python3 tts.py narration.json . pt-BR-ThalitaMultilingualNeural "+6%" "+0Hz"` e depois `python3 srt.py tempos.json legendas.srt`
  (requer `pip install edge-tts`).

**Quer uma voz ainda mais humana (paga)?** No ElevenLabs → _Voice Design_, use:

```text
Brazilian Portuguese female voice, around 30 years old, warm and friendly, conversational and natural,
like a smart friend explaining something over coffee — not a radio announcer. Light smile in the voice,
clear diction, medium pace, subtle natural breaths, São Paulo neutral accent.
```

Depois cole a narração do `roteiro.md` no ElevenLabs (modelo multilíngue, _stability_ ~45 %, _style_ ~25 %).

## 6. Som e edição

- **Trilha:** na biblioteca do CapCut, procure algo "corporate upbeat" ou "lo-fi light" e deixe em **−20 dB** sob a voz.
- **Efeitos (baixos):**
  - _pop_: Lia saindo do bolso (0:04.6, 1:23)
  - moeda: 0:07.9, 0:39.0, 1:05.0
  - queda e caixas: 0:11
  - carimbo: 0:19.3, 1:19.7
  - _whoosh_: viradas de calendário
  - brilho mágico: 0:28.1
- **Legendas:** importe `narracao/legendas.srt`, em fonte grossa (Montserrat Black), branca com contorno preto, centralizada a ~70 % da altura.
- **Textos na tela:** veja a coluna "Texto na tela" no `roteiro.md`. Ponha no topo, sem cobrir as legendas.
- **Lábios da Lia:** a narração é voz em off. Se quiser a Lia "falando" nos clipes 02, 08 e 20, use a função _Lip Sync_
  da sua ferramenta com o trecho de áudio correspondente.

# Roteiro · "Trabalhar e receber do INSS ao mesmo tempo?" (auxílio-acidente) · Remotion 3D

> **Versão 1** (Fase 1). AGUARDANDO APROVAÇÃO: implementação e renderização não iniciadas.
> Convenção: timestamps `MM:SS:FF` a 30 fps (FF de 00 a 29); quadros em intervalo semiaberto [início, fim).
> Os frames locais citados são **estimativas antes do TTS** (~155 palavras/min, como o template calcula).
> Depois da voz real, os cortes e os momentos passam a ser derivados da narração.

## 1. Briefing de produção

| Item | Definição |
| --- | --- |
| Canal | Advogado de Bolso |
| Tema | Auxílio-acidente (Lei 8.213/91, art. 86) |
| Recorte concreto | **Marcos**, estoquista de depósito com **carteira assinada**, cai da escada no trabalho, machuca a mão direita, fica afastado recebendo auxílio-doença, tem alta e volta com **dois dedos que não dobram** (sequela permanente que reduz a capacidade). |
| Público | Leigos, 25 a 60 anos, no celular |
| Objetivo | Entender que o benefício existe, que **soma com o salário**, que vale para acidente de qualquer natureza, quem tem direito, quanto paga em regra, até quando e como pedir |
| Formato | 90 s · 1080 × 1920 (9:16) · 30 fps · 2700 frames · pt-BR |
| Tom | **Descontraído e divertido**: humor visual (escada "dançando", caixa que "ganha" da mão, sirene de "golpe"), frases curtas, segunda pessoa |
| Gancho (0–3 s) | **Pergunta**: "Trabalhar e receber do INSS ao mesmo tempo?" sobre a imagem do Marcos trabalhando enquanto **dois canos** enchem o cofrinho dele. Logo depois, a piada: "Parece golpe, né? Mas é lei." |
| Direção de arte | Diorama 3D low-poly (materiais foscos, `flatShading`), ilha flutuante como maquete, câmera FOV ~24–26°, fundo em degradê. Cores da marca: azul-marinho `#0B2160`, azul-jeans `#2C5CC2`, dourado `#F2BD3A`. Problema = vermelho ✖, solução = verde ✔, termo = azul ℹ, pergunta = amarelo ❓. |
| Mascote | **Lia**, advogada em miniatura (low-poly) que mora no bolso da camisa do Marcos e aparece nos momentos-chave (revelação, pedido e final). |
| Voz (TTS) | **edge-tts, gratuito**, voz feminina natural **pt-BR-ThalitaMultilingualNeural**, velocidade +6 %. Sem serviço pago. |
| Trilha e efeitos | Sintetizados por código (sem direitos de terceiros). A trilha é leve e bem-humorada, e abaixa sob a voz. |

**O sistema construído na frente do espectador:** o **"encanamento da renda" do Marcos**. Uma ilha-maquete com
o **depósito** (empresa), o prédio do **INSS** e o **cofrinho** transparente do Marcos, ligados por canos que levam moedas.
Os problemas mexem nesse mesmo sistema, um de cada vez:
1. o acidente **fecha o cano do salário**;
2. o INSS **abre um cano azul temporário** (auxílio-doença);
3. a alta **fecha o cano azul**, o salário volta, mas a **mão tem sequela**;
4. nasce o **cano dourado** (auxílio-acidente), que corre **junto** com o do salário;
5. regras de quem entra pelo **portão** do INSS, quanto vale (moeda cortada ao meio) e até quando (linha do tempo até a aposentadoria);
6. a válvula dourada **trava com cadeado** quando o INSS não concede sozinho e só abre com o **pedido** ou com **recurso/Justiça**.

No fim, o sistema completo funciona.

## 2. Tabela cronológica completa

| Timestamp (Início - Fim) | Quadro (Frame Inicial - Final a 30 fps) | Narração (Locução TTS) | Descrição da Cena & Câmera | Props & Elementos 3D/2D | Animações & Transições (Remotion Props / Spring / Interpolate) | Badges & Textos (Highlights) |
| --- | --- | --- | --- | --- | --- | --- |
| 00:00:00 – 00:05:12 | 0 – 162 | Trabalhar e receber do INSS ao mesmo tempo? Parece golpe, né? Mas é lei. | **Gancho em ação desde o frame 0.** Plano médio do Marcos carregando uma caixa ao lado do cofrinho, enquanto **dois canos** (prata = salário, dourado = auxílio) despejam moedas nele (flash-forward do sistema completo). Câmera `orbit([-0.2,1.4,1.6], d=14, az 18°, el 14°)` com dolly-in lento até d=12. Em "golpe", uma sirene de polícia cômica cai do céu e pisca; o Marcos aperta os olhos, desconfiado. Em "lei", um livro grosso da lei cai em cima da sirene e a apaga. A câmera sobe para `orbit([0.4,2.0,0.6], 18, 12°, 22°)` mostrando os dois canos. No fim, efeito de "rebobinar". | Ilha-diorama, depósito, INSS, cofrinho com janela de corte, Marcos (low-poly, camisa jeans com bolso), cano do salário + cano dourado, moedas (instanciadas), sirene low-poly, livro da lei. | `coins.salary.flow` = 1 e `coins.accident.flow` = 1 (0→162); `pipeAccident.grow` = 1 (teaser); `marcos.carry` 0→1 linear 0–60 (caixa balança no passo); `siren.drop` spring 0→1 em "Parece" (≈ 101→131, damping 9); `siren.flash` 0→1 101–136 (pisca vermelho); `marcos.squint` 0→1 interpolate out em "golpe" (≈ 113→123); `lawBook.drop` spring 0→1 em "Mas" (≈ 136→160, damping 10); `siren.drop` 1→0 136–146 (esmagada); `rewind` 0→1 interpolate in 150→162 (dessatura + desfoque de movimento). | ❓ **TRABALHAR E RECEBER DO INSS?** (warning, icon ?, local 8→134) → ✔ **É LEI** — _Lei 8.213/91, art. 86_ (positive, local 136→162). Legenda: TRABALHAR, INSS, GOLPE, LEI. |
| 00:05:12 – 00:10:18 | 162 – 318 | Esse é o Marcos: carteira assinada, e todo mês o salário cai no cofrinho. | O rebobinar desfaz o cano dourado (estado inicial do sistema). Plano aberto da ilha inteira `orbit([0,1.2,-1.2], 44, 18°, 28°)` com rótulos EMPRESA / INSS / COFRINHO; dolly-in até o Marcos empilhando caixas na porta do depósito `orbit([-2.2,1.3,-2.0], 15, 22°, 14°)`. Uma carteira de trabalho azul gira sobre a cabeça dele. Em "salário", o cano prata pulsa e as moedas descem até o cofrinho. | Ilha, depósito, INSS (neutro), cofrinho (nível baixo), cano do salário com válvula verde, carteira de trabalho 3D, rótulos 3D ancorados (EMPRESA, INSS, COFRINHO, SALÁRIO). | `rewind` 1→0 interpolate out 0→14; `pipeAccident.grow` 1→0 interpolate in 0→14; `coins.accident.flow` 1→0 0→8; `coins.salary.flow` 1→0 0→8; `marcos.spot` 0→1 linear 0→14 (vai do cofrinho para o depósito durante o rebobinar); `labels.system` 0→1 out 14→44 (+6 frames por rótulo); `workBooklet.pop` spring 0→1 em "carteira" (≈ 54→84, damping 10) e 1→0 em "todo" (≈ 89→109); `coins.salary.flow` 0→1 out em "salário" (≈ 124→136); `piggy.level` 0,15→0,35 linear 124→156. | ℹ **CARTEIRA ASSINADA** (info, 54→120) → ✔ **SALÁRIO TODO MÊS** (positive, 124→156). Legenda: MARCOS, CARTEIRA, ASSINADA, SALÁRIO, COFRINHO. |
| 00:10:18 – 00:16:06 | 318 – 486 | Até que a escada resolveu dançar… e o Marcos caiu de mão no chão. | Câmera vai para a estante ao lado do depósito `orbit([-2.6,1.8,-2.2], 13, 25°, 14°)`. O Marcos sobe a escada para pegar uma caixa. Em "dançar" a escada balança de um lado para o outro (cômico, como se dançasse). Em "caiu" ele faz um arco e aterrissa de mão sobre a pilha de caixas. A câmera desce acompanhando, `el 14°→6°`, com tremida curta no impacto. Estrelinhas de tontura giram sobre a cabeça. Sem sangue. | Estante alta, escada, caixas, pilha de caixas macias, Marcos, estrelinhas (partículas). | `marcos.climb` 0→1,2 (u3d, altura nos degraus) inOut 0→40; `ladder.wobble` 0→1 linear em "resolveu"→"caiu" (≈ 54→113), ângulo z = 18°·sin(4π·t)·wobble; `marcos.fall` spring 0→1 em "caiu" (≈ 113→143, damping 12; y 1,2→0, x +0,8 u3d); `ladder.wobble` 1→0 113→120; `camera.shake` 0→1 out 140→145 e 1→0 145→152; `dizzy.stars` 0→1 out 145→160. | ✖ **ACIDENTE** (negative, 113→168). Legenda: ESCADA, DANÇAR, CAIU, MÃO. |
| 00:16:06 – 00:20:12 | 486 – 612 | Mão engessada, nada de trabalho. O salário parou. E agora? | A câmera faz tracking até o banquinho ao lado do cofrinho: `orbit([0,1.6,1.6], 15, −5°, 16°)` → `orbit([0.2,1.6,1.4], 15, 12°, 16°)`. O Marcos, com a mão direita num gesso branco "gordinho" e tipoia, senta. Em "parou", a válvula do cano do salário gira e acende vermelho, as moedas param e a última pinga devagar. Em "E agora?", ele coça a cabeça com a mão boa. | Banquinho, gesso + tipoia, válvula do salário (luz vermelha), cofrinho (nível parado). | `marcos.spot` 1→0 inOut 0→30 (caminha de tipoia até o banquinho); `cast.on` spring 0→1 4→30; `marcos.sit` 0→1 inOut 24→40; `salaryValve.closed` 0→1 out em "salário" (≈ 78→88); `coins.salary.flow` 1→0 in em "parou" (≈ 89→101); `marcos.scratch` 0→1 em "E" (≈ 101→126). | ✖ **SALÁRIO PAROU** — _empresa paga só os 15 primeiros dias_ (negative, 78→99) → ❓ **E AGORA?** (warning, icon ?, 101→126). Legenda: ENGESSADA, SALÁRIO, PAROU, AGORA. |
| 00:20:12 – 00:24:18 | 612 – 738 | Calma! Enquanto ele se recupera, o INSS paga o auxílio-doença. | A câmera sobe e recua até ver INSS + canos + cofrinho: `orbit([1.6,2.0,-1.2], 24, −12°, 22°)`. O INSS acende. Do prédio nasce um **cano azul** que cresce até o cofrinho, e moedas azuis caem. Uma ampulheta pequena surge sobre o cano azul (é temporário). O Marcos faz joinha no banquinho. | INSS (acende), cano azul (auxílio-doença), moedas azuis, ampulheta 3D. | `inss.glow` 0→1 out 0→15; `pipeSick.grow` 0→1 out em "INSS" (≈ 78→100); `coins.sick.flow` 0→1 100→110; `piggy.level` 0,35→0,42 linear 110→126; `hourglass.pop` spring 0→1 em "auxílio-doença" (≈ 113→143, damping 10); `marcos.thumb` 0→1 out 100→115. | ✔ **AUXÍLIO-DOENÇA** — _hoje: auxílio por incapacidade temporária_ (positive, 78→126). Legenda: CALMA, INSS, AUXÍLIO-DOENÇA. |
| 00:24:18 – 00:30:12 | 738 – 912 | Aí vem a perícia: alta! O gesso sai, o auxílio acaba e o salário volta. | Close médio sobre o Marcos `orbit([-0.6,2.4,2.0], 11, 10°, 10°)`: um carimbo gigante desce sobre uma folha que flutua, e em "alta" bate com força (luz verde). O gesso estoura em pedacinhos. A câmera abre para `orbit([0.4,1.8,-1.0], 26, 8°, 22°)`: o cano azul se recolhe para dentro do INSS, a válvula do salário volta verde e as moedas prata voltam a cair. O Marcos levanta e caminha até o depósito. | Carimbo, folha da perícia, gesso (partículas), cano azul, válvulas, Marcos. | `stamp.drop` spring 0→1 em "perícia" (≈ 43→66, damping 8; impacto em "alta") e 1→0 in 68→84; `cast.shatter` 0→1 out em "gesso" (≈ 78→100) e `cast.on` 1→0 78→80; `marcos.sit` 1→0 100→115; `coins.sick.flow` 1→0 108→115; `pipeSick.grow` 1→0 in em "auxílio" (≈ 113→140); `hourglass.pop` 1→0 113→125; `salaryValve.closed` 1→0 em "salário" (≈ 159→169); `coins.salary.flow` 0→1 160→174; `marcos.spot` 0→1 inOut 120→174. | ℹ **PERÍCIA: ALTA** (info, 54→110) → ✔ **SALÁRIO VOLTA** (positive, 159→174). Legenda: PERÍCIA, ALTA, GESSO, SALÁRIO. |
| 00:30:12 – 00:36:24 | 912 – 1104 | Só que dois dedos não dobram mais. Ele tenta pegar a caixa… e a caixa ganha. | Close extremo na mão direita `orbit([-2.35,1.05,-1.55], 2.6, 20°, 8°)`. A mão tenta fechar: polegar, anelar e mindinho fecham, mas **indicador e médio param na metade**, com contorno vermelho pulsando. A câmera abre para `d=4.2`: ele segura a alça de uma caixa, a caixa escorrega, cai e quica (cômico). A câmera recua para o rosto, `orbit([-2.5,1.8,-1.8], 10, 18°, 10°)`, e um medidor **CAPACIDADE** sobre a cabeça desce de cheio (verde) para reduzido (laranja). O medidor é esquemático, sem números. Vinheta vermelha leve. | Mão detalhada (palma + 5 dedos com 2 falanges), caixa com alça, medidor 3D de capacidade, contorno vermelho, vinheta 2D. | `hand.close` 0→1 inOut 6→54 (dedos 1, 4 e 5 até 85°; dedos 2 e 3 limitados a 30° por `fingers.stiff` = 1); `stiff.glow` 0→1 em "dois" (≈ 31→45); `vignette.red` 0→0,6 30→60; `box.grip` 0→1 em "pegar" (≈ 101→125); `box.slip` 0→1 in em "caixa…" (≈ 136→156) seguido de quique (`box.bounce` spring 156→186, damping 7); `capacity.pop` spring 0→1 136→156; `capacity.level` 1→0,6 out em "e a caixa ganha" (≈ 147→172). | ✖ **SEQUELA** — _dedos que não dobram_ (negative, 54→140) → ✖ **MENOS CAPACIDADE** (negative, 147→192). Legenda: DEDOS, DOBRAM, CAIXA, GANHA. |
| 00:36:24 – 00:44:24 | 1104 – 1344 | É pra isso que existe o auxílio-acidente: uma indenização do INSS pra quem ficou com sequela que reduz a capacidade de trabalho. | **Revelação.** O plano tem 8 s porque junta o nome e a definição numa única virada. Close no bolso da camisa `orbit([-2.62,1.38,-1.62], 3.5, 18°, 6°)`: a **Lia** pula do bolso e aponta para o INSS. A câmera faz órbita e sobe para `orbit([1.4,2.4,-0.8], 26, −15°, 24°)`, acompanhando um **cano dourado** que nasce do INSS e cresce até o cofrinho, brilhando. A vinheta vermelha some e o fundo esquenta. Moedas douradas começam a cair. Termina em `orbit([1.3,1.4,2.0], 12, 25°, 14°)`, no cofrinho. | Lia (mini figura low-poly: blazer azul-marinho, coque, óculos dourados), cano dourado com válvula, moedas douradas, partículas de brilho, INSS, medidor de capacidade. | `lia.pop` spring 0→1 6→40 (damping 9; sobe 0,25 u3d do bolso); `lia.point` 0→1 out 40→60; `vignette.red` 0,6→0 em "auxílio-acidente" (≈ 78→100); `pipeAccident.grow` 0→1 out 78→130; `pipeAccident.glow` 0→1 78→100 e 1→0,3 130→160; `coins.accident.flow` 0→1 130→145; `piggy.level` 0,42→0,55 linear 145→240; `stiff.tone` 0→1 em "sequela" (≈ 182→195; contorno vermelho → azul, "reconhecida"); `lia.pop` 1→0 in 215→235. | ✔ **AUXÍLIO-ACIDENTE** (positive, 78→165) → ℹ **INDENIZAÇÃO** — _sequela que reduz a capacidade de trabalho_ (info, 101→240). Legenda: AUXÍLIO-ACIDENTE, INDENIZAÇÃO, SEQUELA, CAPACIDADE. |
| 00:44:24 – 00:49:06 | 1344 – 1476 | E ele continua trabalhando! Salário e auxílio caem juntos, todo mês. | Plano médio do cofrinho em corte, em órbita lenta `az 25°→5°` (`d=12, el 14°`). O Marcos aparece ao fundo empilhando caixas, com cuidado. Dentro do cofrinho, as moedas se separam em **duas colunas que sobem lado a lado** (prata = salário, ouro = auxílio). Um calendário 3D ao lado vira três folhas (meses), e a cada virada cai um par de moedas. | Cofrinho com janela de corte, moedas prata/ouro, calendário 3D, Marcos ao fundo. | `marcos.work` 0→1 linear 0→132 (ciclo de empilhar); `capacity.pop` 1→0 in 0→12; `piggy.split` 0→1 out em "Salário" (≈ 54→70); `piggy.level` 0,55→0,75 linear 54→132; `calendar.pop` spring 0→1 70→95; `calendar.flip` 0→1 (= 3 folhas) linear em "juntos" (≈ 101→132). | ✔ **SALÁRIO + AUXÍLIO** — _juntos, todo mês_ (positive, 54→132). Legenda: TRABALHANDO, SALÁRIO, AUXÍLIO, JUNTOS. |
| 00:49:06 – 00:55:18 | 1476 – 1668 | Ah, mas o tombo foi de moto, no fim de semana? Também vale: acidente de qualquer natureza. | A câmera gira para a borda direita da ilha, `orbit([4.0,0.8,1.4], 14, −25°, 16°)`. Um trecho de estrada surge (pop) com o Marcos de capacete numa moto. Em "moto", a moto tomba devagar de lado (cômico) e ele fica sentado, tonto. Em "qualquer natureza", surgem mais dois mini-cenários: uma casinha (escorregão) e um campinho com bola. Cada um ganha um ✔ verde 3D. A câmera abre para `orbit([4.0,0.9,1.2], 18, −30°, 20°)`. | Estrada low-poly, moto, Marcos de capacete, casinha, campinho + bola, ✔ 3D. | `road.pop` spring 0→1 6→30; `moto.tip` 0→80° (deg) in em "moto" (≈ 78→108); `rider.sit` 0→1 108→125; `house.pop` spring em "acidente" (≈ 159→179); `field.pop` spring 167→187; `checks.pop` spring 0→1 em "qualquer" (≈ 182→192, +6 por item). | ❓ **FORA DO TRABALHO?** (warning, icon ?, 43→130) → ✔ **QUALQUER NATUREZA** — _trabalho, trânsito, casa, lazer_ (positive, 159→192). Legenda: MOTO, SEMANA, VALE, QUALQUER, NATUREZA. |
| 00:55:18 – 01:02:18 | 1668 – 1878 | Mas nem todo mundo tem direito. Vale pra carteira assinada, inclusive doméstico, avulso e segurado especial, tipo pequeno produtor rural. | Na frente do INSS surge um **portão com catraca e luz**, `orbit([2.8,1.0,-2.2], 16, 15°, 14°)` com tracking até `az −5°`. Uma fila de bonequinhos chega pela direita: (1) trabalhador com carteira azul, (2) doméstica de avental, (3) portuário de capacete com saca no ombro, (4) produtor rural de chapéu de palha. Um a um, eles passam: a luz fica verde e sobe um ✔. O 5º da fila (com notebook) espera no fim. | Portão/catraca com luz, 5 bonecos low-poly com acessórios, ✔ 3D. | `side.shrink` 0→1 in 0→15 (mini-cenários da cena anterior encolhem); `gate.pop` spring 0→1 0→30; `queue.arrive` 0→1 inOut 20→80; `pawn1.pass` 0→1 inOut em "carteira" (≈ 101→125); `pawn2.pass` em "doméstico" (≈ 136→160); `pawn3.pass` em "avulso" (≈ 147→171); `pawn4.pass` em "segurado" (≈ 171→195); `gate.green` 0→1 linear da 1ª à 4ª passagem (a luz pisca verde a cada boneco). | ❓ **QUEM TEM DIREITO?** (warning, icon ?, 20→95) → ✔ **EMPREGADO E DOMÉSTICO** (positive, 101→210) → ✔ **AVULSO E SEGURADO ESPECIAL** (positive, 147→210). Legenda: DIREITO, CARTEIRA, DOMÉSTICO, AVULSO, SEGURADO, ESPECIAL. |
| 01:02:18 – 01:05:18 | 1878 – 1968 | MEI e autônomo? Ficam de fora. | Mesmo cenário, push-in até `orbit([3.0,1.0,-2.3], 12, −5°, 12°)`. O 5º bonequinho, de notebook na mão, tenta passar: a luz fica vermelha e o braço da catraca trava e balança. Ele dá de ombros. Tom respeitoso, sem deboche. | Bonequinho com notebook, catraca, luz vermelha. | `pawn5.try` 0→1 inOut 6→30; `gate.block` spring 0→1 em "Ficam" (≈ 43→70, damping 8); `gate.red` 0→1 43→50; `pawn5.shrug` 0→1 55→80. | ✖ **MEI E AUTÔNOMO** — _contribuinte individual não tem direito_ (negative, 8→90). Legenda: MEI, AUTÔNOMO, FORA. |
| 01:05:18 – 01:13:00 | 1968 – 2190 | E quanto é? Em regra, metade do salário de benefício, a média das contribuições. E cai até ele se aposentar. | Close sobre o cofrinho `orbit([1.3,3.6,2.0], 8, 15°, 10°)`: uma **moeda dourada gigante** (salário de benefício) gira. Em "metade" ela se parte ao meio, e uma das metades entra no cano dourado. Em "até ele se aposentar", a câmera desce e recua para `orbit([-1.0,0.6,3.0], 20, 10°, 30°)`: uma **linha do tempo** sai do cofrinho pelo chão até uma cadeira de balanço na beira da ilha. As moedas douradas correm pela linha e param na cadeira, onde uma placa ✖ fecha o fluxo (não acumula com aposentadoria). | Moeda gigante (2 metades), linha do tempo no chão com marcas de meses, cadeira de balanço, placa de parada. | `gate.pop` 1→0 e `pawns.shrink` 0→1 in 0→12; `bigCoin.pop` spring 0→1 6→30; `bigCoin.spin` 0→720° (deg) linear 6→66; `bigCoin.split` 0→1 out em "metade" (≈ 66→86; metades ±0,5 u3d); `halfCoin.drop` 0→1 in 90→120; `bigCoin.pop` 1→0 120→135; `timeline.grow` 0→1 out em "E cai" (≈ 171→200); `timeline.coins` 0→1 linear 171→210; `chair.pop` spring em "até" (≈ 194→214); `timeline.stop` spring 0→1 205→222. | ℹ **50% DO SALÁRIO DE BENEFÍCIO** — _em regra · média das contribuições_ (info, 66→165) → ℹ **ATÉ A APOSENTADORIA** — _não acumula com aposentadoria_ (info, 171→222). Legenda: QUANTO, METADE, SALÁRIO, BENEFÍCIO, APOSENTAR. |
| 01:13:00 – 01:19:12 | 2190 – 2382 | Mas nem sempre o INSS libera sozinho. Junta os laudos e pede pelo telefone um três cinco. | Close na válvula dourada `orbit([2.4,3.3,-0.6], 7, −15°, 10°)`. A válvula gira e fecha sozinha, um **cadeado** cai e trava, e o fluxo dourado para ("ops"). A câmera vai até o Marcos `orbit([-2.5,1.6,-1.7], 9, 12°, 10°)`: a Lia sai do bolso arrastando uma pasta azul com laudos e raio-x. O Marcos liga num celular low-poly cuja tela mostra **135**. A pasta voa em arco até o INSS, que pisca em amarelo ("em análise"). | Válvula dourada, cadeado, Lia, pasta azul (laudos + raio-x), celular com tela "135" (rótulo 2D ancorado), INSS com luz amarela. | `accidentValve.closed` 0→1 out em "o INSS" (≈ 43→55); `coins.accident.flow` 1→0 50→60; `padlock.drop` spring 0→1 em "libera" (≈ 66→96, damping 10); `lia.pop` spring 0→1 em "Junta" (≈ 89→115); `folder.pop` spring 0→1 em "laudos" (≈ 113→133); `phone.pop` spring 0→1 em "pede" (≈ 136→156); `phone.ring` 0→1 linear 150→180 (vibração ±4°); `folder.fly` 0→1 inOut 160→192 (arco até o INSS); `inss.review` 0→1 180→192. | ❓ **NEM SEMPRE É AUTOMÁTICO** (warning, 20→89) → ℹ **PEDIDO PELO 135** — _leve laudos e exames_ (info, 136→192). Legenda: SOZINHO, LAUDOS, TELEFONE. Os números falados aparecem como "135" na legenda. |
| 01:19:12 – 01:22:24 | 2382 – 2484 | Negaram? Dá pra recorrer ou ir à Justiça. | A pasta volta do INSS e um **carimbo vermelho** bate nela. A câmera faz uma órbita rápida até a válvula, em **contra-plongée heroico** `orbit([2.4,3.0,-0.6], 6.5, −25°, 4°)`: a Lia ergue um martelo de juiz maior que ela e bate no cadeado, que estoura. A válvula gira para verde e as moedas douradas voltam a correr. | Carimbo vermelho, pasta, martelo de juiz, cadeado (quebra em pedaços), válvula, Lia. | `denyStamp.drop` spring 0→1 em "Negaram" (≈ 8→30, damping 8) e 1→0 in 38→53; `inss.review` 1→0 10→20; `lia.climb` 0→1 inOut 25→45 (Lia sobe na válvula); `gavel.swing` 0→−90° (deg) in em "recorrer" (≈ 43→70); `padlock.break` 0→1 out 66→80; `accidentValve.closed` 1→0 75→88; `coins.accident.flow` 0→1 80→95. | ✖ **NEGADO?** (negative, 8→41) → ✔ **RECURSO OU JUSTIÇA** (positive, 43→102). Legenda: NEGARAM, RECORRER, JUSTIÇA. |
| 01:22:24 – 01:30:00 | 2484 – 2700 | Pronto: agora você sabe como funciona o auxílio-acidente. Conhece alguém assim? Manda pra essa pessoa! | Dolly-out até o **diorama completo** `orbit([0,1.4,-1.2], 48, 40°, 30°)`, com órbita lenta: depósito, INSS, cano prata e cano dourado correndo, cofrinho cheio, Marcos trabalhando. Os rótulos finais aparecem: SALÁRIO, AUXÍLIO-ACIDENTE, INSS, COFRINHO. Em "Conhece alguém", a câmera faz push-in até o ombro do Marcos, `orbit([-2.6,1.6,-1.8], 6, 20°, 8°)`: a Lia acena para a câmera e o Marcos faz joinha. Fade final. | Diorama completo, rótulos finais, Lia, Marcos. | `final.labels` 0→1 out 20→80 (+8 por rótulo); `pipeAccident.glow` 0,3→1→0,3 em "auxílio-acidente" (≈ 89→120); `piggy.level` 0,75→0,9 linear 0→120; `lia.climb` 1→0 inOut 0→30 (a Lia volta da válvula para o ombro do Marcos); `lia.wave` 0→1 linear em "Conhece" (≈ 110→200, aceno = sin); `marcos.thumb` 0→1 out 120→140; `fade` 0→1 in 198→216. | ✔ **AUXÍLIO-ACIDENTE** — _como funciona? agora você sabe_ (positive, size large, 8→120) → ❓ **MANDA PRA QUEM PRECISA** (warning, 136→180) → ℹ **CONTEÚDO INFORMATIVO** — _cada caso exige análise individual_ (info, 180→216). Legenda: PRONTO, AUXÍLIO-ACIDENTE, CONHECE, MANDA. |

Soma: 162 + 156 + 168 + 126 + 126 + 174 + 192 + 240 + 132 + 192 + 210 + 90 + 222 + 192 + 102 + 216 = **2700 frames = 90 s** ✔
(cenas contíguas, começando em 0).

## 3. Estrutura de State / Props para Remotion

Arquivo: `scene-plan.ts` (mesmo formato de `assets/template/src/data/scenes.ts`, com as **16 cenas completas**).
Na Fase 2 ele vira `src/data/scenes.ts` sem tradução. Os parâmetros de `utils/timing.ts` estão no cabeçalho do arquivo:

- `SECONDS = 90`
- `VO_KEYS = s1…s16`
- `PLANNED_SECONDS = [5.4, 5.2, 5.6, 4.2, 4.2, 5.8, 6.4, 8.0, 4.4, 6.4, 7.0, 3.0, 7.4, 6.4, 3.4, 7.2]`
- `FIRST_VO = 0.45`, `LEAD = 0.25`
- `GAPS` = 15 × 0.5 s

**Linha do tempo determinística.** Tudo é função do frame atual (`useCurrentFrame`):
- nada de timers, `Date.now`, estado incrementado em efeitos ou `Math.random`;
- partículas (moedas, estrelinhas, cacos) usam `random(seed)` do Remotion;
- dentro de cada `Sequence`, componentes usam frames locais;
- os objetos 3D leem `track("alvo.prop", frameGlobal)`: as entradas de várias cenas para o mesmo alvo formam uma trilha contínua.

**Camadas:**
- **3D real** com `@remotion/three` (`ThreeCanvas`) + React Three Fiber: ilha, prédios, canos com moedas instanciadas, personagens low-poly, câmera orbital por chaves.
- **2D por cima**: badges (topo, a partir de ~262 px), legendas palavra a palavra (~1418 px) e rótulos 2D ancorados em pontos 3D (EMPRESA, INSS, COFRINHO, SALÁRIO, CAPACIDADE, tela "135").
- **Não é 2.5D.**

**Objetos persistentes (ids estáveis):**

| Grupo | Ids |
| --- | --- |
| Cenário | `island`, `warehouse`, `inss`, `piggy` |
| Personagens | `marcos` (com `marcos.hand` detalhada para closes), `lia` |
| Canos e moedas | `salaryPipe` + `salaryValve`, `sickPipe`, `accidentPipe` + `accidentValve`, `coins` |
| Cenas 3 a 7 | `shelf`, `ladder`, `boxPile`, `bench`, `cast`, `stamp`, `hourglass`, `box`, `capacityGauge`, `calendar` |
| Cenas 10 a 16 | `road`, `moto`, `house`, `field`, `gate`, `pawns`, `bigCoin`, `timeline`, `chair`, `padlock`, `folder`, `phone`, `denyStamp`, `gavel` |
| Gancho e rótulos | `siren`, `lawBook`, `workBooklet`, `labels` |

**Planta da ilha (u3d, topo em y = 0):**

| Elemento | Posição |
| --- | --- |
| Depósito | (−2.8, 0, −4.4) |
| INSS | (2.8, 0, −4.6) |
| Cofrinho | (1.3, 0, 2.0), 2,2 de altura |
| Banquinho / lugar de casa do Marcos | (−0.9, 0, 2.2) |
| Lugar de trabalho do Marcos | (−2.6, 0, −1.8) |
| Estante + escada | (−2.6, 0, −2.3) |
| Portão | (2.8, 0, −2.3) |
| Mini-cenários | borda direita, x ≈ 4 a 4,6 |
| Cadeira de balanço | (−3.8, 0, 3.8) |

## 4. Áudio e montagem

**Narração integral (229 palavras):**

> Trabalhar e receber do INSS ao mesmo tempo? Parece golpe, né? Mas é lei. Esse é o Marcos: carteira assinada, e todo
> mês o salário cai no cofrinho. Até que a escada resolveu dançar… e o Marcos caiu de mão no chão. Mão engessada, nada de
> trabalho. O salário parou. E agora? Calma! Enquanto ele se recupera, o INSS paga o auxílio-doença. Aí vem a perícia:
> alta! O gesso sai, o auxílio acaba e o salário volta. Só que dois dedos não dobram mais. Ele tenta pegar a caixa… e a
> caixa ganha. É pra isso que existe o auxílio-acidente: uma indenização do INSS pra quem ficou com sequela que reduz a
> capacidade de trabalho. E ele continua trabalhando! Salário e auxílio caem juntos, todo mês. Ah, mas o tombo foi de
> moto, no fim de semana? Também vale: acidente de qualquer natureza. Mas nem todo mundo tem direito. Vale pra carteira
> assinada, inclusive doméstico, avulso e segurado especial, tipo pequeno produtor rural. MEI e autônomo? Ficam de fora.
> E quanto é? Em regra, metade do salário de benefício, a média das contribuições. E cai até ele se aposentar. Mas nem
> sempre o INSS libera sozinho. Junta os laudos e pede pelo telefone um três cinco. Negaram? Dá pra recorrer ou ir à
> Justiça. Pronto: agora você sabe como funciona o auxílio-acidente. Conhece alguém assim? Manda pra essa pessoa!

**Tempo estimado:**
- Com a voz Thalita a +6 %, medi ~172 palavras/min no episódio anterior do canal. Isso dá ~80 s de fala, mais 15 pausas de 0,5 s e a entrada de 0,45 s: **≈ 88,5 s**, dentro dos 90 s.
- Depois do TTS, `utils/timing.ts` deriva os cortes da duração real de cada fala.
- Se a voz real passar de 89,6 s, primeiro reduzo as pausas para 0,4 s, que é só ajuste de sincronização. Se ainda não couber, proponho um corte de texto para aprovação.

**Voz:**
- edge-tts (gratuito), `pt-BR-ThalitaMultilingualNeural`, `--rate +6%`.
- Feminina, natural e sorridente, jeito de amiga explicando, não de locutora.
- Gerada por fala (s1…s16) com tempos por palavra (`scripts/voiceover.py --provider edge`).
- Na legenda, "um três cinco" vira "135".

**Efeitos sintetizados** (todos em volume baixo):

| Efeito | Status | Onde |
| --- | --- | --- |
| `whoosh` | já existe no `sfx.py` | transições s2, s4, s8, s10, s13, s16 |
| `pop` | já existe | carteira, ampulheta, Lia, mini-cenários, pasta, celular |
| `badge` | já existe | entrada de cada badge |
| `thud` | já existe | queda s3, caixa s7 |
| `clunk` | já existe | válvulas s4/s6/s14, catraca s12 |
| `buzz` | já existe | luz vermelha s12 |
| `ding` | já existe | luz verde s11 |
| `shimmer` / `glow` | já existe | cano dourado s8 |
| `final` | já existe | s16 |
| `rewind` | **novo**, a sintetizar | fim de s1 / início de s2 |
| `coin` (tilintar) | **novo** | s2, s9, s13, s15 |
| `boing` (cômico) | **novo** | escada s3, caixa quicando s7, moto s10 |
| `siren` (2 bipes cômicos) | **novo** | s1 |
| `stamp` | **novo** | s6, s15 |
| `crack` | **novo** | gesso s6, cadeado s15 |
| `lock` | **novo** | cadeado s14 |
| `phone` (vibrar) | **novo** | s14 |
| `gavel` | **novo** | s15 |

**Trilha:** `scripts/music.py` adaptada.
- Leve e bem-humorada (marimba + baixo pizzicato + bumbo suave), ~104 BPM.
- Uma intenção por trecho:

  | Trecho | Intenção |
  | --- | --- |
  | Gancho | curioso |
  | Queda | pausa cômica |
  | Afastamento | tensão leve |
  | Revelação | crescendo com sinos |
  | Regras | groove |
  | Cadeado | suspense curto |
  | Final | resolução |

- Sidechain abaixo da voz. Mixagem final em −14 LUFS / −1,5 dBTP.

**Legendas:**
- Palavra a palavra a partir de `vo.json` depois do alinhamento.
- Blocos ≤ ~17 caracteres por linha, 66 px, peso 900, contorno escuro, centradas em ~1418 px.
- Palavras de `highlights` em cor.

## 5. Critérios de aceite e notas de verificação

**Planejamento (conferido):**
- [x] **Gancho imediato:** pergunta + imagem dos dois canos já no frame 0. A pergunta termina por volta de 2,8 s.
- [x] **Cadeia causal:** salário → acidente fecha o salário → auxílio-doença temporário → alta + sequela → auxílio-acidente → soma com salário → qualquer natureza → quem tem direito → valor e prazo → trava prática (pedido) → recurso. Cada problema nasce do passo anterior.
- [x] **Necessidade antes do nome:** a mão com sequela (s7) vem antes de "auxílio-acidente" (s8), e o salário parado (s4) vem antes de "auxílio-doença" (s5).
- [x] **Sistema persistente:** a mesma ilha com depósito, INSS, cofrinho e canos do início ao fim. As soluções instaladas permanecem visíveis.
- [x] **Conclusão:** mostra o sistema completo funcionando, com recompensa ("Pronto: agora você sabe…").
- [x] **Tabela:** 16 linhas, contíguas, somando 2700 frames.
- [x] **Duração das linhas:** todas entre 3 e 8 s.
- [x] **Coerência dos dados:** o `scene-plan.ts` tem as 16 cenas, com a mesma narração e os mesmos cortes.
- [x] **Assets:** nenhum é alegado como existente. Áudio e efeitos estão `status: "planned"`.

**A verificar na Fase 2** (não foi feito ainda):
- Leitura no celular nas folhas de contato.
- Badges × legendas sem sobreposição.
- Duração real da voz.
- `tsc`, render e medição de áudio.

**Premissas:**
- A duração de 90 s é o padrão, porque não foi informada.
- O recorte é um empregado CLT com acidente no trabalho; o acidente fora do trabalho entra como variação.
- Valores aparecem só como "em regra, 50 %". O medidor de capacidade é esquemático, sem números.

**Rigor jurídico:**

| Afirmação | Base |
| --- | --- |
| Acidente de **qualquer natureza**; sequela que reduz a capacidade para o trabalho habitual | art. 86, caput |
| **50 % do salário de benefício**, até a véspera de qualquer aposentadoria | art. 86, §1º |
| Acumula com salário, não com aposentadoria | art. 86, §3º |
| Têm direito empregado, doméstico (acidentes desde 01/06/2015), avulso e segurado especial; contribuinte individual (MEI/autônomo) e facultativo não | art. 18, §1º e página do INSS |
| Pedido pela **Central 135**, com perícia depois | página do INSS |
| A empresa paga os **15 primeiros dias** de afastamento do empregado | art. 60, §3º |
| "Auxílio-doença" hoje se chama auxílio por incapacidade temporária | indicado no badge |

**Fontes consultadas (31/10/2026):**
- [INSS: Auxílio-Acidente (gov.br)](https://www.gov.br/inss/pt-br/direitos-e-deveres/beneficios-por-incapacidade/auxilio-acidente)
- [Lei 8.213/91, art. 86 (LegJur)](https://www.legjur.com/legislacao/art/LEI_00082131991-86)
- [TRF1, acórdão transcrevendo o art. 60, §3º](https://arquivo.trf1.jus.br/AGText/2007/018900/200733000189850_2.doc)
- [Âmbito Jurídico: deveres da empresa com o acidentado](https://ambitojuridico.com.br/deveres-da-empresa-com-funcionario-acidentado-fora-do-trabalho/)

**Limitação:** o site do Planalto bloqueou o acesso automático, então o texto consolidado da lei não foi lido na fonte oficial.
Recomenda-se a revisão de um advogado inscrito na OAB antes de publicar.

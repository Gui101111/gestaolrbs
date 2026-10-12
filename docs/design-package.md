# Berry's Iced Food · Porto Seguro: pacote de design

Documento de decisões criativas do site (método da skill 10k-websites, Tier 1 com vídeo pronto).
Todo texto abaixo vai para o site exatamente como está escrito.

## 1. Premissa da marca

**"O mió."** A Berry's veio de Minas Gerais, a terra do leite (a mascote é uma vaquinha), e se apresenta
com o orgulho mineiro: "O mió Sorvete Artesanal do mundo!". O site inteiro vende uma ideia só:
cremoso de verdade, montado do seu jeito, no centro de Porto Seguro. Toda seção empurra para uma ação:
**ir até a loja** ("Como chegar"), com o WhatsApp como apoio.

**Elemento assinatura: a calda.** Bordas que derretem entre seções. As gotas escorrem conforme o
visitante rola, como sorvete derretendo. Motivo de apoio: manchas orgânicas de vaquinha e bolhas de leite
como containers.

## 2. Paleta

```css
--cyan:#28B3DF; --blue:#128EBE; --deep:#075B82;   /* identidade institucional */
--milk:#FFF9EF; --cream:#F4E5C6;                   /* artesanal, canvas */
--choco:#542B21; --choco-night:#24130D;            /* pontual; scrim da hero (tirado do vídeo) */
--straw:#E93845; --straw-soft:#FF727C;             /* perto dos produtos */
--dark:#15191C; --white:#FFFFFF;
```

Regras de contraste medidas: texto pequeno nunca em Milk sobre Berry Blue (3,5:1). Sobre azul,
texto pequeno vai em Dark (4,7:1) ou o fundo vira Deep Blue (7:1). Morango só em elementos grandes,
ícones e detalhes.

## 3. Tipografia

- Display: **Bricolage Grotesque** variável (500 a 800, largura 75 a 100). Larga e pesada nos títulos,
  condensada em 75% nos gigantes ("IMPOSSÍVEL RESISTIR").
- Texto: **Figtree** 400, 500, 600, 700.
- Rótulos: **DM Mono** 400, 500.

## 4. Hero (vídeo do cliente, autoplay em loop)

Desvio consciente da skill: a skill pede vídeo controlado pelo scroll; o cliente entregou uma animação
pronta e pediu autoplay em loop. Mantido o pedido. Da skill ficam o sistema de legibilidade (scrim +
sombra de texto + auditoria do pior quadro), o poster primeiro, a página completa sem vídeo e as regras
de movimento reduzido.

- Kicker: "Berry's • Porto Seguro"
- H1: "O mió / sorvete / do mundo."
- Nota: "*mió: o melhor, em bom mineirês"
- Sub: "Sorvete artesanal, combinações do seu jeito e uma experiência feita para quem é #LoucosPorSorvete."
- CTAs: "Quero conhecer" e "Como chegar"
- Status: "Todos os dias • 12h às 23h30" com indicador ao vivo (Aberto agora / Fechado agora)
- Pista de scroll: "Role e prove"

## 5. Seções (em ordem)

1. **Campanha** (Berry Blue): "Impossível / resistir" gigante, casquinha recortada entre as linhas.
   Etiqueta "Aviso: alto risco de vontade". Legenda "fig. 01 · três bolas, uma calda, zero chance".
   "Calda escorrendo, morango por cima e aquele cremoso que derrete devagar." /
   "Você passa na frente, olha a vitrine e entra. Acontece com todo mundo." / link "Quero o meu".
2. **Experiência self-service** (Milk): "Do seu jeito / é mais gostoso." /
   "Escolha, combine e monte uma experiência que tenha a sua cara." /
   "Aqui ninguém escolhe por você. O copo é seu, a combinação é sua e a vontade também."
   01 Escolha "Dê uma volta pelos sabores e vá no que der vontade." /
   02 Combine "Misture, cubra e capriche. A regra quem faz é você." /
   03 Aproveite "Senta, respira e deixa derreter devagar." / "Monte o seu na loja".
3. **Combinações** (Cream orgânico): "morango / + chocolate" gigante, chips Morango, Chocolate,
   Cremoso, Do seu jeito (momento interativo). "Uma combinação difícil de ignorar." /
   "Morango por cima, chocolate escorrendo e uma base cremosa segurando tudo. Ou troque tudo e invente a sua." /
   "Monte do seu jeito" / "Cremoso de Minas, servido na Bahia." /
   "*Combinação ilustrativa. Os sabores do dia você confere na loja."
4. **Storytelling com sticky**: "O que faz um / Berry's ser / um Berry's." com 01 Sorvete artesanal,
   02 Self-service, 03 #LoucosPorSorvete. Fundo muda de Cream para azul claro para morango claro.
5. **Faixa cinética**: "Berry's • Sorvete artesanal • Porto Seguro • #LoucosPorSorvete •"
6. **Sobre**: "De Minas para / Porto Seguro." + texto oficial + bloco azul "Sotaque mineiro, /
   coração baiano." com a rota MG → BA desenhada pelo scroll.
7. **Galeria viva** (Dark): "Dá pra sentir / o gosto daqui." masonry no desktop, carrossel no celular,
   lightbox.
8. **Instagram**: "#LoucosPor / Sorvete" / "Acompanhe a Berry's Porto Seguro." / "Ver Instagram".
9. **Localização**: "Seu próximo Berry's / está no centro / de Porto Seguro." endereço, horário,
   "Abrir no mapa", "WhatsApp", cartão de mapa ilustrado com a vaquinha como pino.
10. **CTA final** (Berry Blue): "Bateu / vontade?" / "Então vem viver uma experiência Berry's." /
    "Como chegar" e "Falar no WhatsApp".
11. **Rodapé** (Dark): "O mió sorvete artesanal do mundo."

## 6. Camada vetorial

Gotas de calda geradas em SVG (semente fixa), rota MG → BA que se desenha, manchas de vaquinha,
estrelinhas "+", pino pulsando no mapa. Tudo respeita `prefers-reduced-motion` (estado final, sem loops).

## 7. Engenharia

HTML, CSS e JavaScript puros, sem build. Um motor de scroll em rAF que descansa quando converge,
escrita no DOM só quando muda, IntersectionObserver para entradas e para pausar o que está fora da tela,
`body.paused` em aba oculta, `overflow-x: clip` em html e body, movimento reduzido ao vivo nos dois
sentidos, vídeo pausado fora da tela e nunca baixado com movimento reduzido ou economia de dados.

## 8. Portão de texto

Zero travessões longos e zero palavras de banco de texto genérico. Checado por grep antes da entrega.

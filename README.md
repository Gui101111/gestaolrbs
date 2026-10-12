# gestaolrbs

## Site da Berry's Iced Food · Porto Seguro

Site completo da Berry's em `berrys/`: HTML, CSS e JavaScript puros, sem build e sem dependências.
A hero usa a animação do cliente em loop; o resto do site é animado por um motor de scroll próprio
(entradas por máscara, parallax, a calda que derrete entre as seções, faixa cinética, storytelling
com sticky, galeria com lightbox e chips interativos).

As decisões de design e todo o texto do site estão em [`docs/design-package.md`](docs/design-package.md).

### Ver no computador

As fontes e o vídeo precisam de um servidor local (abrir o `index.html` direto pelo explorador de
arquivos bloqueia as fontes):

```bash
npx http-server berrys -p 8080 -c-1
# ou
python3 -m http.server 8080 -d berrys
```

Depois abra `http://localhost:8080`.

### Estrutura

```
berrys/
  index.html                  página única (SEO, Open Graph, JSON-LD de sorveteria)
  assets/css/site.css         sistema visual completo, responsivo e com movimento reduzido
  assets/js/site.js           motor de scroll, vídeo, entradas, calda, chips, galeria, lightbox
  assets/fonts/               Bricolage Grotesque, Figtree e DM Mono hospedadas no próprio site
  assets/img/                 imagens WebP (recortes do vídeo e fotos do Instagram)
  assets/video/               hero em WebM e MP4, versão horizontal e vertical
docs/design-package.md        direção criativa, paleta, tipografia e texto do site
```

### Publicar

Qualquer hospedagem de site estático serve (Hostinger, Netlify, Vercel, GitHub Pages): envie o
**conteúdo** da pasta `berrys/` (o `index.html` precisa ficar na raiz do site).

Antes de publicar, troque `https://SEU-DOMINIO/` pelo endereço final nas linhas marcadas com
`DEPLOY STEP` no `index.html` (canonical, `og:url`, `og:image` e o JSON-LD).

### Trocar ou adicionar fotos

As fotos reais vieram de recortes do print do Instagram (por volta de 400 px de largura). Fotos
originais em alta resolução deixam o site ainda mais nítido: basta substituir o arquivo em
`berrys/assets/img/` mantendo o mesmo nome (formato WebP ou JPG, cerca de 1600 px no lado maior).

| Arquivo | Onde aparece |
|---|---|
| `girl-pompom.webp` | Experiência (foto grande), galeria |
| `girl-cup.webp` | Storytelling 03, galeria, Instagram |
| `redvelvet.webp` | Experiência 01, galeria, Instagram |
| `affogato.webp` | Experiência 03, galeria, Instagram |
| `equipe.webp` | Sobre, galeria |
| `vaquinha.webp`, `vaquinha-fazenda.webp` | Instagram, mapa, Sobre |

Ainda não há foto da fachada da loja; quando houver, ela entra no cartão da seção Localização.

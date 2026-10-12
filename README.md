# Berry's Iced Food – Porto Seguro

Site institucional da Berry's (sorvete artesanal self-service) em Next.js 15, React 19, TypeScript, Tailwind CSS 4 e Framer Motion.

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Fotos

As fotos ficam em `public/images/*.webp` e são geradas a partir dos originais:

1. Coloque os arquivos originais em `assets-src/` (`1000311595.jpg` … `1000311602.jpg`).
2. Ajuste os recortes em `scripts/process-images.mjs` para remover barras do celular e interfaces do Google/Instagram.
3. Rode `npm run images`. Isso também gera `public/og-image.jpg`.

Se algum original estiver faltando, o script gera um placeholder na paleta da marca.

## Onde editar

| O quê | Arquivo |
|---|---|
| Telefone, WhatsApp, endereço, Instagram, nota e nº de avaliações | `src/data/business.ts` |
| Domínio definitivo (ativa canonical e URL no schema) | `business.siteUrl` |
| Horários e coordenadas (somente dados confirmados) | `business.openingHours`, `business.geo` |
| Textos alternativos das fotos | `src/data/images.ts` |
| Ordem e posição das fotos na galeria | `src/data/gallery.ts` |
| Cores e fontes | `src/app/globals.css` (`@theme`) |

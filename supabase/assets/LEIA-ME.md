# Assets do editor

Arquivos enviados ao bucket `editing-assets` por `npm run assets:setup`.

- `fonts/`: fontes da página Marca (Google Fonts, licença SIL Open Font License 1.1, que permite redistribuição).
  Para incluir uma fonte nova: `<Familia sem espaços>-Regular.ttf` e `-Bold.ttf`, com o mesmo nome de família usado na página Marca.
- `music/<sobria|inspiradora|neutra>/`: trilhas de fundo por tom. As que vêm no projeto são **provisórias**,
  sintetizadas do zero por `sandbox/gerar_trilhas.py` (sem direitos de terceiros). Troque por faixas licenciadas
  colocando `.m4a` ou `.mp3` nas mesmas pastas e rodando `npm run assets:setup` de novo.

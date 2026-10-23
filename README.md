# gestaolrbs

Contém o **Diogo Automates**, uma interface local para a API paga do Higgsfield
(geração de imagens e vídeos com a sua própria chave de API).

## Rodar no seu computador (localhost)

Requisitos: Node.js 22 ou superior, com npm.

```sh
cd diogo-automates
npm ci
npm run build
npm start -- --hostname 127.0.0.1 --port 3002
```

Abra http://localhost:3002 e, em **Configurações**, cadastre o ID e o segredo da sua
chave de API do Higgsfield.

No Windows, depois de `npm ci` e `npm run build`, você também pode usar `Iniciar-app.cmd`
e `Reiniciar-app.cmd`. Mais detalhes em `LEIA-ME-PT-BR.md` e `ATUALIZACOES.md`.

## Alterações em relação ao ZIP original

- Next.js atualizado de 16.3.3 para 16.4.3, corrigindo vulnerabilidades críticas
  (incluindo execução remota de código). `sharp` e `source-map-js` também foram
  atualizados via `npm audit fix`. `npm audit` não aponta vulnerabilidades.

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

## Acessar pelo celular

O app roda no seu computador; o celular só abre a página dele. O computador precisa
estar ligado com o app aberto.

### No mesmo Wi-Fi (Windows)

1. Execute `Iniciar-app-celular.cmd`.
2. Na primeira vez, crie uma senha de acesso (mínimo 6 letras ou números) e confirme o
   pedido de administrador, que libera a porta 3002 no Firewall do Windows. Se aparecer o
   aviso do Firewall sobre o Node.js, clique em **Permitir acesso**.
3. A janela mostra o endereço, por exemplo `http://192.168.0.10:3002`. Abra esse
   endereço no navegador do celular e digite a senha. O celular fica conectado por um ano.

Em macOS ou Linux, coloque `APP_PASSWORD=suasenha` em `diogo-automates/.env.local` e
inicie com `npm start -- --hostname 0.0.0.0 --port 3002`. Descubra o IP do computador
nas configurações de rede.

Se o celular não abrir a página: confira se os dois aparelhos estão no mesmo Wi-Fi (redes
de convidados costumam isolar os aparelhos) e se o Firewall do Windows permite o Node.js.

### Fora de casa (4G ou outra rede)

Use o [Tailscale](https://tailscale.com), gratuito para uso pessoal: crie uma rede
privada entre o computador e o celular, sem expor o app na internet.

1. Instale o Tailscale no computador e no celular e entre com a mesma conta nos dois.
2. Inicie o app normalmente (`Iniciar-app.cmd`).
3. No computador, execute `tailscale serve --bg 3002`. O comando mostra um endereço
   `https://<nome-do-computador>.<sua-rede>.ts.net`.
4. Abra esse endereço no celular, com o Tailscale ligado.

## Alterações em relação ao ZIP original

- Next.js atualizado de 16.3.3 para 16.4.3, corrigindo vulnerabilidades críticas
  (incluindo execução remota de código). `sharp` e `source-map-js` também foram
  atualizados via `npm audit fix`. `npm audit` não aponta vulnerabilidades.
- Acesso pelo celular: `Iniciar-app-celular.cmd`, senha de acesso opcional
  (`APP_PASSWORD`) e reprodução de vídeos no iPhone. O Safari exige respostas
  parciais (byte ranges), que a rota de mídia não suportava.

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

## Abrir no celular sem depender do computador (nuvem)

O app fica hospedado no [Render](https://render.com) e ganha um endereço fixo
`https://....onrender.com`, que abre em qualquer celular, a qualquer hora. Dá para fazer
tudo pelo próprio celular:

1. Abra este link:
   **https://render.com/deploy?repo=https://github.com/Gui101111/gestaolrbs/tree/ccr-e5e77e39-p8tww0**
2. Crie uma conta no Render ou entre com GitHub ou Google.
3. O formulário pede três valores:
   - `APP_PASSWORD`: a senha que você vai digitar para abrir o app (mínimo 8 letras ou números);
   - `HF_API_KEY_ID` e `HF_API_KEY_SECRET`: as duas partes da sua chave de API do Higgsfield.
4. Confirme (**Deploy Blueprint**) e aguarde a compilação, que leva alguns minutos.
5. Abra o endereço `https://diogo-automates-....onrender.com` que aparece no painel e
   digite a senha. No navegador do celular, use "Adicionar à tela inicial" para abrir como app.

O plano gratuito tem limites:

- O app "dorme" após 15 minutos sem uso. O primeiro acesso depois disso demora cerca de
  um minuto.
- Ao dormir ou reiniciar, a biblioteca local é apagada. Baixe no celular os resultados que
  quiser guardar e mantenha a página aberta até a geração terminar, para não perder um
  resultado já cobrado.

Para manter tudo salvo e sem pausas, no painel do serviço mude o plano para **Starter**
(US$ 7/mês), adicione um **Disk** com mount path `/var/data` e crie a variável
`STORAGE_DIR` com o valor `/var/data`.

Sem a senha, o app hospedado não abre: em vez dele, aparece um aviso pedindo a variável
`APP_PASSWORD`, porque qualquer pessoa poderia gastar o seu saldo do Higgsfield.

## Acessar pelo celular com o app no seu computador

Nestas opções o app roda no seu computador e o celular só abre a página dele. O computador
precisa estar ligado com o app aberto.

### No mesmo Wi-Fi (Windows)

1. Execute `Iniciar-app-celular.cmd`.
2. Na primeira vez, crie uma senha de acesso (mínimo 8 letras ou números) e confirme o
   pedido de administrador, que libera a porta 3002 no Firewall do Windows. Se aparecer o
   aviso do Firewall sobre o Node.js, clique em **Permitir acesso**.
3. A janela mostra o endereço, por exemplo `http://192.168.0.10:3002`. Abra esse
   endereço no navegador do celular e digite a senha. O celular fica conectado por um ano.

Em macOS ou Linux, coloque `APP_PASSWORD=suasenha` em `diogo-automates/.env.local` e
inicie com `npm start -- --hostname 0.0.0.0 --port 3002`. Descubra o IP do computador
nas configurações de rede.

Se o celular não abrir a página: confira se os dois aparelhos estão no mesmo Wi-Fi (redes
de convidados costumam isolar os aparelhos) e se o Firewall do Windows permite o Node.js.

### Link para abrir de qualquer lugar (Windows)

1. Execute `Gerar-link-celular.cmd`. Na primeira vez ele pede a senha de acesso, se ainda
   não houver uma, e baixa o `cloudflared`, programa oficial da Cloudflare.
2. Em alguns segundos ele mostra um link `https://....trycloudflare.com`, já copiado
   para a área de transferência, e abre no navegador uma página com o QR code do link.
3. Aponte a câmera do celular para o QR code, toque no link e digite a senha. Funciona
   no Wi-Fi ou no 4G.

O link funciona enquanto a janela do atalho estiver aberta, e cada execução gera um link
novo. Qualquer pessoa com o link chega à tela de senha, por isso use uma senha forte.

### Fora de casa com endereço fixo e privado

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
- `Gerar-link-celular.cmd`: link público via Cloudflare, copiado automaticamente e
  exibido em QR code. Tentativas de senha erradas ficam limitadas a uma por segundo.
- Hospedagem no Render (`render.yaml`): pasta de dados configurável por `STORAGE_DIR`,
  senha obrigatória no servidor público e mídia marcada como `private` para nenhum cache
  intermediário guardar cópias.

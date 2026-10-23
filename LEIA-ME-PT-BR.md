# Diogo Automates — versão personalizada

Este pacote contém o código completo atualizado, com:

- Interface em português do Brasil, incluindo menus, mensagens, dicas e opções de geração.
- Estimativas em reais nos gastos de hoje, do mês e no total acumulado.
- Equivalente em reais do limite de gastos nas configurações.
- Cotação automática USD/BRL via Frankfurter, com data, fonte e uso da última cotação salva quando a consulta falha.
- Ícone DA no aplicativo e na aba do navegador, mantendo o degradê azul e rosa.
- Atalhos para iniciar e reiniciar o servidor no Windows.

## Instalação

1. Instale o Node.js 22 ou superior (recomendado: Node.js 24 LTS), com npm.
2. Extraia todo este ZIP para uma pasta. Mantenha os atalhos ao lado da pasta diogo-automates.
3. Abra um terminal dentro da pasta diogo-automates e execute:

```sh
npm ci
npm run build
npm start -- --hostname 127.0.0.1 --port 3002
```

4. Abra http://localhost:3002.
5. Em Configurações, cadastre o ID e o segredo da sua chave de API do Higgsfield.

A primeira instalação e a compilação precisam de internet para baixar dependências e fontes.

Depois da instalação e da compilação, você também pode usar Iniciar-app.cmd no Windows.
Se o servidor já estiver aberto e você tiver recompilado o projeto, use Reiniciar-app.cmd.
O atalho de reinício verifica se o processo na porta 3002 pertence a esta cópia do app antes de encerrá-lo.
Após uma atualização, recarregue a página com Ctrl+F5. O ícone da aba pode permanecer no cache do navegador.

## Acesso pelo celular

Com o celular no mesmo Wi-Fi do computador, execute Iniciar-app-celular.cmd no Windows.
Na primeira vez ele pede uma senha de acesso e a permissão de administrador para liberar
a porta 3002 no firewall. Depois mostra o endereço para abrir no celular, como
http://192.168.0.10:3002. Se o Windows perguntar se o Node.js pode acessar a rede, clique em Permitir.
Consulte README.md para mais opções, incluindo o acesso fora de casa.

## Valores em reais

Os valores em reais são estimativas dos custos registrados em dólar, convertidos pela cotação exibida.
O app verifica a cotação periodicamente e mantém a última cotação válida salva localmente.
Essa conversão não representa o câmbio histórico de cada geração nem inclui impostos ou taxas do cartão.
A cobrança do Higgsfield e o limite de gastos continuam em dólar. Gerações sem preço estimado definido
continuam fora dos totais de gastos, conforme o funcionamento original do app.

Fonte da cotação: https://frankfurter.dev/

## Conteúdo do pacote

Como no ZIP original, este pacote contém os fontes, não uma instalação pronta.
Não inclui node_modules, as compilações .next e .next-local-v2, logs, banco de dados, arquivos gerados ou credenciais.
O arquivo .env.example é apenas um modelo vazio; as chaves podem ser cadastradas pela interface.
Se quiser transferir suas gerações e configurações de uma instalação existente, faça separadamente
um backup privado da pasta storage, com o app parado. Essa pasta pode conter suas chaves de API.

As gerações usam a API paga do Higgsfield. A interface local não elimina os custos da API.

## Correções desta atualização

Consulte ATUALIZACOES.md. Após instalar e compilar, execute Reiniciar-app.cmd diretamente no Windows e atualize o navegador com Ctrl+F5.

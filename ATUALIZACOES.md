# Atualização: conexão e recuperação de resultados

- Consultas ao Higgsfield têm limite de espera e não usam respostas em cache.
- Erros de conexão são exibidos; a mesma geração continua sendo acompanhada.
- Falhas no download são repetidas automaticamente, sem criar outra geração.
- Arquivos já baixados são preservados durante as novas tentativas.
- Resultados concluídos podem ser recuperados mesmo após uma espera longa.
- Erros antigos são removidos após uma consulta bem-sucedida.
- Saldo insuficiente é identificado corretamente na interface.
- O iniciador verifica a conexão sem enviar sua chave e confirma a versão iniciada.
- O reiniciador identifica esta instalação e encerra suas instâncias antigas.
- Compilação separada em .next-local-v2 para preservar a versão anterior durante atualizações.

## Instalação e uso

Consulte LEIA-ME-PT-BR.md. Este ZIP contém o código-fonte atualizado e os atalhos.
É necessário instalar as dependências e compilar antes de usar os atalhos.
Execute os atalhos diretamente no Windows para que o servidor use sua conexão normal.
O endereço continua sendo http://localhost:3002.

Não contém chaves de API, banco de dados, logs, vídeos, node_modules ou compilação.
A geração depende de saldo pago na API do Higgsfield.

## Verificação realizada

Compilação de produção aprovada, cinco testes de recuperação aprovados e consulta
com download de uma geração já existente bem-sucedida. Nenhuma nova geração foi
criada para esses testes. Testes locais: node scripts/test-worker.cjs.

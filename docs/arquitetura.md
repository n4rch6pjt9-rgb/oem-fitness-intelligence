# Arquitetura e estado do piloto

## Catálogo e coleta

`server.mjs` recebe requisições do operador e delega ao crawler e aos extratores em `src/`. A loja Made-in-China fornece fábrica, linhas e listagens; páginas de produto alimentam a extração detalhada. O banco mantém registros de origem e relacionamentos. Fila e paginação precisam de conferência pela interface; o catálogo completo ainda não foi validado.

A rota operacional `/catalogo.html` usa `src/catalog-api.mjs` e `ui/catalog.tsx`: lista fábricas, consulta linhas, filtra no banco antes da paginação e abre o detalhe. Falhas de autenticação, erro e ausência de registros são explícitas; não há fallback para dados demonstrativos. Consolidação de máquinas/configurações, revisão/publicação e seleção persistente continuam pendentes.

A ficha HS01 utiliza `public/examples/brtw-hs01.json`. O build gera os assets React em `public/assets/`, ignorados pelo Git. Exemplos não substituem dados operacionais nem confirmam persistência remota.

## Clientes

`src/client-api.mjs` implementa consultas CNPJ/NCM e cadastro de clientes. O servidor verifica a sessão e filtra o proprietário em cada operação. Arquivamento não apaga o cliente. O modelo por organização, participantes da trading e compartilhamento entre operadores continua proposto.

## Autenticação e Siscomex

A sessão do operador é validada pelo Supabase Auth. Cookies identificam sessões mantidas no servidor; credenciais Supabase não são necessárias ao navegador para acessar as rotas privadas.

`src/siscomex.mjs` usa A1 com TLS e validação de certificado, mantendo conexão e tokens vinculados ao operador, sessão e empresa configurada. As rotas de status, conexão, consulta e desconexão são somente leitura. Transporte simulado cobre isolamento e renovação de tokens. Conexão real segue pendente após falha local ao desbloquear o PFX.

## Aceite

A aprovação funcional depende de teste pela UI: autenticar, consultar e salvar cliente, recarregar, escolher fábrica/linha, selecionar máquinas, revisar configuração, iniciar coleta manual, acompanhar falhas e conferir persistência. Simulações e habilitações demonstrativas não devem ser apresentadas como cálculos ou consultas oficiais concluídos.

Certificado, arquivo de ambiente, evidências locais e planilhas de custos não são versionados. A migration aditiva do catálogo foi aplicada em 02/10/2026, versão UTC 20261003003201, com RLS e acesso direto anon/authenticated revogado. Contagens iniciais confirmadas: zero fábricas, linhas e itens. Nenhuma transmissão ao Siscomex foi feita nesta etapa.

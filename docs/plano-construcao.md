# Plano de construção e dependências

Levantamento de 02/10/2026. Board: [OEM — Tasks](https://github.com/users/n4rch6pjt9-rgb/projects/2).

Este documento distingue código existente, contratos propostos e aceite funcional. A auditoria combinou código local e metadados do banco conectado. Antes da preparação, só existia o cadastro de clientes. A migration aditiva do catálogo foi aplicada em 02/10/2026 (versão UTC 20261003003201): seis tabelas criadas, RLS habilitada, sem acesso direto anon/authenticated. O banco agora contém zero fábricas, linhas e itens; ainda não houve coleta ou aceite autenticado pela UI. Certificado e consultas externas não foram validados nesta etapa. Os documentos normativos são pesquisa anterior; parâmetros fiscais e comerciais precisam de verificação específica antes da homologação.

## Estado da construção

| Área | Existe no código auditado | Ainda falta |
|---|---|---|
| Coleta | Fábricas, linhas, registros de origem, fila, retentativas e leitura de páginas | Validar descoberta e paginação em múltiplas lojas; coletar e atualizar catálogo completo pelo fluxo manual |
| Catálogo | API paginada por fábrica/linha e nova rota React /catalogo.html implementadas nesta branch; HS01 permanece exemplo separado | Aceite da nova navegação com dados reais, máquinas normalizadas, configurações, revisão e publicação |
| Clientes | Consulta CNPJ/NCM e CRUD autenticado com arquivamento e filtro por proprietário | Aceite completo pela UI; organização, equipe, participantes, habilitação e histórico |
| Segurança | Supabase Auth, allowlist de operadores, cookie HttpOnly/SameSite e sessão em memória; acesso de banco mediado pelo servidor | Papéis e fronteiras da organização; auditabilidade e sessões adequadas ao deployment |
| Siscomex | Conector A1 somente leitura, token/CSRF no servidor e isolamento por sessão/operador/empresa configurada | Resolver falha ao desbloquear PFX e aceitar conexão/consulta reais pela UI |
| Logística | Escopo descrito e destino inicial Navegantes | Origem por fábrica, embalagem por volume, cotação de frete, restrições e estufagem |
| Custos | Proposta de rubricas e maquete de parametrização | Auditoria da planilha privada, motor de cálculo, versões e aceite por interface |

O ponto de partida é um piloto, não um catálogo operacional completo. “Hoje” significa iniciar a primeira etapa de catálogo real e tornar seu progresso revisável, sem prometer maturidade integral no mesmo dia.

## Evidências e referências de código

- `supabase/migrations/20261003003201_oem_catalog_pilot.sql`: entidades de fábrica, linha, anúncio, fila e relacionamentos. Não define máquina normalizada, configuração, cesta ou simulação. Aplicada no projeto conectado nesta etapa; o nome local foi alinhado à versão registrada no histórico remoto.
- `server.mjs`: autenticação e sessão; rotas de fábrica/anúncio/fila. No estado auditado, o catálogo é acessível aos operadores autorizados e não tem uma fronteira por organização implementada.
- `src/client-api.mjs`: CRUD filtra `owner_id`, arquiva sem apagar, limita listagem a 200 e valida CNPJ por formato/comprimento; organização e validação de dígitos verificadores ainda não estão implementadas.
- `supabase/migrations/20261002212307_oem_clients.sql`: cliente por proprietário e CNPJ ativo único nesse escopo; RLS habilitada e acesso direto de anon/authenticated revogado.
- `src/operator-setup.mjs`: bootstrap local do primeiro operador; procedimento distinto do cadastro normal de equipe.
- `src/siscomex.mjs`: certificado, conexão TLS, tokens e consultas somente leitura. A configuração atual é de uma empresa e operador; não representa gestão de conexões para todas as empresas clientes.
- `public/examples/brtw-hs01.json` e `docs/arquitetura.md`: ficha de exemplo e limitações de aceite.
- `docs/navegacao-radares-clientes.md`: contrato proposto de navegação, seleção, operação e habilitação. Entidades propostas não equivalem a tabelas criadas.
- `docs/metodologia-trading-fontes.md`: pesquisa anterior para modalidades e rubricas; não é motor fiscal homologado.

## Áreas especializadas e atuação dos agentes

Foram criados seis agentes especializados: Catálogo/Coleta; Frontend/UX; Dados/Integrações; Integrações Comex; Logística/Custos; Qualidade. Trabalharam em etapas, respeitando quatro agentes simultâneos incluindo o orquestrador. Concluíram o levantamento e a primeira implementação/revisão do catálogo. Não são agentes permanentes de execução automática.

| Competência | Responsabilidade |
|---|---|
| Catálogo e coleta | Descoberta de lojas/linhas, paginação, extração, atualização e cobertura |
| Dados e segurança | Contrato de máquina/configuração, migrations, organização, papéis e autorização |
| Frontend e experiência | Navegação React/Tailwind/shadcn, português, filtros, badges e seleção |
| Integrações e Comex | CNPJ/NCM, clientes, habilitação e Siscomex somente leitura |
| Logística e custos | Origem, frete, embalagem, estufagem, fórmulas e versões de simulação |
| Qualidade e aceite | Testes pela UI, recarga, isolamento, falhas reais e evidências de conclusão |

## Sequência e dependências

IDs são referências estáveis do plano; os números de issues e campos de status do board são mantidos no GitHub. “Pronta para iniciar” não significa implementada. “Em implementação” não significa aceite concluído.

| ID | Entrega | Estado no início da etapa | Depende de | Aceite resumido |
|---|---|---|---|---|
| [CAT-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/2) | Verificar ambiente, banco e cobertura atual | Schema preparado; cobertura vazia confirmada | — | Conferir migrations/schema, quantidade real de fábricas/linhas/itens e falhas; distinguir ausência de dados de erro de acesso |
| [CAT-02](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/3) | API de linhas e filtros | Código implementado; revisão e aceite pendentes | — | Listar linhas da fábrica e filtrar resultados sem misturar fábricas; manter paginação e contratos verificáveis |
| [CAT-03](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/4) | Catálogo React com dados reais | Código implementado; revisão e aceite pendentes | CAT-02; aceite depende de CAT-01 | Escolher fábrica/linha pela UI, listar e abrir dados reais; estados vazio/erro claros; exemplo não substitui resultado |
| [CAT-04](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/5) | Descoberta e paginação em múltiplas lojas | Pendente | [CAT-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/2) | Conferir padrões por loja, todas as páginas e vínculos das linhas; não assumir que a estrutura é universal |
| [CAT-05](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/6) | Coleta manual e atualização | Pendente | [CAT-04](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/5) | Inserir URL, revisar alcance, iniciar/pausar/retomar e acompanhar falhas pela UI |
| [CAT-06](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/7) | Extração completa da máquina | Pendente | [CAT-04](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/5) | Dados principais, comerciais, fornecedor e fotos distintas; origem interna por campo; ausências e variações preservadas |
| [DATA-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/8) | Contrato de máquina/configuração, trading, organização e papéis | Pronta para análise | — | Definir identidade, configurações e autorização; separar evidência de origem do catálogo próprio |
| [CAT-07](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/9) | Schema e consolidação de máquina/configuração | Pendente | CAT-01, CAT-06, DATA-01 | Migration aditiva e consolidação revisável; não unir apenas por título/modelo nem perder origem |
| [CAT-08](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/10) | Classes e variantes contextualizadas | Pendente | CAT-07, CAT-06 | Separar classe declarada, aplicação classificada e configuração; não atribuir diferenças de medidas a classes sem evidência |
| [CAT-09](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/11) | Revisão e publicação | Pendente | CAT-03, CAT-05, CAT-07, CAT-08 | Revisar candidatos e publicar catálogo próprio com histórico; informação ausente não vira valor inventado |
| [CLI-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/12) | Aceite de cadastro e consultas atuais | Pronta para iniciar | — | Consultar, salvar, editar, arquivar e recarregar pela UI; preservar preenchimento manual em indisponibilidade |
| [SEL-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/13) | Seleção persistente por cliente/operação | Pendente | CLI-01, CAT-03, CAT-07, DATA-01 | Quantidade/configuração preservadas entre filtros/páginas e recarga, sem duplicação nem troca silenciosa de cliente |
| [CAT-10](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/14) | Aceite de catálogo com múltiplas fábricas | Pendente | CAT-09, SEL-01 | Percorrer coleta, catálogo e seleção pela UI com cobertura conferida e falhas explícitas |
| [CLI-02](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/15) | Organização, participantes, habilitação e histórico | Pendente | DATA-01, CLI-01 | Papéis e vínculos reais; Radar/habilitação separados de planos SaaS; saldo desconhecido sem histórico suficiente |
| [LOG-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/16) | Origens e embalagens por volume | Pendente | CAT-06, CAT-07 | Separar endereço da fábrica, coleta e porto de embarque; porto confirmado ou pendente; volumes, dimensões, peso bruto e restrições por configuração |
| [FRE-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/17) | Cotação manual e integração de frete para Navegantes | Pendente | [LOG-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/16) | Registrar cotação, validade, moeda, equipamento, inclusões e adicionais; fluxo manual antes de escolher API; pesquisa de API em paralelo, com cobertura, licença, Incoterm e adicionais verificados |
| [LOG-02](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/18) | Estufagem com restrições | Pendente | LOG-01, SEL-01, FRE-01 | Simular volumes/peso e restrições explícitas; resultado parcial se faltarem dados; embalagem distinta da máquina; portas, capacidade de peso e orientações permitidas do contêiner |
| [COST-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/19) | Mapear planilha e fórmulas privadas | Pronta para iniciar auditoria local | LOG-01 e CLI-02 para homologação, não para iniciar auditoria | Mapear entradas, bases, rateios, arredondamentos e resultados; planilha e valores privados ficam locais |
| [SIM-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/20) | Formulário e motor versionado | Pendente | SEL-01, CLI-02, FRE-01, COST-01 | Preservar premissas/cotações por versão e pendências; evitar dupla cobrança e totais fictícios; fase com estufagem também depende de LOG-02, admitindo quantidade manual de contêineres na fase inicial |
| [SIS-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/21) | Resolver A1 e aceitar consultas somente leitura | Pendente: falha PFX registrada | Independente do catálogo | Conectar e consultar pela UI com evidência real; sem transmissão de produtos/declarações |
| [QA-02](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/22) | Aceite cliente → catálogo → custos | Pendente | CAT-10, CLI-02, LOG-02, SIM-01 | Fluxo integrado pela UI, recarga, isolamento e falhas; não declarar aceite com mutações nos bastidores |
| [OPS-01](https://github.com/n4rch6pjt9-rgb/oem-fitness-intelligence/issues/23) | CI, deployment Node e sessões | Pronta para análise em paralelo | QA-02 antes do deployment de produto completo | Definir operação, sessão, configuração e recuperação; checks não substituem aceite funcional |

## Regras que preservam o escopo

1. Siscomex/A1 não bloqueia a construção do catálogo próprio. Consulta aduaneira e simulação comercial são capacidades distintas.
2. Cotação manual versionada deve funcionar antes da API de frete. Não afirmar disponibilidade, cobertura ou preço de API sem avaliação real.
3. Navegantes é o porto de destino inicial; endereço fiscal, desembaraço e entrega são campos distintos. Porto não determina sozinho tratamento fiscal.
4. Estufagem usa embalagem, peso bruto e restrições disponíveis. Não substituir dimensão da embalagem pela dimensão do equipamento.
5. Dados extraídos alimentam catálogo próprio em português; evidências de origem ficam internas. Ausência, declaração do fornecedor e verificação independente são estados distintos.
6. Medidas diferentes ficam contextualizadas, mas não comprovam automaticamente Comercial leve ou Comercial. Classe de uso não é atributo do cliente nem modalidade de habilitação.
7. Máquina em várias linhas não deve duplicar a seleção. Configuração e quantidade pertencem ao item escolhido.
8. Motor de custos exige auditoria das fórmulas e verificação dos parâmetros aplicáveis. Não publicar planilhas, valores privados, certificado ou credenciais no repositório.
9. Cada entrega passa por branch, revisão e PR. Aprovação de código não equivale a comprovação operacional do banco, coleta ou integração.

## Primeiro marco de entrega

Concluir CAT-01, CAT-02 e CAT-03 como primeiro marco verificável: ambiente conhecido e catálogo navegável com dados reais. Em paralelo, analisar DATA-01 e preparar descoberta/extração. O catálogo definitivo só terá aceite após consolidação, revisão, seleção persistente e CAT-10; não chamar uma listagem de anúncios de catálogo concluído.

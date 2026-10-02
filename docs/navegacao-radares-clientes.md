# Navegação, clientes e radares

Proposta de 2 de outubro de 2026. O modelo visual navegável está em `public/modelo-navegacao.html`. O percurso de catálogo, habilitação e simulação é demonstrativo. O cadastro de clientes e as consultas externas receberam integrações posteriores; consulte arquitetura.md. Isso não confirma o aceite integral pela UI. Evoluir a interface React/Tailwind/shadcn existente na implementação, sem substituir a infraestrutura.

## Habilitação e modalidade da operação

Radar próprio refere-se à habilitação do cliente no Siscomex; Radar da trading refere-se à habilitação da importadora. Não são nomes de catálogo ou planos SaaS. Expressa, Limitada (50 mil ou 150 mil USD) e Ilimitada são modalidades de habilitação. Manter cadastro, situação, data de consulta e documentos de cada interveniente separadamente. Limite disponível depende de histórico; não calcular saldo apenas pelo teto cadastrado.

Modalidade da operação: Importação direta, Por conta e ordem, Por encomenda ou Compra nacional de estoque. A escolha não pode ser derivada somente de quem possui Radar. Consultar a pesquisa em metodologia-trading-fontes.md.

Comercial leve e Comercial são classes de uso; classe declarada, aplicação classificada e configuração física permanecem separadas.

## Estrutura da navegação

Menu: Visão geral → Clientes → Catálogo → Coleta manual → Simulações → Configurações.

Dentro de Clientes: Cadastro → Habilitação → Seleções → Simulações → Histórico.

Contexto sempre visível: organização, cliente selecionado e operação atual. Trocar cliente exige salvar ou descartar explicitamente uma seleção ainda não salva; não transportar silenciosamente itens de outro cliente.

Fluxo principal: Cliente → Operação → Fábrica → Linha → Máquinas → Configuração → Compra e logística → Revisão → Salvar simulação.

## Telas e componentes

| Tela | Componentes e ações |
|---|---|
| Clientes | Busca, cadastro, identificação empresarial ou pessoal, contatos, endereços, responsável, acesso e histórico |
| Catálogo | Catálogo compartilhado e seleção do cliente; busca; filtros de classe, aplicação, disponibilidade e fábrica; indicação de habilitação |
| Seleção | Dropdown de fábrica; dropdown dependente de linha; caixas de seleção por máquina; selecionar todos os resultados filtrados com escopo explícito |
| Máquina | Duas fotos quando disponíveis; modelo; badges com ícones; classe declarada; aplicação; variantes de configuração; dados comerciais e embalagem |
| Cesta | Itens selecionados, configuração por item, quantidade, preço aplicável e pendências; preservação entre páginas |
| Coleta manual | URL da loja; prévia da fábrica e linhas descobertas; seleção de linhas; confirmação do alcance; iniciar; progresso; falhas; revisão antes de publicar |
| Simulação | Compra, cotação, despesas, fiscal, remuneração e resultado parcial ou completo |
| Configurações | Vocabulário, perfis de acesso, parâmetros operacionais, habilitação e vigências |

Não concatenar rótulo em texto e badge repetindo a mesma informação. Usar badge com ícone como referência principal, com valor ou explicação contextual quando necessário. Português e inicial maiúscula em todos os rótulos; preservar nomes de modelos e marcas.

## Regras da seleção

- Linha pertence à fábrica; mudar fábrica limpa o filtro de linha, não apaga silenciosamente a cesta.
- Caixa de seleção identifica máquina/configuração, não anúncio. Uma máquina em várias linhas não deve duplicar o item na cesta.
- Filtro Comercial leve/Comercial controla resultados; não altera a classificação armazenada.
- Exibir Não declarado quando não houver classe explícita. Classificação da aplicação não equivale a declaração do fabricante.
- Variações de tubos, carga e dimensões ficam em configurações/contextos separados. Não deduzir que correspondam às duas classes.
- Quantidade é por configuração selecionada; alteração recalcula condições comerciais apenas se houver regra explícita.
- Sem itens, Revisar seleção permanece indisponível; dados logísticos ausentes permitem revisão parcial, sem fabricar total.

## Banco de dados proposto

O arquivo local de migration do piloto define `oem_factories`, `oem_lines`, `oem_ads`, `oem_ad_lines`, `oem_pages` e `oem_page_lines`. Aplicação no banco remoto não confirmada. Não há cadastro de clientes ou radares nessa migration. As entidades abaixo são propostas, não tabelas verificadas.

| Entidade | Relações e responsabilidade |
|---|---|
| Organização | Trading responsável e fronteira de isolamento |
| Usuário e participação | Usuário autenticado, organização, papel e permissões |
| Cliente | Vinculado à organização; nome, identificação, contatos, endereços e situação |
| Acesso do cliente | Vincula usuário ao cliente; cliente comercial não é automaticamente conta de login |
| Habilitação | Empresa, modalidade, situação, teto informado, data de consulta, documento e histórico de operações |
| Participantes da operação | Cliente adquirente/encomendante, importadora, contrato e vinculação |
| Seleção do cliente | Referência à máquina/configuração, inclusão, responsável e situação |
| Máquina normalizada | Vinculada à fábrica, identidade revisada; não unir apenas por nome ou modelo |
| Configuração | Variações explícitas, classe declarada quando houver, medidas e embalagem |
| Máquina por linha | Relação muitos-para-muitos; preservar categorias e séries distintas |
| Registro de coleta | Preservar `oem_ads` como evidência interna de extração; não expor anúncios como identidade do catálogo |
| Seleção e itens | Cliente, operação, máquinas, configurações e quantidades; rascunho independente da simulação |
| Simulação e versão | Cesta, premissas, cotações, despesas, parâmetros, resultados e pendências imutáveis por versão |

Definir migrations após verificar schema remoto e aprovar o cadastro dos intervenientes. Reutilizar entidades existentes onde compatíveis. Segurança por organização e cliente também no servidor/banco; esconder um botão não autoriza nem protege dados. Não abrir acesso às tabelas de coleta apenas para viabilizar a interface.

## Teste obrigatório pela interface

Roteiro de aceite do produto real:

1. Criar cliente pela tela e recarregar; conferir persistência e associação à organização.
2. Conferir habilitação do cliente, habilitação da trading, modalidade da operação e isolamento de outro cliente.
3. Escolher fábrica e linha pelos dropdowns; verificar resultados correspondentes.
4. Filtrar Comercial leve, Comercial e Não declarado; confirmar que não há reclassificação automática.
5. Selecionar máquinas por checkbox, mudar página e conferir cesta preservada sem duplicatas.
6. Escolher configuração e quantidade; confirmar que fotos, embalagem e condições pertencem ao item selecionado.
7. Revisar pendências e seguir para simulação Navegantes pela interface.
8. Salvar, recarregar e recuperar a mesma versão; alterar criando nova versão.
9. Inserir nova URL de fábrica pela Coleta manual; revisar linhas descobertas, iniciar e acompanhar pela tela. Em falha, exibir erro real, sem dados substitutos.
10. Testar pendência de habilitação e histórico de limite, além das permissões de acesso com perfis reais.

A maquete permite testar a sequência de navegação e seleção. Não valida persistência, permissões, crawler ou cálculo fiscal. O teste end-to-end só poderá ser declarado concluído após execução desse roteiro na interface integrada.

## Campos do cadastro e vínculos propostos

O desenho abaixo é um contrato de dados para implementação futura, não schema já criado.

| Cadastro | Campos principais | Vínculos |
|---|---|---|
| Cliente | Identificador, organização, razão social/nome, tipo de pessoa, identificação, contatos, endereço fiscal, endereço de entrega e situação | Organização e operações |
| Empresa importadora | Identificador, organização, identificação, nome, endereços e responsável | Operações e habilitações |
| Habilitação | Empresa, modalidade, faixa quando limitada, situação, data de consulta, documento de referência e responsável pela conferência | Empresa; versões históricas preservadas |
| Histórico de operações | Empresa, papel, modalidade, data, valor relevante para limite, moeda e referência documental | Habilitação; estimativa de saldo somente com histórico suficiente |
| Operação | Cliente, importadora quando aplicável, modalidade, contrato, vinculação, situação e destino | Seleções, simulações e documentos |
| Fábrica e linha | Identificadores existentes, nome, domínio e pertencimento | Reutilizar cadastros do piloto onde compatíveis |
| Máquina e configuração | Fábrica, identidade, modelo, aplicações, classe declarada, atributos e embalagem por volume | Linhas, registros de coleta e itens da seleção |
| Seleção | Operação, responsável, situação e data | Itens com configuração e quantidade |
| Cobrança | Rubrica, prestador, valor/moeda ou percentual/base, inclusões, validade e vencimento | Operação e versão da simulação |
| Versão de simulação | Referências e cópia das premissas efetivamente usadas, pendências, resultados e data | Operação e seleção |

Classe de uso da máquina não deve ser campo do cliente. Habilitação não deve ser campo da fábrica chinesa. Porto de destino não substitui endereço fiscal. Proibir duplicação de cliente dentro da organização por identificação validada, preservando contatos e endereços múltiplos.

## Teste executado na maquete

Percurso pela UI: cliente demonstrativo → habilitação Limitada 150 mil → catálogo → HS01 selecionado → filtro Comercial leve → segundo item selecionado → Por conta e ordem → trading Ilimitada → remuneração percentual com base Mercadoria → FOB/local nomeado → revisão → quantidade HS01 igual a quatro → configuração demonstrativa → Conferir percurso.

Resultado: parâmetros visíveis no resumo, dois itens preservados entre filtros e quantidade/configuração editáveis. Cinco por cento foi entrada fictícia de teste, não preço de mercado. Evidência em `evidence/modelo-ui-revisao.png`. Verificação de sintaxe do script passou. Sem conexão com banco, coleta ou cálculo fiscal; recarregar limpa os dados demonstrativos.


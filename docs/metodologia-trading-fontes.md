# Trading, habilitação e estrutura de cobrança

Pesquisa de 2 de outubro de 2026 para orientar o modelo de UI. Regras oficiais foram consultadas na web; documentos do Scribd foram lidos como referências operacionais. A situação real de habilitação de cliente ou trading não foi consultada.

## Correção de vocabulário

Radar próprio é a habilitação do cliente no Siscomex. Radar da trading é a habilitação da importadora contratada. Os termos não designam catálogo privado nem plano SaaS.

Expressa é uma modalidade específica, destinada, segundo a Receita, a sociedades anônimas de capital aberto e subsidiárias integrais, empresas públicas e sociedades de economia mista. Não é um percurso rápido da interface nem o nome atual de uma faixa de US$ 50 mil. Fonte: [Modalidade Expressa](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/habilitacao/Pessoa-Juridica/Submodalidade-Expressa/modalidade-expressa-orientacoes-validas-a-partir-do-dia-01-12-2020-inicio-da-vigencia-da-in-rfb-no1984-2020).

Limitada possui faixas de US$ 50 mil e US$ 150 mil em períodos consecutivos de seis meses. Ilimitada não tem esse teto operacional, mas a capacidade financeira permanece relevante. Em conta e ordem, o limite alcança o adquirente; a importadora está excluída desse limite para essa operação. Em encomenda, alcança importadora e encomendante. Fonte: [Modalidades Limitada e Ilimitada](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/habilitacao/Pessoa-Juridica/Submodalidade-Limitada-e-Ilimitada/modalidades-limitada-e-ilimitada-orientacoes-validas-a-partir-do-dia-01-12-2020-inicio-da-vigencia-da-in-rfb-no1984-2020).

O teto cadastrado não equivale a saldo disponível. O SaaS precisa do histórico completo das operações pertinentes para estimá-lo; sem histórico, mostrar “Saldo não confirmado”. Não assumir semestre civil ou reinício em janeiro/julho. A base exata de consumo deve ser implementada após conferência normativa específica.

## Modalidades da operação

| Modalidade | Relação principal | Consequência no produto |
|---|---|---|
| Importação direta | O cliente é importador | Cadastro do importador, despesas e prestadores próprios |
| Por conta e ordem | Importadora presta serviço para o adquirente, mediante contrato; pode incluir negociação e intermediação | Identificar adquirente e importadora; separar mercadoria, repasses de despesas e remuneração |
| Por encomenda | Importadora compra no exterior, nacionaliza e revende ao encomendante predeterminado | Separar custo interno da trading, preço de revenda e pagamentos do encomendante |
| Compra nacional de estoque | Cliente compra produto já disponível no Brasil | Fluxo comercial distinto; não simular automaticamente nova importação por encomenda |

Conta e ordem: [Definição oficial](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/despacho-de-importacao/topicos-1/importacao-por-conta-e-ordem-e-importacao-por-encomenda-1/importacao-por-conta-e-ordem/o-que-e-a-importacao-por-conta-e-ordem).

Encomenda: [Definição oficial](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/despacho-de-importacao/topicos-1/importacao-por-conta-e-ordem-e-importacao-por-encomenda-1/importacao-por-encomenda/o-que-e-a-importacao-por-encomenda). O art. 3º da IN RFB 1.861/2018, com alterações, admite valores recebidos antecipadamente como pagamento da obrigação de revenda. Não classificar automaticamente todo adiantamento como conta e ordem: [Texto anotado indexado da IN](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=97727&visao=anotado). A página do texto integral retornou conteúdo vazio na abertura direta; os trechos anotados estavam disponíveis na pesquisa. O manual oficial também contém referências fiscais históricas; não copiar integralmente suas regras como motor vigente.

Para as operações usuais entre pessoas jurídicas, não basta escolher “Usar Radar da trading”. A Receita exige habilitação dos envolvidos e formalização da vinculação/contrato, conforme a operação. Fonte: [Vincular importador ao adquirente ou encomendante](https://www.gov.br/pt-br/servicos/vincular-importador-ao-adquirente-ou-encomendante). Casos de pessoa física ou dispensa exigem percurso próprio, não aprovação automática pelo formulário.

## Como a trading trabalha no fluxo proposto

1. Qualificar cliente, finalidade da máquina, orçamento e destino.
2. Definir modalidade, intervenientes e documentação.
3. Selecionar fornecedor, linha, modelo e configuração.
4. Negociar quantidade mínima, preços, pagamento, produção e condição de entrega.
5. Cotar inspeção, coleta, transporte, seguro e despesas de destino.
6. Elaborar proposta comercial com custos, remuneração e validade.
7. Acompanhar marcos de compra, produção, embarque, desembaraço e entrega.
8. Confrontar valores estimados com despesas efetivas e fechar a prestação de contas ou revenda.

Esse roteiro é recomendação de produto. Não representa que todas as tradings prestam todos os serviços ou usam a mesma estrutura contratual.

## O que é cobrado

| Grupo | Rubricas a cadastrar | Forma proposta de parametrização |
|---|---|---|
| Remuneração da trading | Gestão da importação e negociação | Valor fixo ou percentual, com base explicitada e mínimo contratual quando houver |
| Serviços na fábrica | Auditoria, inspeção, acompanhamento e documentos | Por fábrica, visita, lote ou processo, conforme proposta |
| Serviços especializados | Despacho, classificação fiscal e assessoria de habilitação | Prestador, escopo e valor próprios |
| Logística | Frete internacional, origem, destino, seguro e entrega nacional | Cotação, moeda, validade, inclusões e adicionais |
| Permanência e atrasos | Armazenagem, sobre-estadia e outras cobranças previstas | Franquia, período, tarifa e evento de incidência |
| Revenda por encomenda | Preço da mercadoria nacionalizada | Custo interno e remuneração na formação do preço; evitar cobrar novamente margem já incluída |

Não foi verificada uma tabela universal de honorários. Um prestador anuncia cobrança fixa por processo, enquanto outro informa variação conforme complexidade. São declarações comerciais, não parâmetros legais ou cotações para este cliente: [Custom Broker](https://custombroker.com.br/pt_BR/tradingcompany/) e [Comex MT](https://lp-01.comexmt.com.br/). Aberturas diretas ficaram indisponíveis; informações vieram dos resultados indexados, sem confirmação contratual.

O serviço público de vinculação é gratuito; uma cobrança por assessoria é serviço privado distinto. Fonte: [Serviço oficial de vinculação](https://www.gov.br/pt-br/servicos/vincular-importador-ao-adquirente-ou-encomendante).

Para toda cobrança, o formulário deverá registrar: beneficiário, rubrica, unidade de cobrança, base quando percentual, moeda, vencimento, despesas incluídas e comprovação. Impostos, repasses e remuneração precisam de apresentação separada. Valores de simulações particulares não constituem tabela padrão da trading.

## Materiais encontrados no Scribd

| Material | Verificação e aproveitamento |
|---|---|
| [Planilha de Custos para Importação](https://www.scribd.com/document/793951550/Planilha-de-Custos-2) | Lido na sessão liberada; quatro páginas. Descreve negociação vinculada a cadastro de pessoa, parâmetros de entrada/saída, itens, despesas e comparação de previsto com realizado. Útil para arquitetura do fluxo; não copiar seus exemplos de NCM, CFOP ou alíquotas |
| [Planilha de Faturamento](https://www.scribd.com/document/816925182/Planilha-Importacao) | Texto público consultado; formatos XLSX/PDF anunciados, arquivo nativo não baixado. Mostra rateios diferentes para frete e seguro, separação de custos e preço. Não houve auditoria de fórmulas |
| [Importação Própria, Por Conta e Ordem — Tânia](https://pt.scribd.com/document/881075948/Importacao-Propria-Por-Conta-e-Ordem-Tania) | Texto público consultado. Diagramas úteis para participantes, recursos e mercadorias; contém referências e parâmetros históricos. Não usar como legislação vigente |
| [Planilha de Custos de Importação A](https://pt.scribd.com/document/632039011/Planilha-de-Custos-de-Importacao-SIMPLIFICADAf) | Lida na sessão liberada; duas páginas. Identifica-se como importação aérea simplificada, com courier e II de 60% no exemplo. Excluir como modelo fiscal do contêiner marítimo; apenas referência de apresentação de entradas e resumo |

Não foram baixados arquivos nem homologadas fórmulas desses materiais. Nomes e descrições de alguns títulos são aprimorados por IA pelo Scribd; a seleção foi baseada no conteúdo disponível, não apenas na descrição.

## Consequências para UI e banco

Navegação: Clientes → Cadastro e habilitação → Modalidade da operação → Catálogo → Fábrica → Linha → Máquinas → Configuração/quantidade → Custos → Revisão.

No cadastro de cada empresa: identificação, endereço fiscal, responsável comercial, modalidade de habilitação, situação, data de consulta, documento e histórico pertinente. Documentação sensível deve ter acesso restrito; não armazenar certificados privados ou senhas do Siscomex para montar uma simulação.

Na operação: relacionar cliente, trading, papéis, contrato, vinculação e modalidade. A versão da simulação deve preservar a informação utilizada, mesmo após atualizar o cadastro.

Na tela: badges “Habilitação não confirmada”, “Contrato pendente” e “Saldo não confirmado” quando aplicáveis. Pode-se elaborar estimativa comercial parcial com pendências; isso não autoriza execução aduaneira.

Não presumir que desembarque em Navegantes define sozinho o tratamento de ICMS. Manter porto, local de desembaraço, endereço dos intervenientes e destino físico separados para análise fiscal específica.

## Validação desta etapa

Teste de maquete pela interface: cadastro demonstrativo, acesso ao catálogo, checkbox HS01, filtro Comercial leve, inclusão de segundo item e revisão. A seleção anterior foi preservada ao filtrar. Coleta, banco, habilitação real e cálculo fiscal não estão integrados; não foram testados end-to-end.

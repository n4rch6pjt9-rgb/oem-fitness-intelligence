# Vocabulário do catálogo

O catálogo utiliza português do Brasil. Rótulos, frases e badges começam com letra maiúscula; unidades, códigos de modelos, nomes próprios e siglas técnicas preservam sua grafia. Usar “Comercial leve”, “Comercial”, “Estúdio”, “Modelo” e “Dimensões da embalagem”.

| Termo recebido | Termo do catálogo | Significado |
| --- | --- | --- |
| MOQ | Pedido mínimo | Quantidade mínima aceita por pedido. Não é a quantidade mínima de fabricação. |
| T/T | Transferência bancária | Modalidade de pagamento. |
| L/C at sight | Carta de crédito à vista | Preserva a condição de pagamento à vista. |
| SKU | Modelo | Identificação comercial do equipamento. |
| Light commercial | Comercial leve | Classe de uso. |
| Commercial | Comercial | Classe de uso. |
| Packing Size | Dimensões da embalagem | Medidas para transporte. |
| Weight Stack | Torre de pesos | Carga selecionável do equipamento. |
| Chest Press | Supino sentado | Nome de apresentação do equipamento. |

O vocabulário executável está em `ui/vocabulary.ts`. A interface apresenta badges com ícones, sem repetir o mesmo rótulo em texto ao lado. Dados técnicos e comerciais são transformados em conteúdo do catálogo; links, seções da página coletada e avisos de validação não aparecem na ficha. A evidência original permanece armazenada internamente.

Valores não contemplados pelas regras de transformação ficam fora da apresentação até receberem uma tradução revisada. Não traduzir códigos, nomes próprios ou números como se fossem linguagem natural. Não atribuir variantes técnicas a classes diferentes sem correspondência explícita nos dados.

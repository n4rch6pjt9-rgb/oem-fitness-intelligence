# Piloto de captura assistida Alibaba

Este piloto lê um HTML completo, o HAR da loja e o HAR do produto. Não executa scripts da captura, não repete requisições e não usa cookies ou tokens. Não habilita coleta automática nem libera URLs Alibaba no cadastro público de fábricas.

## Uso

```powershell
node alibaba-pilot-preview.mjs "produto.html" "loja.har" "produto.har" "previa.json" "importacao.sql"
```

O último argumento é opcional. A prévia não grava no banco. O SQL gerado deve ser revisado e executado por um operador com acesso ao projeto correto. Ele usa as tabelas e gatilhos existentes, cria fabricante e anúncio atomicamente, rejeita divergências de identidade, impede sobrescrever uma captura diferente e verifica que os demais anúncios não mudaram. Repetir o mesmo conteúdo não cria novos registros. Não é uma API pública de importação.

## Identificação e evidências

- O ID externo do anúncio e os IDs de opções Alibaba não são o modelo do fabricante. O modelo vem de `Model Number`.
- HTML renderizado, resposta original do produto e loja devem concordar em produto/fornecedor. O domínio móvel da loja deve corresponder ao domínio de fornecedor declarado na ficha.
- Nenhuma família é inferida de `XG-V12E`. Cores e opções permanecem como declarações da plataforma; não são promovidas automaticamente a variantes comprovadas.
- A categoria Commercial é uma declaração explícita no título, não uma conclusão por certificados, preço ou desempenho.
- As duas caixas são mantidas separadas. `packing_mm` fica vazio porque não existe uma dimensão única comprovada para o conjunto embalado.
- O comando deste piloto aplica a regra expressamente autorizada para o par G.W./N.W.: maior peso com embalagem e menor sem embalagem. A função de extração exige a opção `larger_is_gross` para essa interpretação. A ordem escrita na fonte permanece em `weight_resolution.original` e em `packaging.original`.
- Dados extraídos são permitidos por lista de campos públicos. Objetos de comprador, contato, sessão e requisições completas não são persistidos. Os HARs originais permanecem fora do repositório; apenas seus hashes entram na captura normalizada.
- A descrição carregada separadamente é identificada e tem seu hash preservado. Fotos de fábrica, certificados e produtos relacionados dessa descrição não são promovidos à galeria do equipamento. O piloto importa somente a galeria principal do produto.

## Resultado do ensaio autorizado em 20/10/2026

Empresa anunciada: Ningbo New Noble Sport Equipment Co., Ltd., loja `nbxgz.en.alibaba.com`. Modelo XG-V12E, anúncio externo 60642249004. Um fabricante, um anúncio e um SKU criados; nenhuma variante criada. Família pendente. Coleta automática desligada.

Preço capturado: USD 1100–1500; pedido mínimo de 5 conjuntos. Dimensões montadas: 2210 × 1020 × 1630 mm. Embalagem: caixa 1 de 2326 × 1080 × 500 mm e caixa 2 de 1160 × 1050 × 420 mm. Peso líquido interpretado: 238 kg; bruto: 274 kg. Seis referências de imagens da galeria principal.

O catálogo passou de 56 para 57 anúncios, sem alterar os 56 anteriores. Repetições da importação mantiveram os mesmos IDs. Catálogo, rota de detalhe e página de impressão foram verificados com os registros reais em servidor local de teste isolado; o servidor principal manteve sua autenticação. Não houve aprovação de PDF nem confirmação independente de fabricante, certificados, preço atual ou disponibilidade.

Para ampliar a integração: projetar vínculos de múltiplas lojas por fabricante e adicionar o provedor à prévia autenticada de importação. Esses fluxos não estão habilitados neste piloto.

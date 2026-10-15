# Hierarquia global do catálogo

Fabricante → família → SKU → categoria de uso → variantes comprovadas.

## Identidade e fontes

- `oem_factories` continua sendo o fabricante existente. Nenhum ID foi substituído.
- `oem_families` agrupa o prefixo alfabético de códigos alfanuméricos: TN114 → TN, HS01 → HS. `basis=model_prefix` explicita que esse agrupamento é uma convenção do código, e não comprovação de uma série técnica pelo fabricante. Códigos fora desse formato permanecem sem família.
- `oem_skus` tem unicidade por fabricante e código normalizado. A normalização remove espaços e uniformiza caixa; mantém pontuação, sufixos e zeros à esquerda. HS01 e HS1 continuam distintos.
- `oem_ads.sku_id` liga anúncios existentes ao SKU. URLs, IDs, mídias, linhas de origem e atributos continuam nos anúncios. Modelo ausente ou conflitante permanece sem identidade automática; anúncios sem modelo não são colapsados.
- `oem_lines` continua representando navegação/grupos da fonte. Não foi convertido em família técnica.
- Categorias Commercial/Light Commercial vêm de declarações explícitas no título ou nos campos de uso. Academia, estúdio, condomínio, preço e peso não determinam categoria.
- `oem_usage_evidence` guarda valor, bloco de origem e anúncio. Reingestão marca evidências substituídas como históricas, sem apagar registros. Fontes arquivadas não sustentam categorias ativas.
- `oem_sku_variants` exige uma declaração explícita de `variant`, `configuration` ou `model_version`, com nome e valor correspondentes, no mesmo anúncio que comprova a categoria de uso. Conflitos técnicos e múltiplas categorias não geram variantes automaticamente. Uma evidência retirada da fonte deixa de aparecer como variante ativa, mantendo seu registro histórico.
- `oem_ad_revisions` preserva um snapshot dos 29 anúncios atuais e de cada versão anterior a uma atualização. O trigger atende crawler, coleta assistida e gravações diretas, sem depender de um caminho específico da aplicação. A tabela não oferece UPDATE/DELETE ao `service_role`.

## Medidas

O resolvedor compara somente declarações dentro de um anúncio/modelo identificável. Havendo exatamente duas medidas válidas, com unidades explícitas e volumes diferentes, sem indício de configurações/categorias distintas, maior volume representa montada e menor representa embalagem.

Volumes iguais, mais de duas medidas, unidades ausentes, conflitos de modelo ou configurações distintas exigem revisão. Não se comparam dimensões entre anúncios alternativos. Uma única medida mantém o rótulo da fonte; não se inventa embalagem.

O resultado inclui método e evidências originais. A migração não sobrescreve medidas armazenadas ou revisões manuais. A API apresenta a projeção `measurements`, e novas ingestões usam o resolvedor. Declarações divergentes continuam disponíveis como conflitos da fonte, sem serem promovidas a variantes.

## API e UI

- `GET /api/factories/:id/skus` pagina SKUs no banco, preserva busca por título/modelo, filtro da linha de origem e lixeira. Anúncios alternativos não multiplicam cartões nem o total. Registros sem SKU continuam acessíveis individualmente.
- `GET /api/factories/:id/ads` mantém o contrato anterior de anúncios.
- `GET /api/ads/:id` preserva URLs existentes e acrescenta hierarquia, fabricante, medidas derivadas e links de anúncios do mesmo SKU.
- Catálogo, operação antiga e ficha de impressão consomem a hierarquia. Fotos e mídias continuam vinculadas ao anúncio de origem.
- As rotas seguem o middleware existente de autenticação do operador. Tabelas novas usam RLS, sem acesso para `anon`/`authenticated`; funções são `SECURITY INVOKER` com `search_path` vazio.

## Migrações e implantação

Aplicadas no projeto Supabase `osqkliwzowscupsykbbc` em 15/10/2026:

1. `20261015162905_oem_catalog_hierarchy.sql`
2. `20261015163137_oem_ad_revisions.sql`

As versões dos arquivos correspondem às versões realmente registradas pelo Supabase MCP. A CLI não estava disponível no ambiente; a migração foi ensaiada via SQL com rollback e aplicada pelo conector. Não usar `db push` indiscriminadamente: o repositório já tinha divergências anteriores entre o histórico remoto e os arquivos de migração de mídias/exclusão. Elas não foram reconciliadas nesta alteração.

O esquema aditivo é compatível com a aplicação anterior. O servidor e a UI deste PR precisam ser implantados para disponibilizar a nova apresentação. O teste visual usou exclusivamente o bypass local de teste já existente, com crawler desativado; nenhuma configuração de autenticação de produção foi alterada.

## Verificações realizadas

- 55 testes Node passaram, incluindo autenticação da nova rota, identidade, normalização sem perda de evidência, volume, casos ambíguos e contratos anteriores.
- TypeScript, verificação de sintaxe e build da UI passaram.
- `test/catalog-hierarchy.sql` passou em transação com rollback: duas fontes/um SKU, fabricantes separados, duas categorias, variante falsa rejeitada, variante explícita aceita, evidências arquivadas/substituídas, histórico, repetição do backfill, modelos desconhecidos, paginação e privilégios.
- Ensaio comparou todos os campos originais dos anúncios, mídias, linhas e associações antes/depois. Anúncios e mídias mantiveram os mesmos hashes após a aplicação real.
- Estado real: 29 anúncios, 29 SKUs, duas famílias, 15 vínculos de categoria, zero variantes e 29 snapshots iniciais. Um anúncio permanece arquivado; não foi restaurado.
- TN114: família TN e categoria Commercial, sustentada por `appliance = Comunidade, Ginásio, ginásio comercial`, bloco `Basic Info.`. A embalagem permanece vazia porque as duas declarações dimensionais são equivalentes: 2246 × 1643 × 1382 mm.
- Navegador com dados reais: busca TN114, abertura da ficha e tela de impressão sem erros JS/API. As três páginas da ficha não apresentaram overflow no DOM; primeira página e catálogo foram inspecionados visualmente. Isso não representa aprovação de todos os PDFs do catálogo.
- Advisor de segurança: RLS sem políticas é intencional no acesso exclusivo pelo servidor. Há aviso de proteção de senhas vazadas desativada no Auth; a configuração de autenticação não foi alterada nesta tarefa.

Para repetir o contrato SQL após as migrações, execute `BEGIN`, o conteúdo de `test/catalog-hierarchy.sql` e `ROLLBACK` na mesma sessão. Os produtos usados pelo teste são sintéticos e não devem ser persistidos.

# OEM Fitness Intelligence

Piloto independente para inteligência de fornecedores de equipamentos fitness, catálogo e preparação de operações de importação. O aplicativo original permanece no repositório OEM-Supplier-Intelligence-Gym; esta base registra a reconstrução local para evolução por pull requests.

## Estrutura

- `server.mjs`: servidor Express, autenticação de operadores e rotas da aplicação.
- `src/`: descoberta e extração Made-in-China, fila de coleta, cadastro de clientes, configuração do operador e conector Siscomex.
- `ui/`: ficha React/TypeScript com Tailwind CSS e shadcn/ui; vocabulário em português.
- `public/`: painel do crawler, configuração do operador e modelo de navegação. A ficha HS01 é um exemplo, não prova de catálogo persistido.
- `supabase/migrations/`: schema do catálogo e do cadastro de clientes. A configuração do banco é independente do GitHub.
- `test/`: testes automatizados, incluindo transportes simulados para integrações.
- `docs/`: arquitetura, vocabulário, navegação e pesquisa metodológica.

## Executar localmente

Node.js 22 ou superior, npm e um projeto Supabase configurado:

```powershell
npm ci
Copy-Item .env.example .env
# Preencha o arquivo localmente.
npm run build
npm test
npm run check
npm run typecheck
npm start
```

Acesse a origem configurada em `APP_ORIGIN`, por padrão http://localhost:3000. A ficha está em `/example.html`; a navegação proposta, em `/modelo-navegacao.html`.

Para coleta renderizada, instale o Chromium oficial com `npx playwright install chromium`. O worker fica desligado por padrão. Configure o banco, revise a fila pela interface e só então habilite `CRAWLER_ENABLED`.

## Configuração e segurança

Use `.env.example` como contrato. Não publique `.env`, certificado A1, senhas, tokens, planilhas de clientes ou evidências privadas. A chave secreta Supabase pertence somente ao servidor. Operadores autorizados são definidos por UUID em `OEM_OPERATOR_IDS`; o servidor valida o usuário com Supabase Auth.

O navegador recebe um identificador de sessão em cookie HttpOnly/SameSite=Strict. Tokens ficam em memória no servidor; reiniciar o processo exige novo login. HTTPS habilita cookies Secure. O cadastro inicial de operador é exclusivamente local e não deve ser exposto como cadastro público.

As migrations usam tabelas `oem_*`. Revise o schema e o histórico antes de aplicar migrations em um banco existente. As tabelas ficam sem acesso direto de usuários anônimos/autenticados; o backend usa a chave de serviço e valida o operador. O cadastro de clientes filtra `owner_id`; isolamento e compartilhamento por organização ainda precisam de evolução.

O Siscomex é somente leitura. O certificado fica fora do repositório, a senha é informada pela interface e os tokens não são enviados ao navegador. Testes simulados não confirmam autenticação real. A última tentativa local não desbloqueou o PFX; essa integração continua pendente.

## Contrato de catálogo

Fábrica é identificada pelo domínio da loja; páginas são deduplicadas pela URL canônica. Modelo ausente permanece ausente. A extração preserva valores e contexto, sem inventar especificações ou atribuir variantes a classes diferentes sem evidência explícita. A apresentação usa português e badges com ícones.

Catálogo completo exige cobertura da paginação, revisão das linhas e fila sem pendências. Bloqueios e CAPTCHA são erros de coleta; não produzem resultados fictícios. Os sites de outros fabricantes ainda exigem análise estrutural antes de um adaptador.

## Limites e revisão

Este é um piloto, sem conclusão do teste integral pela UI. Cadastro, seleção, coleta e simulação devem ser validados na interface antes de declarar o fluxo completo. A maquete de navegação contém dados demonstrativos; habilitação, operação e simulação ainda não têm persistência completa. O simulador logístico/fiscal e as cotações de frete permanecem no planejamento.

O servidor e a fila exigem processo Node persistente. Preparação para produção inclui isolamento por organização, proteção operacional, limites de transporte e validação das integrações reais. Evidências e planilhas privadas permanecem na pasta original e não integram esta publicação.

Contribuições seguem `CONTRIBUTING.md`, com branches `codex/`, commits focados e revisão por PR.

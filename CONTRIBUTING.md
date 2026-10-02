# Contribuição e revisão

1. Analise a implementação e os contratos existentes antes de alterar código.
2. Crie uma branch `codex/<escopo>` a partir de `main`.
3. Mantenha commits focados e preserve trabalhos locais não relacionados.
4. Execute `npm test`, `npm run check`, `npm run typecheck` e `npm run build`.
5. Revise `git diff --check` e todos os arquivos antes de publicar. Nunca versione ambientes, certificados, senhas, tokens ou dados particulares de clientes.
6. Abra um PR indicando problema, comportamento resultante, verificações e limitações. Use rascunho quando houver pendências de aceite.
7. Valide o fluxo funcional pela UI; testes simulados não confirmam integrações externas, persistência ou coleta integral.
8. Revise migrations e o schema real antes de aplicar mudanças. Não execute alterações destrutivas nem conceda acesso público para contornar falhas.
9. Integração na branch principal ocorre após revisão. Publicação, operações oficiais e implantação devem ter escopo explícito.

O modelo de navegação contém cenários demonstrativos. Consulte `docs/arquitetura.md` para distinguir implementação, proposta e integração pendente. `scripts/build-example.mjs` é um utilitário opcional que requer o HTML local `evidence/hs01-source.html`; o build normal utiliza o JSON do exemplo versionado e não depende desse arquivo privado.

Não descarte nem publique automaticamente planilhas ou evidências da pasta original. O ambiente local e o certificado A1 devem ser configurados separadamente nesta pasta.

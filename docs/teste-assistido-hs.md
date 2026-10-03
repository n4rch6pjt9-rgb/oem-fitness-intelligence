# Teste assistido da linha HS

A coleta assistida fica no painel da fábrica, em **Coleta assistida de uma ficha**. Ela reutiliza `parsePage`, a gravação do crawler e o vocabulário em português. Não executa os scripts do HTML, não grava o arquivo bruto e não depende de cookies do fornecedor.

1. Entrar como operador e abrir a BRTW.
2. Manter a coleta automática pausada.
3. Informar a URL de detalhe, o nome da linha e a URL da primeira página do grupo.
4. Selecionar o HTML completo salvo da ficha e clicar em **Gerar prévia**.
5. Revisar modelo, valores e imagens; clicar em **Salvar no catálogo**.
6. Abrir `/catalogo.html`, selecionar a fábrica e a linha e recarregar. Confirmar que a ficha permanece.

A prévia expira em dez minutos e pertence à sessão que a criou. A confirmação grava apenas o produto extraído e a associação à linha. A identidade por URL evita duplicar a mesma ficha em novas importações. Os contextos técnicos ficam preservados; não implicam automaticamente classes de uso.

Este teste de uma ficha não comprova cobertura dos 118 anúncios da linha. A fila automática que recebeu HTTP 403 permanece separada. Não há captura automática do navegador nem importação integral das três páginas nesta etapa.

Limitação: produto e associação são duas gravações idempotentes. Se uma delas falhar, repetir a confirmação completa o vínculo; a prévia só é descartada após sucesso. Não há transação entre essas chamadas.

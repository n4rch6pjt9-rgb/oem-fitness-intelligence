import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../src/render-page.mjs';

const url = 'https://brtw-fitness.en.made-in-china.com/product-list-1.html';
function browserFixture(status) {
  let closed = false;
  const page = {
    setDefaultTimeout() {},
    async route() {},
    async goto(target) {
      assert.equal(target, url);
      return status === null ? null : { ok: () => status < 400, status: () => status };
    },
    async content() { throw new Error('Uma recusa HTTP não deve ser extraída como catálogo.'); }
  };
  return {
    browserType: { async launch() { return {
      async newContext() { return { async newPage() { return page; } }; },
      async close() { closed = true; }
    }; } },
    isClosed: () => closed
  };
}
test('renderer preserva 403 e 429 para o crawler gravar o status na fila', async () => {
  for (const status of [403, 429]) {
    const fixture = browserFixture(status);
    const response = await renderPage(url, {}, fixture.browserType);
    assert.equal(response.status, status);
    assert.equal(response.ok, false);
    assert.equal(await response.text(), '');
    assert.equal(fixture.isClosed(), true);
  }
});
test('renderer distingue ausência de resposta de uma recusa HTTP e fecha o navegador', async () => {
  const fixture = browserFixture(null);
  await assert.rejects(renderPage(url, {}, fixture.browserType), /Fonte não retornou uma resposta HTTP/);
  assert.equal(fixture.isClosed(), true);
});

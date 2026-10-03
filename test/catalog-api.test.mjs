import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createCatalogApi } from '../src/catalog-api.mjs';
import { createApp } from '../server.mjs';

const factory = '11111111-1111-1111-1111-111111111111';
const other = '22222222-2222-2222-2222-222222222222';
const line = '33333333-3333-3333-3333-333333333333';
function fixture({ missingFactory = false } = {}) {
  const calls = [];
  const db = createClient('https://catalog.test', 'test-key', {
    auth: { persistSession: false },
    global: { fetch: async (input) => {
      const url = new URL(input); calls.push(url);
      const table = url.pathname.split('/').at(-1);
      if (table === 'oem_factories') return Response.json(missingFactory ? null : { id: factory });
      if (table === 'oem_lines' && url.searchParams.has('id')) return Response.json(url.searchParams.get('id') === `eq.${line}` && url.searchParams.get('factory_id') === `eq.${factory}` ? { id: line } : null);
      if (table === 'oem_lines') return Response.json([{ id: line, name: 'Série HS', source_url: 'https://example.test/line' }]);
      if (table === 'oem_ads') {
        assert.equal(url.searchParams.get('factory_id'), `eq.${factory}`);
        const filtered = url.searchParams.get('oem_ad_lines.line_id') === `eq.${line}`;
        if (filtered) assert.match(url.searchParams.get('select'), /oem_ad_lines!inner\(line_id\)/);
        const total = filtered ? 1050 : 1100;
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = Number(url.searchParams.get('limit'));
        const items = Array.from({ length: Math.min(limit, total - offset) }, (_, i) => ({ id: `item-${offset + i}`, title: 'Máquina', attributes: { extraction: { product: { model: 'HS01' } } }, ...(filtered ? { oem_ad_lines: [{ line_id: line }] } : {}) }));
        return Response.json(items, { headers: { 'Content-Range': `${offset}-${offset + items.length - 1}/${total}` } });
      }
      throw new Error(`Consulta não esperada: ${table}`);
    } }
  });
  return { api: createCatalogApi(db), calls };
}
test('linhas pertencem à fábrica selecionada e são ordenadas por nome e id', async () => {
  const { api, calls } = fixture();
  assert.equal((await api.lines(factory)).items[0].id, line);
  const request = calls.at(-1);
  assert.equal(request.searchParams.get('factory_id'), `eq.${factory}`);
  assert.equal(request.searchParams.get('order'), 'name.asc,id.asc');
});
test('filtro por linha pagina no banco, preserva contagem superior a mil e não expõe associação', async () => {
  const { api, calls } = fixture();
  const result = await api.ads(factory, { page: '43', line_id: line, q: 'Máquina_50%' });
  assert.equal(result.total, 1050);
  assert.equal(result.page, 43);
  assert.equal(result.items[0].id, 'item-1008');
  assert.equal(result.items.length, 24);
  assert.ok(result.items[0].attributes.extraction);
  assert.ok(!('oem_ad_lines' in result.items[0]));
  const query = calls.at(-1);
  assert.equal(query.searchParams.get('offset'), '1008');
  assert.equal(query.searchParams.get('ilike'), null);
  assert.equal(query.searchParams.get('title'), 'ilike.%Máquina\\_50\\%%');
  assert.equal(query.searchParams.get('order'), 'source_url.asc,id.asc');
  assert.equal(calls.filter(url => url.pathname.endsWith('oem_ad_lines')).length, 0);
});
test('linha de outra fábrica é rejeitada antes de consultar produtos', async () => {
  const { api, calls } = fixture();
  await assert.rejects(api.ads(factory, { line_id: other }), error => error.status === 404);
  assert.ok(!calls.some(url => url.pathname.endsWith('oem_ads')));
});
test('fábrica inexistente não vira lista vazia e consultas inválidas não atingem o banco', async () => {
  const missing = fixture({ missingFactory: true });
  await assert.rejects(missing.api.lines(factory), error => error.status === 404);
  const { api, calls } = fixture();
  for (const query of [{ page: ['1'] }, { page: '0' }, { page: '1.5' }, { line_id: 'invalid' }, { q: {} }, { q: 'x'.repeat(121) }]) await assert.rejects(api.ads(factory, query), error => error.status === 400);
  assert.equal(calls.length, 0);
});
test('consulta sem linha preserva todos os produtos e o contrato de paginação', async () => {
  const { api, calls } = fixture();
  const result = await api.ads(factory);
  assert.equal(result.total, 1100);
  assert.equal(result.size, 24);
  assert.ok(!calls.at(-1).searchParams.get('select').includes('!inner'));
});
test('rotas novas e filtro não contornam autenticação do servidor', async () => {
  const runtime = createApp({}); const server = runtime.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of [`/api/factories/${factory}/lines`, `/api/factories/${factory}/ads?line_id=${line}`]) assert.equal((await fetch(base + path)).status, 401);
  } finally { runtime.close(); await new Promise(resolve => server.close(resolve)); }
});

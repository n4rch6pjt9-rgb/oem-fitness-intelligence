import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createAssistedCollection} from '../src/assisted-collection.mjs';
const domain='brtw-fitness.en.made-in-china.com';
const url=`https://${domain}/product/abc/China-Machine.html`;
const line_url=`https://${domain}/productList?isByGroup=1&productGroupOrCatId=HS&pageNumber=1`;
const html=`<html><head><link rel="canonical" href="${url}"><script type="application/ld+json">{"@type":"Product","name":"Machine","additionalProperty":[{"name":"Model NO.","value":"HS01"}]}</script></head><body><h1>Machine</h1></body></html>`;
function fixture(){let time=0;const writes=[];const saved=[];const db=createClient('https://test.invalid','key',{global:{fetch:async(input,options)=>{const table=new URL(input).pathname.split('/').at(-1);if(options.method==='POST')writes.push(table);return Response.json(table==='oem_factories'?{id:'f',domain,crawl_enabled:false}:{id:'l'});}}});return {api:createAssistedCollection(db,async(...args)=>{saved.push(args);return {id:'a'};},()=>time),writes,saved,expire:()=>{time=600001;}};}
const body={url,line_url,line_name:'Série HS',html};
test('prévia não grava; confirmação pertence à sessão e preserva vínculo da linha',async()=>{const f=fixture();const p=await f.api.preview('f','s',body);assert.equal(f.writes.length,0);await assert.rejects(f.api.save('f','other',p.token),e=>e.status===409);const saved=await f.api.save('f','s',p.token);assert.equal(saved.id,'a');assert.deepEqual(f.saved[0][2],['l']);assert.equal(f.saved[0][1].source_url,url);await assert.rejects(f.api.save('f','s',p.token));});
test('recusa outra fábrica, HTML de outra ficha e prévia expirada',async()=>{const f=fixture();await assert.rejects(f.api.preview('f','s',{...body,url:url.replace(domain,'other.en.made-in-china.com')}));await assert.rejects(f.api.preview('f','s',{...body,html:html.replace('href="'+url,'href="'+url.replace('/abc/','/other/'))}));const p=await f.api.preview('f','s',body);f.expire();await assert.rejects(f.api.save('f','s',p.token),e=>e.status===409);assert.equal(f.saved.length,0);});

test('listing assistida: preview nao grava e save persiste linhas e cobertura', async () => {
  const writes = [];
  let factoryUpdate = null;

  const db = createClient('https://test.invalid', 'key', {
    global: {
      fetch: async (input, options) => {
       const url = new URL(input);
        const table = url.pathname.split('/').at(-1);

        if (options.method === 'GET' && table === 'oem_factories') {
          return Response.json([{
            id: 'f',
            domain,
            crawl_enabled: false
          }]);
        }

        if (options.method === 'POST' && table === 'oem_lines') {
          writes.push(table);
          return Response.json({id:'line-hs'});
        }

        if (options.method === 'PATCH' && table === 'oem_factories') {
          writes.push(table);
          factoryUpdate = JSON.parse(options.body);
          return new Response(null, {status:204});
        }

        throw new Error(
          `Unexpected request: ${options.method} ${url.pathname}${url.search}`
        );
      }
    }
  });

  const api = createAssistedCollection(db, async () => {
    throw new Error('persistProduct must not run for listing capture');
  });

  const listingUrl =
    `https://${domain}/productList?` +
    'isByGroup=0&pageNumber=1&pageSize=48&viewPageSize=48';

  const html = `
    <html>
      <head><title>BRTW Fitness</title></head>
      <body>
        <input name="pageNumber" value="1">
        <input name="pageSize" value="48">
        <input name="isByGroup" value="0">
        <input name="productGroupOrCatId" value="">
        <div>Total 96 Products</div>
        <a href="/product-group/A/HS-Series-1.html">HS Series</a>
        <a href="/product/abc/China-Machine.html">Machine</a>
      </body>
    </html>`;

  const preview = await api.previewListing(
    'f',
    'session-listing',
    {url:listingUrl, html}
  );

  assert.equal(writes.length, 0);
  assert.equal(preview.expected_ads, 96);
  assert.equal(preview.groups.length, 1);
  assert.equal(preview.products.length, 1);

  const saved = await api.saveListing(
    'f',
    'session-listing',
    preview.token
  );

  assert.deepEqual(writes, ['oem_lines', 'oem_factories']);
  assert.equal(saved.lines.length, 1);
  assert.equal(saved.lines[0].id, 'line-hs');
  assert.equal(saved.products.length, 1);
  assert.equal(saved.expected_ads, 96);
  assert.equal(factoryUpdate.expected_ads, 96);

  await assert.rejects(
    api.saveListing('f', 'session-listing', preview.token),
    error => error.status === 409
  );
});

test('listing assistida: recusa outra fabrica e token de outra sessao', async () => {
  const db = createClient('https://test.invalid', 'key', {
    global: {
      fetch: async (input, options) => {
        const table = new URL(input).pathname.split('/').at(-1);

        if (options.method === 'GET' && table === 'oem_factories') {
          return Response.json([{
            id:'f',
            domain,
            crawl_enabled:false
          }]);
        }

        throw new Error('Unexpected database write');
      }
    }
  });

  const api = createAssistedCollection(db, async () => {
    throw new Error('persistProduct must not run');
  });

  const goodUrl =
    `https://${domain}/productList?` +
    'isByGroup=0&pageNumber=1&pageSize=48&viewPageSize=48';

  const html = `
    <html><body>
      <input name="pageNumber" value="1">
      <input name="pageSize" value="48">
      <input name="isByGroup" value="0">
      <input name="productGroupOrCatId" value="">
      <div>Total 1 Products</div>
      <a href="/product/abc/China-Machine.html">Machine</a>
    </body></html>`;

  await assert.rejects(
    api.previewListing('f', 's', {
      url:'https://other.en.made-in-china.com/productList?pageNumber=1',
      html
    }),
    error => error.status === 400
  );

  const preview = await api.previewListing(
    'f',
    'owner',
    {url:goodUrl, html}
  );

  await assert.rejects(
    api.saveListing('f', 'other-session', preview.token),
    error => error.status === 409
  );
});

test('listing assistida: exige coleta automatica pausada e respeita expiracao', async () => {
  let enabled = true;
  let time = 0;

  const db = createClient('https://test.invalid', 'key', {
    global: {
      fetch: async (input, options) => {
        const table = new URL(input).pathname.split('/').at(-1);

        if (options.method === 'GET' && table === 'oem_factories') {
          return Response.json([{
            id:'f',
            domain,
            crawl_enabled:enabled
          }]);
        }

        throw new Error('Unexpected database write');
      }
    }
  });

  const api = createAssistedCollection(
    db,
    async () => {
      throw new Error('persistProduct must not run');
    },
    () => time
  );

 const url =
    `https://${domain}/productList?` +
    'isByGroup=0&pageNumber=1&pageSize=48&viewPageSize=48';

  const html = `
    <html><body>
      <input name="pageNumber" value="1">
      <input name="pageSize" value="48">
      <input name="isByGroup" value="0">
      <input name="productGroupOrCatId" value="">
      <div>Total 1 Products</div>
      <a href="/product/abc/China-Machine.html">Machine</a>
    </body></html>`;

  await assert.rejects(
    api.previewListing('f', 's', {url, html}),
    error => error.status === 409
  );

  enabled = false;

  const preview = await api.previewListing(
    'f',
    's',
    {url, html}
  );

  time = 600001;

  await assert.rejects(
    api.saveListing('f', 's', preview.token),
    error => error.status === 409
  );
});

test('listing assistida: valida coerencia entre pagina, grupo e HTML', async () => {
  const db = createClient('https://test.invalid', 'key', {
    global: {
      fetch: async (input, options) => {
        const table = new URL(input).pathname.split('/').at(-1);

        if (options.method === 'GET' && table === 'oem_factories') {
          return Response.json([{
            id: 'f',
            domain,
            crawl_enabled: false
          }]);
        }

        throw new Error('Unexpected database write');
      }
    }
  });

  const api = createAssistedCollection(db, async () => {
    throw new Error('persistProduct must not run');
  });

  const listingUrl = page =>
    `https://${domain}/productList?` +
    `isByGroup=1&productGroupOrCatId=HS&pageNumber=${page}` +
    '&pageSize=48&viewPageSize=48';

  const listingHtml = (page, group = 'HS') => `
    <html>
      <body>
        <input name="pageNumber" value="${page}">
        <input name="pageSize" value="48">
        <input name="isByGroup" value="1">
        <input name="productGroupOrCatId" value="${group}">
        <div>Total 118 Products</div>
        <a href="/product/abc/China-Machine.html">Machine</a>
      </body>
    </html>`;

  const page3 = await api.previewListing(
    'f',
    'page-3',
    {
      url: listingUrl(3),
      html: listingHtml(3)
    }
  );

  assert.equal(page3.expected_ads, 118);

  await assert.rejects(
    api.previewListing(
      'f',
      'wrong-page',
      {
        url: listingUrl(3),
        html: listingHtml(2)
      }
    ),
    error =>
      error.status === 400 &&
      error.message.includes(
        'outra página ou linha da listagem'
      )
  );

  await assert.rejects(
    api.previewListing(
      'f',
      'wrong-group',
      {
        url: listingUrl(2),
        html: listingHtml(2, 'OTHER')
      }
    ),
    error =>
      error.status === 400 &&
      error.message.includes(
        'outra página ou linha da listagem'
      )
  );
});

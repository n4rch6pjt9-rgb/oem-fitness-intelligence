import { randomBytes } from 'node:crypto';
import { load } from 'cheerio';
import { canonicalUrl, parsePage } from './parser.mjs';
import { InputError } from './client-api.mjs';
import { unwrap } from './crawler.mjs';

// Raw HTML remains in this request only; previews retain parsed product data.
export function createAssistedCollection(db, persistProduct, now = Date.now) {
  const pending = new Map();
  function prune() { for (const [key, value] of pending) if (value.expires <= now()) pending.delete(key); }
  async function factory(id) {
    const row = unwrap(await db.from('oem_factories').select('id,domain,crawl_enabled').eq('id', id).maybeSingle());
    if (!row) throw new InputError('Fábrica não encontrada.', 404);
    if (row.crawl_enabled) throw new InputError('Pause a coleta automática antes de importar uma ficha.', 409);
    return row;
  }
  return {
    async previewListing(factoryId, session, body) {
      prune();

      if (
        !body ||
        typeof body.html !== 'string' ||
        Buffer.byteLength(body.html) > 8_000_000 ||
        !body.html.trim()
      ) {
        throw new InputError('Selecione um HTML de até 8 MB.');
      }

      if (typeof body.url !== 'string') {
        throw new InputError('Informe a URL da listagem.');
      }

      let url;
      try {
        url = canonicalUrl(body.url);
      } catch {
        throw new InputError('Use uma URL válida da loja Made-in-China.');
      }

      const row = await factory(factoryId);
      const listing = new URL(url);

      if (listing.hostname !== row.domain || listing.pathname !== '/productList') {
        throw new InputError('A listagem deve pertencer à fábrica selecionada.');
      }
      const $ = load(body.html);
      const htmlPage = $('[name="pageNumber"]').first().val();
      const htmlPageSize = $('[name="pageSize"]').first().val();
      const htmlIsByGroup = $('[name="isByGroup"]').first().val();
      const htmlGroup = $('[name="productGroupOrCatId"]').first().val();

      const expectedPage = listing.searchParams.get('pageNumber') ?? '1';
      const expectedPageSize = listing.searchParams.get('pageSize') ?? '48';
      const expectedIsByGroup = listing.searchParams.get('isByGroup') ?? '';
      const expectedGroup = listing.searchParams.get('productGroupOrCatId') ?? '';

      if (
        String(htmlPage ?? '') !== expectedPage ||
        String(htmlPageSize ?? '') !== expectedPageSize ||
        String(htmlIsByGroup ?? '') !== expectedIsByGroup ||
        String(htmlGroup ?? '') !== expectedGroup
      ) {
        throw new InputError('O HTML pertence a outra página ou linha da listagem. Confira a URL.');
      }

      let parsed;
      try {
        parsed = parsePage(body.html, url);
      } catch (error) {
        throw new InputError(error.message);
      }

      if (parsed.kind !== 'listing') {
        throw new InputError('Selecione uma página de listagem.');
      }

      for (const [key, value] of pending) {
        if (value.session === session) pending.delete(key);
      }

      const token = randomBytes(24).toString('hex');
      const products = parsed.links.filter(link => link.kind === 'product');
      const pages = parsed.links.filter(link => link.kind === 'listing');

      pending.set(token, {
        session,
        factoryId,
        type: 'listing',
        url,
        parsed,
        expires: now() + 600000,
        saving: false
      });

      return {
        token,
        url,
        groups: parsed.groups,
        products,
        pages,
        expected_ads: parsed.expectedAds,
        factory_name: parsed.factoryName
      };
    },

    async saveListing(factoryId, session, token) {
      prune();

      const preview =
        typeof token === 'string' ? pending.get(token) : null;

      if (
        !preview ||
        preview.type !== 'listing' ||
        preview.session !== session ||
        preview.factoryId !== factoryId
      ) {
        throw new InputError(
          'Prévia expirada ou inválida. Gere uma nova prévia.',
          409
        );
      }

      if (preview.saving) {
        throw new InputError('A gravação está em andamento.', 409);
      }

      await factory(factoryId);
      preview.saving = true;

      try {
        const lines = [];

        for (const group of preview.parsed.groups) {
          const line = unwrap(
            await db
              .from('oem_lines')
              .upsert(
                {...group, factory_id: factoryId},
                {onConflict:'source_url'}
              )
              .select('id')
              .single()
          );

          lines.push({
            id: line.id,
            name: group.name,
            source_url: group.source_url
          });
        }

        if (preview.parsed.expectedAds !== null) {
          unwrap(
            await db
              .from('oem_factories')
              .update({
                expected_ads: preview.parsed.expectedAds,
                checked_at: new Date().toISOString(),
                ...(preview.parsed.factoryName
                  ? {name: preview.parsed.factoryName}
                  : {})
              })
              .eq('id', factoryId)
          );
        }

        pending.delete(token);

        return {
          lines,
          products: preview.parsed.links.filter(
            link => link.kind === 'product'
          ),
          pages: preview.parsed.links.filter(
            link => link.kind === 'listing'
          ),
          expected_ads: preview.parsed.expectedAds
        };
      } finally {
        preview.saving = false;
      }
    },

    async preview(factoryId, session, body) {
      prune();
      if (!body || typeof body.html !== 'string' || Buffer.byteLength(body.html) > 8_000_000 || !body.html.trim()) throw new InputError('Selecione um HTML de até 8 MB.');
      if (typeof body.url !== 'string' || typeof body.line_url !== 'string' || typeof body.line_name !== 'string' || !body.line_name.trim() || body.line_name.length > 120) throw new InputError('Informe a ficha e a linha de produtos.');
      let url, lineUrl;
      try { url = canonicalUrl(body.url); lineUrl = canonicalUrl(body.line_url); } catch { throw new InputError('Use URLs válidas da loja Made-in-China.'); }
      const row = await factory(factoryId);
      const productUrl = new URL(url), line = new URL(lineUrl);
      if (productUrl.hostname !== row.domain || line.hostname !== row.domain || !/^\/product\/[^/]+\/[^/]+\.html$/.test(productUrl.pathname) || line.pathname !== '/productList' || line.searchParams.get('isByGroup') !== '1' || !/^[a-zA-Z0-9]+$/.test(line.searchParams.get('productGroupOrCatId') ?? '') || line.searchParams.get('pageNumber') !== '1') throw new InputError('A ficha e a primeira página da linha devem pertencer à fábrica selecionada.');
      const $ = load(body.html);
      const canonical = $('link[rel="canonical"]').attr('href');
      if (canonical && canonicalUrl(canonical, url) !== url) throw new InputError('O HTML pertence a outra ficha. Confira a URL.');
      let parsed;
      try { parsed = parsePage(body.html, url); } catch { throw new InputError('Não foi possível extrair a ficha desse HTML. Confira se salvou a página completa do produto.'); }
      if (parsed.kind !== 'product') throw new InputError('Selecione uma ficha de produto.');
      // One bounded preview per operator session; no database writes here.
      for (const [key, value] of pending) if (value.session === session) pending.delete(key);
      const token = randomBytes(24).toString('hex');
      pending.set(token, {session, factoryId, ad:parsed.ad, line:{name:body.line_name.trim(), source_url:lineUrl}, expires:now()+600000, saving:false});
      return {token, product:parsed.ad.attributes.extraction, line_name:body.line_name.trim()};
    },
    async save(factoryId, session, token) {
      prune();
      const preview = typeof token === 'string' ? pending.get(token) : null;
      if (!preview || preview.session !== session || preview.factoryId !== factoryId) throw new InputError('Prévia expirada ou inválida. Gere uma nova prévia.', 409);
      if (preview.saving) throw new InputError('A gravação está em andamento.', 409);
      await factory(factoryId);
      preview.saving = true;
      try {
        const line = unwrap(await db.from('oem_lines').upsert({...preview.line, factory_id:factoryId}, {onConflict:'source_url'}).select('id').single());
        const ad = await persistProduct(factoryId, preview.ad, [line.id]);
        pending.delete(token);
        return {id:ad.id, model:preview.ad.model, line_id:line.id};
      } finally { preview.saving = false; }
    }
  };
}

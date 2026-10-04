import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { listingUrl } from './listing-url.mjs';
import { extractProduct } from './extract-product.mjs';

export function canonicalUrl(value, base) {
  const u = new URL(value, base);

  if (
    u.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.en\.made-in-china\.com$/i.test(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  ) {
    throw new Error('Use uma loja HTTPS do Made-in-China.');
  }

  if (u.pathname === '/productList') {
    return listingUrl(
      u.origin,
      u.searchParams.get('isByGroup') === '1'
        ? u.searchParams.get('productGroupOrCatId') ?? ''
        : '',
      Number(u.searchParams.get('pageNumber') ?? 1)
    );
  }

  u.search = '';
  u.hash = '';
  return u.href;
}

const clean = value =>
  String(value ?? '').replace(/\s+/g, ' ').trim();

function graph(value) {
  if (Array.isArray(value)) return value.flatMap(graph);
  if (!value || typeof value !== 'object') return [];
  return [value, ...graph(value['@graph'])];
}

function number(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (
    typeof value !== 'string' ||
    !/^\d[\d,]*(\.\d+)?$/.test(value.trim())
  ) {
    return null;
  }

  return Number(value.replaceAll(',', ''));
}

export function dimensions(value) {
  if (!value) return null;

  const m = clean(value).match(
    /^(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[*x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[*x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?(?:\s*\((mm|cm|m)\))?$/i
  );

  if (!m) return null;

  const units = [m[2], m[4], m[6]]
    .filter(Boolean)
    .map(s => s.toLowerCase());

  const unit =
    m[7]?.toLowerCase() ??
    (new Set(units).size === 1 ? units[0] : null);

  if (!unit || units.some(x => x !== unit)) return null;

  const multiplier = {
    mm: 1,
    cm: 10,
    m: 1000
  }[unit];

  const nums = [m[1], m[3], m[5]].map(
    x => Number(x) * multiplier
  );

  return nums.every(x => x > 0) ? nums : null;
}

export function parsePage(html, url) {
  const $ = load(html);
  const text = clean($('body').text());
  const source = new URL(url);
  const origin = source.origin;

  if (
    /captcha|verify you are human|access denied|unusual traffic/i.test(
      $('title').text()
    ) ||
    /verify you are human|unusual traffic/i.test(text)
  ) {
    throw new Error(
      'Coleta bloqueada por desafio ou controle de acesso.'
    );
  }

  const blocks = [];

  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      blocks.push(JSON.parse($(e).text()));
    } catch {
      // Outros blocos JSON-LD válidos ainda podem ser processados.
    }
  });

  const product = blocks
    .flatMap(graph)
    .find(x =>
      []
        .concat(x['@type'] ?? [])
        .includes('Product')
    );

  /*
   * ============================================================
   * FICHA DE PRODUTO
   * ============================================================
   */

  if (/\/product\//.test(source.pathname)) {
    if (!product || !clean(product.name)) {
      throw new Error(
        'Anúncio sem Product JSON-LD válido; revisão necessária.'
      );
    }

    const attrs = {};

    const put = (key, val) => {
      key = clean(key).replace(/:$/, '');
      val = clean(val);

      if (key && val && !(key in attrs)) {
        attrs[key] = val;
      }
    };

    for (const p of product.additionalProperty ?? []) {
      put(p.name, p.value);
    }

    $('dt').each((_, e) =>
      put($(e).text(), $(e).next('dd').text())
    );

    $('tr').each((_, e) => {
      const cells = $(e).children('th,td');

      if (cells.length === 2) {
        put(
          cells.eq(0).text(),
          cells.eq(1).text()
        );
      }
    });

    $('.bsc-item,.bac-item').each((_, e) =>
      put(
        $(e).find('.bac-item-label').text(),
        $(e).find('.bac-item-value').text()
      )
    );

    const extraction = extractProduct(html, url);

    const attr = (...keys) =>
      Object.entries(attrs).find(([k]) =>
        keys.some(
          x => x.toLowerCase() === k.toLowerCase()
        )
      )?.[1] ?? null;

    const offer =
      [].concat(product.offers ?? [])[0] ?? {};

    const min = number(
      offer.lowPrice ?? offer.price
    );

    const max = number(
      offer.highPrice ?? offer.price
    );

    const images = [
      ...new Set(
        []
          .concat(product.image ?? [])
          .map(x =>
            typeof x === 'string' ? x : x?.url
          )
          .filter(Boolean)
          .map(x => new URL(x, url).href)
          .filter(x => x.startsWith('https://'))
      )
    ];

    return {
      kind: 'product',

      ad: {
        source_url: url,
        title: clean(product.name),
        model: extraction.product.model,

        currency:
          typeof offer.priceCurrency === 'string'
            ? offer.priceCurrency
            : null,

        price_min: min,
        price_max: max,

        moq: extraction.conflicts.some(
          x => x.field === 'moq'
        )
          ? null
          : attr('MOQ', 'Min. Order'),

        dimensions_mm:
          extraction.contextual_variants.some(
            x => x.field === 'dimensions'
          )
            ? null
            : dimensions(
                attr(
                  'Specification',
                  'Product Size',
                  'Size'
                )
              ),

        packing_mm: dimensions(
          attr('Package Size')
        ),

        images: extraction.images.length
          ? extraction.images.map(x => x.url)
          : images,

        attributes: {
          ...attrs,
          extraction
        },

        raw_jsonld: blocks,

        content_hash: createHash('sha256')
          .update(html)
          .digest('hex'),

        collected_at: new Date().toISOString()
      }
    };
  }

  /*
   * ============================================================
   * LISTAGEM
   * ============================================================
   */

  const urls = new Map();
  const groups = new Map();

  const fixed48 =
    source.pathname === '/productList';

  const isGroupListing =
    fixed48 &&
    source.searchParams.get('isByGroup') === '1' &&
    Boolean(
      source.searchParams.get(
        'productGroupOrCatId'
      )
    );

  const currentGroupId = isGroupListing
    ? source.searchParams.get(
        'productGroupOrCatId'
      )
    : '';

 const currentPage = fixed48
  ? Math.max(
      1,
      Number(
        source.searchParams.get('pageNumber') ?? 1
      )
    )
  : 1;

  /*
   * O Total pertence à listagem que está sendo processada.
   *
   * Exemplo real:
   * Total 118 2025 New HS Series Products
   */
  const total = number(
    text.match(
      /Total\s+([\d,]+)\s+(?:[^\n]*?\s)?Products/i
    )?.[1]
  );

  /*
   * ============================================================
   * DESCOBERTA DOS LINKS
   * ============================================================
   */

  $('a[href]').each((_, e) => {
    const href = $(e).attr('href');

    if (!href) return;

    let target;

    /*
     * Links JavaScript do menu de grupos.
     *
     * Quando estamos dentro de uma linha específica,
     * por exemplo HS, BF/BL/TN/etc. são apenas navegação
     * da fábrica e NÃO pertencem ao escopo da HS.
     */
    const jsGroup = href.match(
      /^javascript:submitSearchByGroupOrCatId\('([a-zA-Z0-9]+)'\)/
    );

    if (jsGroup) {
      if (isGroupListing) return;

      target = listingUrl(
        origin,
        jsGroup[1]
      );

      const label = clean($(e).text());

      if (label) {
        groups.set(target, label);
        urls.set(target, 'listing');
      }

      return;
    }

    try {
      target = canonicalUrl(href, url);
    } catch {
      return;
    }

    if (new URL(target).origin !== origin) {
      return;
    }

    const path = new URL(target).pathname;

    /*
     * Produtos.
     */
    if (/^\/product\/.+\.html$/.test(path)) {
      urls.set(target, 'product');
      return;
    }

    /*
     * Links de grupos.
     *
     * Em uma listagem de grupo específica, ignoramos
     * grupos irmãos presentes no menu.
     */
    if (
      /^\/product-group\/.+\.html$/.test(path)
    ) {
      if (isGroupListing) return;

      if (fixed48) {
        target = listingUrl(
          origin,
          path.split('/')[2]
        );
      }

      urls.set(target, 'listing');

      const label = clean($(e).text());

      if (label) {
        groups.set(target, label);
      }

      return;
    }

    /*
     * Formato legado de paginação.
     */
    if (
      /^\/product-list-\d+\.html$/.test(path) &&
      !fixed48
    ) {
      urls.set(target, 'listing');
      return;
    }

    /*
     * Outra URL /productList.
     *
     * Em uma listagem de grupo específica, somente URLs
     * do MESMO productGroupOrCatId podem pertencer ao
     * escopo atual.
     */
 if (path === '/productList') {
  const targetUrl = new URL(target);

  if (isGroupListing) {
    const targetGroup =
      targetUrl.searchParams.get(
        'productGroupOrCatId'
      );

    if (targetGroup !== currentGroupId) {
      return;
    }
  }

  const targetPage = Math.max(
    1,
    Number(
      targetUrl.searchParams.get('pageNumber') ?? 1
    )
  );

  if (targetPage <= currentPage) {
    return;
  }

  urls.set(target, 'listing');
}
  });

  /*
   * ============================================================
   * PAGINAÇÃO /productList
   * ============================================================
   *
   * Estratégia operacional:
   * Made-in-China permite 24 / 36 / 48.
   * O coletor usa 48 para reduzir o número de páginas.
   */

  if (fixed48 && total !== null) {
    const count = Math.ceil(total / 48);

    if (count > 10000) {
      throw new Error(
        'Paginação fora do limite de segurança.'
      );
    }

    for (let n = currentPage + 1; n <= count; n++) {
      urls.set(
        listingUrl(
          origin,
          currentGroupId,
          n
        ),
        'listing'
      );
    }
  }

  /*
   * ============================================================
   * PAGINAÇÃO LEGADA /product-list-N.html
   * ============================================================
   */

  const pathname = source.pathname;

  if (/-(\d+)\.html$/.test(pathname)) {
    const pattern =
      pathname.replace(/-\d+\.html$/, '-');

    let last = 1;

    for (const link of urls.keys()) {
      const p = new URL(link).pathname;

      if (
        p.startsWith(pattern) &&
        /^\d+\.html$/.test(
          p.slice(pattern.length)
        )
      ) {
        last = Math.max(
          last,
          Number(
            p
              .slice(pattern.length)
              .split('.')[0]
          )
        );
      }
    }

    if (last > 10000) {
      throw new Error(
        'Paginação fora do limite de segurança; revisão necessária.'
      );
    }

    for (let n = 1; n <= last; n++) {
      urls.set(
        origin + pattern + n + '.html',
        'listing'
      );
    }
  }

  /*
   * Uma listagem só é considerada válida quando realmente
   * contém ao menos um anúncio reconhecido.
   */
  if (
    ![...urls.values()].includes('product')
  ) {
    throw new Error(
      'Listagem sem anúncios reconhecidos; coleta não concluída.'
    );
  }

  /*
   * A página atual já está sendo processada.
   * Não deve ser colocada novamente na fila.
   */
  urls.delete(url);

  return {
    kind: 'listing',

    links: [...urls].map(
      ([url, kind]) => ({
        url,
        kind
      })
    ),

    groups: [...groups].map(
      ([source_url, name]) => ({
        source_url,
        name
      })
    ),

    /*
     * O Total da própria /productList é evidência da
     * cobertura declarada, inclusive quando isByGroup=1.
     */
    expectedAds:
      /^\/product-list-1\.html$/.test(
        pathname
      ) || fixed48
        ? total
        : null,

    factoryName:
      clean(
        $('title')
          .text()
          .split(' - ')
          .find(x =>
            /CO\.|LTD|COMPANY/i.test(x)
          )
      ) || null
  };
}
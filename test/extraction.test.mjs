import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProduct } from '../src/extract-product.mjs';
import { canonicalUrl, parsePage } from '../src/parser.mjs';
import { listingUrl } from '../src/listing-url.mjs';

const origin = 'https://brtw-fitness.en.made-in-china.com';

test('48-item identity retains group and page while removing tracking', () => {
  const url = listingUrl(origin, 'ToLazqByEHcs', 3);

  assert.equal(
    canonicalUrl(url + '&bv_id=tracking'),
    url
  );

  assert.equal(
    new URL(url).searchParams.get('pageSize'),
    '48'
  );

  assert.notEqual(
    url,
    listingUrl(origin, 'rqPGlSkuZDhO', 3)
  );
});

test('group listing stays scoped and returns only remaining pages at 48', () => {
  const groupId = 'ToLazqByEHcs';

  const html =
    '<body>' +
      'Total 118 2025 New HS Series Products' +
      '<a href="/product/A/Press.html">HS01</a>' +
      '<a href="javascript:submitSearchByGroupOrCatId(\'rqPGlSkuZDhO\')">BF</a>' +
    '</body>';

  const remainingPages = page => {
    const result = parsePage(
      html,
      listingUrl(origin, groupId, page)
    );

    const products = result.links.filter(
      x => x.kind === 'product'
    );

    const pages = result.links
      .filter(
        x =>
          x.kind === 'listing' &&
          new URL(x.url).searchParams.get('productGroupOrCatId') ===
            groupId
      )
      .map(x =>
        Number(
          new URL(x.url).searchParams.get('pageNumber')
        )
      )
      .sort((a, b) => a - b);

    assert.equal(products.length, 1);
    assert.equal(result.groups.length, 0);
    assert.equal(result.expectedAds, 118);

    return pages;
  };

  assert.deepEqual(remainingPages(1), [2, 3]);
  assert.deepEqual(remainingPages(2), [3]);
  assert.deepEqual(remainingPages(3), []);
});

test('contextual specifications remain separate and resized photos count once', () => {
  const html =
    '<h1>Press</h1>' +
    '<div class="bsc-item">' +
      '<span class="bac-item-label">Specification</span>' +
      '<span class="bac-item-value">1500*1100*1630 mm</span>' +
    '</div>' +
    '<div class="detail-desc">' +
      '<table>' +
        '<tr>' +
          '<td>Size</td>' +
          '<td>1040*1450*1630mm</td>' +
        '</tr>' +
      '</table>' +
    '</div>' +
    '<img class="J-picImg-zoom-in" src="//image.made-in-china.com/202f0j00ABC/Press.webp">' +
    '<img class="J-picImg-zoom-in" src="//image.made-in-china.com/2f0j00ABC/Press.webp">';

  const data = extractProduct(
    html,
    origin + '/product/A/Press.html'
  );

  assert.equal(
    data.contextual_variants[0].field,
    'dimensions'
  );

  assert.equal(
    data.contextual_variants[0].values.length,
    2
  );

  assert.equal(
    data.contextual_variants[0].values[0].declared_class,
    null
  );

  assert.equal(data.conflicts.length, 0);
  assert.equal(data.images.length, 1);
  assert.equal(data.product.model, null);

  assert.ok(
    data.limitations.some(x =>
      x.includes('duas fotos')
    )
  );
});
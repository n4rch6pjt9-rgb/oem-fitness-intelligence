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

test('conflicting technical claims preserve source blocks without inventing variants', () => {
  const html =
    '<script type="application/ld+json">' +
    '{"@type":"Product","name":"Press"}' +
    '</script>' +
    '<h1>Press</h1>' +
    '<div class="bsc-item">' +
      '<span class="bac-item-label">Specification</span>' +
      '<span class="bac-item-value">1500*1100*1630 mm</span>' +
    '</div>' +
    '<div class="bsc-item">' +
      '<span class="bac-item-label">Weight Stack</span>' +
      '<span class="bac-item-value">96kg+4.6kg</span>' +
    '</div>' +
    '<div class="detail-desc">' +
      '<table>' +
        '<tr>' +
          '<td>Size</td>' +
          '<td>1040*1450*1630mm</td>' +
        '</tr>' +
        '<tr>' +
          '<td>Weight Stack</td>' +
          '<td>100kg</td>' +
        '</tr>' +
      '</table>' +
    '</div>' +
    '<img class="J-picImg-zoom-in" src="//image.made-in-china.com/202f0j00ABC/Press.webp">' +
    '<img class="J-picImg-zoom-in" src="//image.made-in-china.com/2f0j00ABC/Press.webp">';

  const data = extractProduct(
    html,
    origin + '/product/A/Press.html'
  );

  assert.deepEqual(
    data.conflicts.find(x => x.field === 'dimensions'),
    {
      field: 'dimensions',
      values: [
        {
          value: '1500*1100*1630 mm',
          source_section: 'Basic Info.'
        },
        {
          value: '1040*1450*1630mm',
          source_section: 'Product Description / table'
        }
      ]
    }
  );

  const parsed = parsePage(
    html,
    origin + '/product/A/Press.html'
  );

  assert.equal(parsed.kind, 'product');
  assert.equal(parsed.ad.dimensions_mm, null);

  assert.deepEqual(
    parsed.ad.attributes.extraction.conflicts.find(
      x => x.field === 'dimensions'
    ),
    data.conflicts.find(
      x => x.field === 'dimensions'
    )
  );

  assert.deepEqual(
    data.conflicts.find(x => x.field === 'weight_stack'),
    {
      field: 'weight_stack',
      values: [
        {
          value: '96kg+4.6kg',
          source_section: 'Basic Info.'
        },
        {
          value: '100kg',
          source_section: 'Product Description / table'
        }
      ]
    }
  );

  assert.equal(data.contextual_variants.length, 0);

  assert.equal(data.images.length, 1);
  assert.equal(data.product.model, null);

  assert.ok(
    data.limitations.some(x =>
      x.includes('duas fotos')
    )
  );
});

test('HSModel Number and Brand Name are recognized without changing evidence',()=>{
  const html='<h1>Pec Fly</h1><div class="detail-desc"><table><tr><td>HSModel Number</td><td>HS02</td></tr><tr><td>Brand Name</td><td>BRTW</td></tr></table></div>';
  const data=extractProduct(html,origin+'/product/example/example.html');
  assert.equal(data.product.model,'HS02');
  assert.equal(data.product.brand,'BRTW');
  assert.ok(data.specifications.some(row=>row.field==='model'&&row.value==='HS02'&&row.source_section==='Product Description / table'));
});
test('JSON-LD size and description size remain conflicting declarations',()=>{
  const html='<script type="application/ld+json">{"@type":"Product","name":"Chest Press","additionalProperty":[{"name":"Size","value":"1500*1100*1630mm"}]}</script><div class="detail-desc"><table><tr><td>Size</td><td>1040*1450*1630mm</td></tr></table></div>';
  const data=extractProduct(html,origin+'/product/example/example.html');
  const conflict=data.conflicts.find(row=>row.field==='dimensions');
  assert.equal(conflict.values.length,2);
  assert.deepEqual(new Set(conflict.values.map(row=>row.source_section)),new Set(['Product JSON-LD','Product Description / table']));
});
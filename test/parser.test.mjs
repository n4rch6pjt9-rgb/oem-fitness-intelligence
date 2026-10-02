import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl,dimensions,parsePage} from '../src/parser.mjs';
const origin='https://brtw-fitness.en.made-in-china.com';
test('canonical identity removes tracking and rejects unrelated hosts and credentials',()=>{
  assert.equal(canonicalUrl(origin+'/product-list-1.html?pv_id=tracking'),origin+'/product-list-1.html');
  for(const url of ['http://brtw-fitness.en.made-in-china.com','https://127.0.0.1','https://brtw-fitness.en.made-in-china.com.evil.test','https://user:pass@brtw-fitness.en.made-in-china.com','https://brtw-fitness.en.made-in-china.com:444'])assert.throws(()=>canonicalUrl(url));
});
test('dimensions require explicit, consistent units',()=>{
  assert.deepEqual(dimensions('168cm * 92cm * 66cm'),[1680,920,660]);
  assert.deepEqual(dimensions('1465*1795*2005 (mm)'),[1465,1795,2005]);
  assert.equal(dimensions('168*92*66'),null);assert.equal(dimensions('168cm*92mm*66cm'),null);
});
test('listing discovers every numbered page and deduplicates tracked advertisements',()=>{
  const html=`<html><title>Products - SHANDONG BRIGHTWAY FITNESS CO., LTD. - page 1.</title><body>Total 2781 Products<a href="/product/X/Press.html?x=1">Press</a><a href="/product/X/Press.html?x=2">Press</a><a href="/product-list-116.html">116</a><a href="/product-group/A/HS-Series-1.html">HS Series</a><a href="https://other.en.made-in-china.com/product/Y/Fake.html">Other</a></body></html>`;
  const parsed=parsePage(html,origin+'/product-list-1.html');assert.equal(parsed.expectedAds,2781);
  assert.equal(parsed.links.filter(x=>x.kind==='product').length,1);assert.equal(parsed.links.filter(x=>/product-list/.test(x.url)).length,115);assert.equal(parsed.groups[0].name,'HS Series');
});
test('structured product extraction preserves evidence and never fabricates missing model or price',()=>{
  const data={'@graph':[{'@type':'Product',name:'Chest Press',additionalProperty:[{name:'Package Size',value:'168cm*92cm*66cm'}],image:['https://image.made-in-china.com/example.webp']}]};
  const html=`<script type="application/ld+json">${JSON.stringify(data)}</script><dl><dt>Specification</dt><dd>1465*1795*2005 (mm)</dd></dl>`;
  const {ad}=parsePage(html,origin+'/product/X/Press.html');assert.equal(ad.model,null);assert.equal(ad.price_min,null);assert.equal(ad.currency,null);assert.deepEqual(ad.packing_mm,[1680,920,660]);assert.equal(ad.raw_jsonld.length,1);assert.equal(ad.content_hash.length,64);
});
test('blocked or unsupported sources remain failures rather than fabricated products',()=>{
  assert.throws(()=>parsePage('<title>Access Denied</title>',origin+'/product-list-1.html'),/bloqueada/);
  assert.throws(()=>parsePage('<h1>No structured product</h1>',origin+'/product/X/P.html'),/JSON-LD/);
  assert.throws(()=>parsePage('<h1>Empty listing</h1>',origin+'/product-list-1.html'),/sem anúncios/);
});

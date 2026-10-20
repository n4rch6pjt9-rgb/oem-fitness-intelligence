import test from 'node:test';
import assert from 'node:assert/strict';
import {assignedJson,pairedWeights,extractAlibabaCapture} from '../src/alibaba-capture.mjs';
import {alibabaPilotSql} from '../src/alibaba-pilot-sql.mjs';

function fixture() {
  const data={globalData:{product:{productId:123,subject:'Commercial treadmill',moq:5,productBasicProperties:[{attrName:'Model Number',attrValue:'XG-V12E'},{attrName:'Brand',attrValue:'NEW NOBLE'}],price:{productRangePrices:{dollarPriceRangeLow:1100,dollarPriceRangeHigh:1500}},sku:{skuAttrs:[{name:'Size',values:[{id:1,name:'2210x1020x1630mm(unfolded)'}]},{name:'color',values:[{id:2,name:'Silver'},{id:3,name:'Black'}]}]},mediaItems:[]},seller:{companyName:'Fixture Factory',companyId:7,companyProfileUrl:'https://fixture.en.alibaba.com/company_profile.html'},trade:{tradeInfo:{quantityUnitStr:'sets'},logisticInfo:{packagingDesc:'box1:2326x1080x500mm box2:1160x1050x420mm G.W./N.W.: 238kgs/274kgs'}}}};
  return {html:'<script>window.detailData = '+JSON.stringify(data)+';</script>',sourceUrl:'https://www.alibaba.com/product-detail/Treadmill_123.html?tracking=1',shopHtml:'<title>All products - Fixture Factory</title>',weightRule:'larger_is_gross',capturedAt:'2026-10-20T00:00:00Z'};
}
test('captured JSON is parsed without executing page JavaScript',()=>{
  assert.deepEqual(assignedJson('throw Error(); window.detailData={"text":"} \\\" {"};','detailData'),{text:'} " {'});
  assert.throws(()=>assignedJson('window.detailData={run:evil()}','detailData'));
});
test('weight interpretation requires the explicit operator rule and preserves original order',()=>{
  const raw='G.W./N.W.: 238kgs/274kgs';
  assert.equal(pairedWeights(raw),null);
  const parsed=pairedWeights(raw,'larger_is_gross');
  assert.equal(parsed.net_kg,238);assert.equal(parsed.gross_kg,274);assert.equal(parsed.original,raw);
  assert.equal(pairedWeights('G.W./N.W.: 0kgs/274kgs','larger_is_gross'),null);
});
test('capture separates external ID, model, option IDs and packaging boxes',()=>{
  const result=extractAlibabaCapture(fixture());
  assert.equal(result.ad.model,'XG-V12E');assert.equal(result.ad.attributes.external_product_id,'123');
  assert.equal(result.ad.source_url,'https://www.alibaba.com/product-detail/Treadmill_123.html');
  assert.deepEqual(result.ad.dimensions_mm,[2210,1020,1630]);assert.equal(result.ad.packing_mm,null);
  assert.equal(result.ad.attributes.packaging.boxes.length,2);assert.equal(result.ad.attributes.product_options.length,2);
  assert.equal(result.ad.attributes.extraction.contextual_variants.length,0);
  assert.equal(result.ad.attributes.extraction.usage_classification.declared_class,'commercial');
  assert.equal(result.factory.crawl_enabled,false);assert.equal(result.ad.price_max,1500);
});
test('wrong supplier, product ID and unsafe source fail before persistence',()=>{
  assert.throws(()=>extractAlibabaCapture({...fixture(),shopHtml:'<title>Other Factory</title>'}));
  assert.throws(()=>extractAlibabaCapture({...fixture(),sourceUrl:'https://www.alibaba.com/product-detail/Treadmill_456.html'}));
  assert.throws(()=>extractAlibabaCapture({...fixture(),sourceUrl:'https://www.alibaba.com.evil.test/product-detail/Treadmill_123.html'}));
});
test('buyer session objects and recommendation records are excluded',()=>{
  const capture=fixture();
  capture.html=capture.html.replace('"globalData":{','"globalData":{"buyer":{"token":"PRIVATE_FIXTURE_TOKEN"},"recommendations":[{"model":"OTHER-MODEL"}],');
  const result=extractAlibabaCapture(capture);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE_TOKEN'));
  assert.ok(!JSON.stringify(result).includes('OTHER-MODEL'));
});
test('captured quotes and SQL delimiters cannot escape the generated pilot statement',()=>{
  const result=extractAlibabaCapture(fixture());
  result.ad.title="Untrusted '$alibaba$'; select 1;";
  const sql=alibabaPilotSql(result);
  assert.ok(!sql.includes(result.ad.title));
  const encoded=sql.match(/decode\('([0-9a-f]+)','hex'\)/)[1];
  assert.equal(JSON.parse(Buffer.from(encoded,'hex').toString('utf8')).ad.title,result.ad.title);
  assert.equal(sql.match(/\$alibaba\$/g).length,2);
});

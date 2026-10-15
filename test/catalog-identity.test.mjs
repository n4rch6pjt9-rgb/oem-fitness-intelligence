import test from 'node:test';
import assert from 'node:assert/strict';
import { modelKey, familyCode, catalogHierarchy } from '../src/catalog-identity.mjs';
import { parsePage, dimensions } from '../src/parser.mjs';
import { resolveMeasurements } from '../src/measurements.mjs';
import { createCatalogApi } from '../src/catalog-api.mjs';
import { createClient } from '@supabase/supabase-js';

const origin = 'https://brtw-fitness.en.made-in-china.com';
test('global identity groups TN114 under TN without conflating suffixes, zeroes or factories', () => {
  assert.equal(modelKey(' tn 114 '), 'TN114');
  assert.equal(familyCode('TN114'), 'TN');
  assert.equal(familyCode('AB99-X'), 'AB');
  assert.equal(familyCode('Model / Special'), null);
  assert.notEqual(modelKey('HS01'), modelKey('HS1'));
  assert.notEqual(modelKey('TN114-A'), modelKey('TN114'));
  assert.equal(modelKey(' '), null);
});

const spec = (value, field='dimensions') => ({field,value,source_section:'Product Description / table'});
const extraction = specifications => ({product:{model:'TN114'},specifications});
test('same configuration: largest volume is mounted, smallest is packing; raw evidence is immutable', () => {
  const input = extraction([spec('100*80*120 cm'),spec('1600*1000*1800 mm')]);
  const original = structuredClone(input);
  const result = resolveMeasurements(input, dimensions);
  assert.deepEqual(result.dimensions_mm,[1600,1000,1800]);
  assert.deepEqual(result.packing_mm,[1000,800,1200]);
  assert.equal(result.method,'same_configuration_volume');
  assert.deepEqual(input, original);
  assert.deepEqual(result.evidence.map(x => x.value),original.specifications.map(x => x.value));
});
test('equal volumes, invalid units, more than two sizes and unknown model never imply mounted/packing', () => {
  for (const input of [
    extraction([spec('1*2*3 m'),spec('3*2*1 m')]),
    extraction([spec('100*200*300'),spec('200*300*400 mm')]),
    extraction([spec('1*2*3 m'),spec('2*3*4 m'),spec('3*4*5 m')]),
    {specifications:[spec('1*2*3 m'),spec('2*3*4 m')]}
  ]) assert.equal(resolveMeasurements(input,dimensions).dimensions_mm,null);
});
test('different usage/configuration evidence prevents volume inference and never generates variants', () => {
  for (const addition of [
    {usage_classification:{declared_class_versions:['commercial','light_commercial']}},
    {contextual_variants:[{field:'weight_stack'}]},
    {conflicts:[{field:'model'}]}
  ]) {
    const result=resolveMeasurements({...extraction([spec('1*2*3 m'),spec('2*3*4 m')]),...addition},dimensions);
    assert.equal(result.dimensions_mm,null);
    assert.equal(result.method,'requires_review');
  }
});
test('full ingestion normalizes equivalent model declarations and retains raw measurements and source labels', () => {
  const html='<h1>Commercial press</h1><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Commercial press',additionalProperty:[{name:'Model Number',value:'TN 114'},{name:'Size',value:'1*2*3 m'}]})+'</script><div class="detail-desc"><table><tr><td>Model Number</td><td>TN114</td></tr><tr><td>Size</td><td>2*3*4 m</td></tr></table></div>';
  const {ad}=parsePage(html,origin+'/product/A/Press.html');
  assert.equal(ad.model,'TN114');
  assert.equal(ad.attributes.extraction.conflicts.some(x=>x.field==='model'),false);
  assert.ok(ad.attributes.extraction.specifications.some(x=>x.value==='TN 114'));
  assert.deepEqual(ad.dimensions_mm,[2000,3000,4000]);
  assert.deepEqual(ad.packing_mm,[1000,2000,3000]);
  assert.equal(ad.attributes.extraction.contextual_variants.length,0);
});
test('SKU endpoint validates inputs, scopes factory/line and delegates pagination to the database',async()=>{
  const factory='11111111-1111-1111-1111-111111111111';
  const calls=[];
  const db=createClient('https://catalog.test','test-key',{global:{fetch:async(input,init)=>{
    const url=new URL(input);calls.push({url,body:init?.body});
    if(url.pathname.endsWith('oem_factories'))return Response.json({id:factory});
    if(url.pathname.endsWith('oem_lines'))return Response.json(null);
    if(url.pathname.endsWith('oem_catalog_skus'))return Response.json({items:[],total:29,page:2,size:24});
    throw Error('Unexpected query');
  }}});
  const api=createCatalogApi(db);
  assert.equal((await api.skus(factory,{page:'2',q:'TN114'})).total,29);
  assert.deepEqual(JSON.parse(calls.at(-1).body),{target_factory:factory,page_number:2,search_text:'TN114',target_line:null,archived:false});
  for(const input of [{page:['1']},{page:'0'},{q:{}},{line_id:'bad'},{deleted:'yes'}])await assert.rejects(api.skus(factory,input));
  await assert.rejects(api.skus(factory,{line_id:factory}),e=>e.status===404);
  assert.equal(await catalogHierarchy({},{}),null);
});

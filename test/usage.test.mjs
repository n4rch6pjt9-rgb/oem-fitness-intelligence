import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyUsage} from '../src/classify-usage.mjs';
test('studio and condo applications never imply light commercial',()=>{const data=classifyUsage('Chest Press',[{field:'application',value:'Studio / Condominium',source_section:'Basic Info.'}]);assert.equal(data.declared_class,null);assert.deepEqual(data.classified_applications,['studio','condominium']);assert.equal(data.duty_rating,null);});
test('light commercial wording does not also classify as commercial',()=>{const data=classifyUsage('Light Commercial Chest Press',[]);assert.equal(data.declared_class,'light_commercial');assert.deepEqual(data.declared_class_versions,['light_commercial']);assert.equal(data.verification_status,'supplier_declaration');});
test('conflicting classes retain their separate evidence',()=>{const data=classifyUsage('Commercial Grade Chest Press',[{field:'use_class',value:'Light commercial',source_section:'Basic Info.'}]);assert.equal(data.declared_class,null);assert.equal(data.conflict,true);assert.equal(data.evidence.length,2);});
test('negative wording is reviewed and price does not determine class',()=>{const data=classifyUsage('Not for commercial use',[{field:'price',value:'Commercial discount',source_section:'Overview'}]);assert.equal(data.declared_class,null);assert.equal(data.evidence[0].requires_review,true);});


test('explicit commercial use in use, function and serie retains source evidence',()=>{
 for(const [field,value] of [['use','Commercial Gym Use'],['function','Commercial use'],['serie','equipamento de ginásio comercial']]){
  const row={field,value,source_section:'Basic Info.'};const result=classifyUsage('Equipment',[row]);
  assert.equal(result.declared_class,'commercial');assert.equal(result.evidence[0].field,field);assert.equal(result.evidence[0].value,value);assert.equal(result.evidence[0].source_section,row.source_section);
 }
});
test('additional usage fields retain light commercial and reject negative claims',()=>{
 for(const field of ['use','function','serie']){
  assert.deepEqual(classifyUsage('Equipment',[{field,value:'Light Commercial',source_section:'Basic Info.'}]).declared_class_versions,['light_commercial']);
  assert.equal(classifyUsage('Equipment',[{field,value:'Not for commercial use',source_section:'Basic Info.'}]).declared_class,null);
 }
});
test('certification count, image claims and series codes do not determine usage',()=>{
 for(const value of ['CE ISO SGS','IAF CNAS ISO CE','Commercial certificate']){
  assert.equal(classifyUsage('Equipment',[{field:'declared_certifications',value,source_section:'Basic Info.'},{field:'images',value:'Commercial',source_section:'gallery'},{field:'serie',value:'TN',source_section:'Basic Info.'}]).declared_class,null);
 }
});

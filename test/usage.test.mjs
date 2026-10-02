import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyUsage} from '../src/classify-usage.mjs';
test('studio and condo applications never imply light commercial',()=>{const data=classifyUsage('Chest Press',[{field:'application',value:'Studio / Condominium',source_section:'Basic Info.'}]);assert.equal(data.declared_class,null);assert.deepEqual(data.classified_applications,['studio','condominium']);assert.equal(data.duty_rating,null);});
test('light commercial wording does not also classify as commercial',()=>{const data=classifyUsage('Light Commercial Chest Press',[]);assert.equal(data.declared_class,'light_commercial');assert.deepEqual(data.declared_class_versions,['light_commercial']);assert.equal(data.verification_status,'supplier_declaration');});
test('conflicting classes retain their separate evidence',()=>{const data=classifyUsage('Commercial Grade Chest Press',[{field:'use_class',value:'Light commercial',source_section:'Basic Info.'}]);assert.equal(data.declared_class,null);assert.equal(data.conflict,true);assert.equal(data.evidence.length,2);});
test('negative wording is reviewed and price does not determine class',()=>{const data=classifyUsage('Not for commercial use',[{field:'price',value:'Commercial discount',source_section:'Overview'}]);assert.equal(data.declared_class,null);assert.equal(data.evidence[0].requires_review,true);});

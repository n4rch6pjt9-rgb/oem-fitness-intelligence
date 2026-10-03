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

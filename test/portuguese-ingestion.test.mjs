import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {canonicalUrl,belongsToFactory} from '../src/parser.mjs';
import {createCrawler} from '../src/crawler.mjs';
import {createAssistedCollection} from '../src/assisted-collection.mjs';
const domain='brtw-fitness.en.made-in-china.com';
const url='https://pt.made-in-china.com/co_brtw-fitness/product_Machine_abc.html';
const line_url='https://pt.made-in-china.com/co_brtw-fitness/product-group/tn_series_1.html';
const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Machine',additionalProperty:[{name:'N ° de Modelo.',value:'TN91'}]})+'</script>';
function fixture() {
 const writes=[];
 const db=createClient('https://test.invalid','key',{global:{fetch:async(input,options)=>{
  const table=new URL(input).pathname.split('/').at(-1);
  if(table==='oem_factories')return Response.json({id:'f',domain,crawl_enabled:false});
  if(options.method==='GET')return new Response(null,{status:204});
  writes.push({table,body:JSON.parse(options.body)});return Response.json({id:'p'});
 }}});
 return {db,writes};
}
test('Portuguese URLs retain source identity and reject unsafe or unscoped hosts',()=>{
 assert.equal(canonicalUrl(url+'?tracking=1#x'),url);
 assert.equal(belongsToFactory(url,domain),true);
 assert.equal(belongsToFactory(url.replace('co_brtw-fitness/','co_other/'),domain),false);
 for(const bad of [url.replace('https:','http:'),url.replace('pt.made-in-china.com','pt.made-in-china.com.evil.test'),url.replace('https://','https://user:pass@'),url.replace('/co_brtw-fitness/','/'),url.replace('product_Machine_abc.html','company.html')])assert.throws(()=>canonicalUrl(bad));
});
test('crawler enqueue accepts Portuguese source only for its supplier, without cross-factory writes',async()=>{
 const {db,writes}=fixture();const crawler=createCrawler(db);
 await crawler.enqueue('f',url,'product');assert.equal(writes[0].body.url,url);
 const count=writes.length;await assert.rejects(crawler.enqueue('f',url.replace('co_brtw-fitness/','co_other/'),'product'));assert.equal(writes.length,count);
});
test('assisted Portuguese preview and save use normal persistence and reject another supplier or HTML',async()=>{
 const {db}=fixture();const saved=[];
 const api=createAssistedCollection(db,async(...args)=>{saved.push(args);return {id:'a'};});
 const body={url,line_url,line_name:'TN source group',html};
 const preview=await api.preview('f','s',body);assert.equal(saved.length,0);
 await api.save('f','s',preview.token);assert.equal(saved[0][1].source_url,url);assert.equal(saved[0][1].model,'TN91');
 await assert.rejects(api.preview('f','s',{...body,url:url.replace('co_brtw-fitness/','co_other/')}));
 await assert.rejects(api.preview('f','s',{...body,line_url:line_url.replace('co_brtw-fitness/','co_other/')}));
 await assert.rejects(api.preview('f','s',{...body,html:'<link rel="canonical" href="'+url.replace('abc.html','other.html')+'">'+html}));
});

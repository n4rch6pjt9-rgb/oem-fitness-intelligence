import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';

const domain='brtw-fitness.en.made-in-china.com';
const product='https://pt.made-in-china.com/co_brtw-fitness/product_Machine_abc.html';

test('factory registration rejects Portuguese source URLs before any database call',async()=>{
 const runtime=createApp({TEST_AUTH_BYPASS:'true',APP_ORIGIN:'http://localhost:3000'});
 const server=runtime.app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 try {
  // No database is configured: reaching persistence would produce HTTP 500.
  for(const url of [product,product.replace('co_brtw-fitness/','co_other/'),'https://pt.made-in-china.com/co_brtw-fitness/product-group/tn_series_1.html']) {
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/factories',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({url})});
   assert.equal(response.status,400);assert.match((await response.json()).error,/nome\.en\.made-in-china\.com/);
  }
 }finally{runtime.close();await new Promise(resolve=>server.close(resolve));}
});

test('English storefront registration preserves its supplier domain and enqueues its listing',async()=>{
 const nativeFetch=globalThis.fetch;const calls=[];
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input);
  if(url.hostname!=='registration.test')return nativeFetch(input,options);
  calls.push({table:url.pathname.split('/').at(-1),method:options.method??'GET',body:options.body?JSON.parse(options.body):null});
  const request=calls.at(-1);
  if(request.table==='oem_factories') {
   if(url.searchParams.get('select')==='domain')return Response.json({domain});
   if(request.method==='GET')return new Response(null,{status:204});
   return Response.json({id:'factory-fixture',domain,source_url:request.body.source_url});
  }
  if(request.method==='GET')return new Response(null,{status:204});
  return Response.json({id:'page-fixture'});
 };
 const runtime=createApp({SUPABASE_URL:'https://registration.test',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture',TEST_AUTH_BYPASS:'true',APP_ORIGIN:'http://localhost:3000'});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{
  const response=await nativeFetch('http://127.0.0.1:'+server.address().port+'/api/factories',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({url:'https://'+domain})});
  assert.equal(response.status,201);assert.equal((await response.json()).domain,domain);
  const inserted=calls.find(c=>c.table==='oem_factories'&&c.method==='POST');assert.equal(inserted.body.domain,domain);
  const queued=calls.find(c=>c.table==='oem_pages'&&c.method==='POST');assert.ok(queued);assert.equal(new URL(queued.body.url).hostname,domain);
 }finally{runtime.close();await new Promise(resolve=>server.close(resolve));globalThis.fetch=nativeFetch;}
});

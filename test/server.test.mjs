import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
test('unconfigured app exposes health but denies all catalog access and cross-origin writes',async()=>{
  const runtime=createApp({});const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const health=await(await fetch(base+'/api/health')).json();assert.equal(health.configured,false);
    assert.equal((await fetch(base+'/api/factories')).status,401);
    for(const path of ['/api/clients','/api/identification/cnpj/00000000000000','/api/classification/ncm/95069100','/api/siscomex/status','/api/siscomex/products'])assert.equal((await fetch(base+path)).status,401);
    assert.equal((await fetch(base+'/api/factories',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'})).status,403);
    const home=await fetch(base);assert.equal(home.status,200);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  }finally{runtime.close();await new Promise(r=>server.close(r));}
});

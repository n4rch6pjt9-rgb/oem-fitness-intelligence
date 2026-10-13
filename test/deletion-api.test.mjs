import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createDeletionApi} from '../src/deletion-api.mjs';
import {createApp} from '../server.mjs';
const id='11111111-1111-1111-1111-111111111111';
const parent='22222222-2222-2222-2222-222222222222';
function fixture(blocked=false){
  const calls=[];
  const db=createClient('https://deletion.test','key',{auth:{persistSession:false},global:{fetch:async(input,options)=>{
    const url=new URL(input);calls.push({url,options});
    return Response.json(blocked?null:{id,deleted_at:JSON.parse(options.body).deleted_at});
  }}});
  return {api:createDeletionApi(db),calls};
}
test('media archive is scoped to product and restore preserves file without Storage calls',async()=>{
  const {api,calls}=fixture();
  assert.ok((await api.media(parent,id)).deleted_at);
  assert.equal(calls[0].url.searchParams.get('ad_id'),'eq.'+parent);
  assert.equal(calls[0].url.searchParams.get('deleted_at'),'is.null');
  assert.equal((await api.media(parent,id,true)).deleted_at,null);
  assert.equal(calls[1].url.searchParams.get('deleted_at'),'not.is.null');
  assert.ok(calls.every(call=>call.options.method==='PATCH'));
});
test('running queue items cannot be archived and are scoped to selected factory',async()=>{
  const {api,calls}=fixture(true);
  await assert.rejects(api.queue(parent,id),error=>error.status===409);
  assert.equal(calls[0].url.searchParams.get('state'),'neq.running');
  assert.equal(calls[0].url.searchParams.get('factory_id'),'eq.'+parent);
});
test('invalid identifiers never reach the database',async()=>{
  const {api,calls}=fixture();
  await assert.rejects(api.product('invalid'),error=>error.status===400);
  assert.equal(calls.length,0);
});
test('deletion routes require operator authentication',async t=>{
  const runtime=createApp({});
  const server=runtime.app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{runtime.close();await new Promise(resolve=>server.close(resolve));});
  const base='http://127.0.0.1:'+server.address().port;
  for(const route of ['/api/ads/'+id,'/api/ads/'+id+'/media/'+parent,'/api/factories/'+id+'/pages/'+parent]){
    assert.equal((await fetch(base+route,{method:'DELETE',headers:{Origin:'http://localhost:3000'}})).status,401);
  }
});
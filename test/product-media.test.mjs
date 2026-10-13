import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateMedia,registerMediaRoutes,mediaUploader} from '../src/product-media.mjs';
const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
test('rejects mismatched content, categories and oversized images', () => {
  assert.doesNotThrow(() => validateMedia(png,'image/png','dimensions'));
  assert.throws(() => validateMedia(Buffer.from('<html>'),'image/png','photo'));
  assert.throws(() => validateMedia(png,'image/png','video'));
  assert.throws(() => validateMedia(png,'image/png','certificates'));
  assert.throws(() => validateMedia(Buffer.alloc(10*1024*1024+1),'image/png','photo'));
  assert.throws(() => validateMedia(png,'constructor','photo'));
});
test('rejects invalid upload metadata before accessing the database', async t => {
  const app=express();
  const db={from(){throw new Error('Database must not be accessed');}};
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
  registerMediaRoutes(app,db,wrap);
  app.use((error,req,res,next)=>res.status(error.status??500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ads/a/media?category=photo',{
    method:'POST',headers:{'Content-Type':'image/png'},body:png,
  });
  assert.equal(response.status,400);
});
test('removes uploaded object when metadata persistence fails', async t => {
  const removed=[];
  const db={
    storage:{from(){return {
      async upload(){return {data:{path:'stored'},error:null};},
      async remove(paths){removed.push(...paths);return {data:[],error:null};},
    };}},
    from(table){
      if(table==='oem_ads')return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:'ad',factory_id:'factory'},error:null};}};
      return {insert(){return this;},select(){return this;},async single(){return {data:null,error:new Error('Persistence failed')};}};
    },
  };
  const app=express();
  app.use((req,res,next)=>{req.operator={id:'a9fd6a29-49ba-42d9-8067-51c7b4d23e0f'};next();});
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
  registerMediaRoutes(app,db,wrap);
  app.use((error,req,res,next)=>res.status(500).json({error:'Failed'}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ads/ad/media?category=photo&caption=Equipment',{
    method:'POST',headers:{'Content-Type':'image/png'},body:png,
  });
  assert.equal(response.status,500);
  assert.equal(removed.length,1);
  assert.match(removed[0],/^factory\/ad\/.*\.png$/);
});

test('test uploads require a configured UUID and preserve authenticated attribution', () => {
  const id='a9fd6a29-49ba-42d9-8067-51c7b4d23e0f';
  assert.equal(mediaUploader('local-test-operator',id),id);
  assert.equal(mediaUploader(id,null),id);
  assert.throws(()=>mediaUploader('local-test-operator',null));
  assert.throws(()=>mediaUploader('local-test-operator','invalid'));
});

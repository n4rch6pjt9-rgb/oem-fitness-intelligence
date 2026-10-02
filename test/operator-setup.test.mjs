import test from 'node:test';
import assert from 'node:assert/strict';
import {registerOperatorSetup} from '../src/operator-setup.mjs';
test('configuração inicial exige email autorizado, acesso local e nenhum operador configurado',async()=>{
  for(const [env,allowed,remoteAddress] of [[{},new Set(),'127.0.0.1'],[{OEM_SETUP_EMAIL:'fixture@example.test'},new Set(['existing']),'127.0.0.1'],[{OEM_SETUP_EMAIL:'fixture@example.test'},new Set(),'203.0.113.1']]){
    const routes=new Map();const app={get:(path,handler)=>routes.set('get',handler),post:(path,handler)=>routes.set('post',handler)};
    const db={auth:{admin:{listUsers:()=>{throw new Error('Should not access database');}}}};
    registerOperatorSetup(app,db,env,allowed,handler=>handler,()=>{});
    const req={socket:{remoteAddress},body:{password:'fixture-password'}};let response;
    routes.get('get')(req,{json:value=>{response=value;}});assert.equal(response.enabled,false);
    await assert.rejects(routes.get('post')(req,{}),error=>error.status===403);
  }
});
test('não cria outro acesso se o projeto já possui uma conta',async()=>{
  const routes=new Map();const app={get:(path,handler)=>routes.set('get',handler),post:(path,handler)=>routes.set('post',handler)};
  const db={auth:{admin:{listUsers:async()=>({data:{users:[{id:'existing'}]},error:null}),createUser:()=>{throw new Error('Should not create user');}}}};
  registerOperatorSetup(app,db,{OEM_SETUP_EMAIL:'fixture@example.test'},new Set(),handler=>handler,()=>{});
  const req={socket:{remoteAddress:'127.0.0.1'},body:{password:'fixture-password'}};
  await assert.rejects(routes.get('post')(req,{}),error=>error.status===409);assert.equal(req.body.password,undefined);
});

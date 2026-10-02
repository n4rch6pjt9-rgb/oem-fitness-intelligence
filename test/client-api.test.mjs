import test from 'node:test';
import assert from 'node:assert/strict';
import {clientInput,brasilLookup,registerClientRoutes} from '../src/client-api.mjs';
test('cadastro rejeita campos de acesso e valida campos obrigatórios',()=>{
  assert.throws(()=>clientInput({cnpj:'123',legal_name:'Teste'}));
  assert.throws(()=>clientInput({cnpj:'00000000000000',legal_name:'Teste',owner_id:'other'}));
  assert.throws(()=>clientInput({cnpj:'00000000000000',legal_name:''}));
  assert.equal(clientInput({cnpj:'00.000.000/0000-00',legal_name:' Teste '}).legal_name,'Teste');
});
test('consulta, edição e arquivamento limitam acesso ao operador da sessão',async()=>{
  const routes=new Map();const app=Object.fromEntries(['get','post','put','delete'].map(method=>[method,(path,handler)=>routes.set(method+path,handler)]));
  const calls=[];
  const query={then(resolve){resolve({data:null,error:null});}};
  for(const method of ['select','eq','is','update','maybeSingle'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
  const db={from:()=>query};registerClientRoutes(app,db,handler=>handler);
  const req={operator:{id:'owner-from-session'},params:{id:'requested-id'},body:{cnpj:'00000000000000',legal_name:'Teste'}};
  for(const key of ['get/api/clients/:id','put/api/clients/:id','delete/api/clients/:id']){
    calls.length=0;
    await assert.rejects(routes.get(key)(req,{}),error=>error.status===404);
    assert.ok(calls.some(([method,field,value])=>method==='eq'&&field==='owner_id'&&value==='owner-from-session'));
    assert.ok(calls.some(([method,field,value])=>method==='eq'&&field==='id'&&value==='requested-id'));
  }
});
test('consulta usa host fixo, preserva falhas e não inventa dados',async()=>{
  let url;
  const result=await brasilLookup('ncm','9506.91.00',async(value,options)=>{url=value;assert.equal(options.headers['User-Agent'],'OEM-Supplier-Gym/0.1');return {ok:true,json:async()=>({codigo:'9506.91.00',descricao:'Descrição de teste'})};});
  assert.equal(url,'https://brasilapi.com.br/api/ncm/v1/95069100');assert.equal(result.description,'Descrição de teste');
  await assert.rejects(brasilLookup('cnpj','00000000000000',async()=>({ok:false,status:404})),error=>error.status===404);
  await assert.rejects(brasilLookup('cnpj','00000000000000',async()=>({ok:false,status:403})),error=>error.status===502&&/BrasilAPI recusou/.test(error.message)&&/preservados/.test(error.message));
  await assert.rejects(brasilLookup('ncm','https://evil.test',async()=>{throw new Error('Não deveria consultar');}),error=>error.status===400);
  await assert.rejects(brasilLookup('ncm','95069100',async()=>({ok:true,json:async()=>({})})),error=>error.status===502);
});

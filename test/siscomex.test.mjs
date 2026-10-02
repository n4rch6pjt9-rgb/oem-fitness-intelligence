import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSiscomex,connectionError} from '../src/siscomex.mjs';

test('diagnóstico diferencia PFX, senha, confiança TLS e rede sem expor o erro bruto',()=>{
  assert.match(connectionError({message:'unsupported'}).message,/criptografia/);
  assert.match(connectionError({message:'mac verify failure'}).message,/senha/i);
  assert.match(connectionError({code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'}).message,/cadeia de confiança/);
  assert.match(connectionError({code:'ERR_SSL_SSL\/TLS_ALERT_HANDSHAKE_FAILURE'}).message,/negociação TLS/);
  assert.equal(connectionError({code:'ETIMEDOUT'}).status,503);
  assert.doesNotMatch(connectionError({message:'secret-fixture'}).message,/secret-fixture/);
});

test('certificado ausente não cria sessão nem permite consultas',async()=>{
  const connector=createSiscomex({});
  try{const req={operator:{id:'operator'},sisSession:'session',body:{passphrase:'not-a-real-secret'}};assert.equal(connector.status(req).configured,false);await assert.rejects(connector.connect(req),error=>error.status===503);await assert.rejects(connector.products(req),error=>error.status===403);}
  finally{connector.close();}
});
test('sessão A1 isola operador e navegador, oculta tokens e limita a empresa',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'oem-siscomex-'));const path=join(dir,'fixture.pfx');await writeFile(path,'fixture-not-a-certificate');
  const calls=[];let consultations=0;
  const request=async(agent,host,path,method,headers)=>{
    calls.push({host,path,method,headers});
    return {status:200,headers:{'set-token':'fixture-jwt','x-csrf-token':method==='POST'?'fixture-csrf':'fixture-renewed','x-csrf-expiration':String(Date.now()+3600000)},body:method==='POST'?null:[{denominacao:'Fixture'}]};
  };
  const connector=createSiscomex({SISCOMEX_A1_PATH:path,SISCOMEX_OPERATOR_ID:'owner',SISCOMEX_COMPANY_ROOT:'12345678',SISCOMEX_ENVIRONMENT:'validation'},request);
  const req={operator:{id:'owner'},sisSession:'browser-a',body:{passphrase:'fixture-password'},query:{ncm:'9506.91.00'}};
  try{
    const status=await connector.connect(req);assert.equal(status.connected,true);assert.equal(req.body.passphrase,undefined);assert.doesNotMatch(JSON.stringify(status),/fixture-jwt|fixture-csrf|fixture-password/);
    assert.equal(connector.status({...req,sisSession:'browser-b'}).connected,false);
    assert.equal(connector.status({...req,operator:{id:'other'}}).connected,false);
    await connector.products(req);await connector.products(req);
    assert.equal(calls[0].host,'val.portalunico.siscomex.gov.br');assert.equal(calls[0].headers['Role-Type'],'IMPEXP');
    assert.match(calls[1].path,/cpfCnpjRaiz=12345678/);assert.match(calls[1].path,/ncm=95069100/);assert.equal(calls[2].headers['X-CSRF-Token'],'fixture-renewed');
    await assert.rejects(connector.products({...req,query:{cpfCnpjRaiz:'87654321'}}),error=>error.status===400);
    connector.disconnect(req);assert.equal(connector.status(req).connected,false);await assert.rejects(connector.connect({...req,body:{passphrase:'fixture-password'}}),error=>error.status===429);
  }finally{connector.close();await rm(dir,{recursive:true});}
});

import https from 'node:https';
import {readFile,stat} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {InputError,documentCode} from './client-api.mjs';

const hosts={production:'portalunico.siscomex.gov.br',validation:'val.portalunico.siscomex.gov.br'};
export function connectionError(error){
  if(error instanceof InputError)return error;
  const code=error?.code??'';
  if(code==='ENOENT')return new InputError('O arquivo A1 não foi encontrado no caminho configurado.',502);
  if(code==='EACCES'||code==='EPERM')return new InputError('O servidor não tem permissão para ler o arquivo A1 ou acessar a rede.',502);
  if(code==='ERR_OSSL_UNSUPPORTED'||/^unsupported$/i.test(error?.message??''))return new InputError('A criptografia do arquivo PFX não é compatível com este runtime. É necessário verificar o formato de exportação do A1.',502);
  if(/mac verify failure|mac verify error|bad decrypt/i.test(error?.message??''))return new InputError('A senha não desbloqueou o PFX, ou o arquivo está corrompido. Confira a senha do certificado.',502);
  if(['UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT'].includes(code))return new InputError('O servidor não reconheceu a cadeia de confiança TLS. A validação do certificado continua habilitada.',502);
  if(code.includes('HANDSHAKE_FAILURE')||code.includes('CERTIFICATE_REQUIRED')||code.includes('BAD_CERTIFICATE'))return new InputError('O Siscomex recusou o certificado durante a negociação TLS. Confira validade, cadeia e compatibilidade do A1.',502);
  if(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT'].includes(code)||error?.message==='Timeout')return new InputError('Não foi possível alcançar o Siscomex pela rede. Tente novamente mais tarde.',503);
  return new InputError('Falha de conexão A1 sem causa identificada. O certificado não foi autenticado.',502);
}
function destroyAgent(agent){if(!agent)return;agent.destroy();agent.options.pfx?.fill(0);agent.options.passphrase=undefined;}
function exchange(agent,host,path,method,headers={}){
  return new Promise((resolve,reject)=>{
    const request=https.request({hostname:host,path,method,agent,headers:{Accept:'application/json',...headers}},response=>{
      const chunks=[];let size=0;
      response.on('data',chunk=>{size+=chunk.length;if(size>2_000_000)request.destroy(new Error('Response limit'));else chunks.push(chunk);});
      response.on('error',reject);
      response.on('end',()=>{
        let body=null;
        try{const text=Buffer.concat(chunks).toString('utf8');body=text?JSON.parse(text):null;}catch{return reject(new InputError('Resposta inesperada do Siscomex.',502));}
        resolve({status:response.statusCode,headers:response.headers,body});
      });
    });
    request.setTimeout(15000,()=>request.destroy(new Error('Timeout')));request.on('error',reject);request.end();
  });
}

export function createSiscomex(env,request=exchange){
  const connections=new Map(),attempts=new Map();
  const environment=env.SISCOMEX_ENVIRONMENT??'validation';
  const configured=!!(hosts[environment]&&env.SISCOMEX_A1_PATH&&isAbsolute(env.SISCOMEX_A1_PATH)&&env.SISCOMEX_OPERATOR_ID&&/^\d{8}$/.test(env.SISCOMEX_COMPANY_ROOT??''));
  const authorized=req=>configured&&req.operator.id===env.SISCOMEX_OPERATOR_ID;
  const key=req=>req.sisSession;
  function disconnect(req){const connection=connections.get(key(req));destroyAgent(connection?.agent);connections.delete(key(req));}
  function current(req){const value=connections.get(key(req));if(value&&value.expiresAt<=Date.now()){disconnect(req);return null;}return value;}
  function status(req){const connection=authorized(req)?current(req):null;return {configured:authorized(req),connected:!!connection,environment,company_root:authorized(req)?env.SISCOMEX_COMPANY_ROOT:null,expires_at:connection?new Date(connection.expiresAt).toISOString():null};}
  function tokens(connection,headers){
    const token=headers['set-token'],csrf=headers['x-csrf-token'],expires=Number(headers['x-csrf-expiration']);
    if(token)connection.token=token;
    if(csrf)connection.csrf=csrf;
    if(Number.isFinite(expires)&&expires>Date.now())connection.expiresAt=expires;
  }
  async function connect(req){
    if(!authorized(req))throw new InputError('Configure o certificado A1, o operador e a empresa autorizada no servidor.',503);
    if(current(req))return status(req);
    if(typeof req.body.passphrase!=='string'||!req.body.passphrase||req.body.passphrase.length>1024)throw new InputError('Informe a senha do certificado na interface.');
    const last=attempts.get(req.operator.id)??0;if(Date.now()-last<60000)throw new InputError('Aguarde um minuto antes de autenticar novamente.',429);
    attempts.set(req.operator.id,Date.now());
    let pfx,agent;
    try{
      const file=await stat(env.SISCOMEX_A1_PATH);if(!file.isFile()||file.size>1_000_000)throw new InputError('Arquivo A1 inválido ou maior que o limite permitido.');
      pfx=await readFile(env.SISCOMEX_A1_PATH);
      agent=new https.Agent({pfx,passphrase:req.body.passphrase,keepAlive:true,maxSockets:1,rejectUnauthorized:true});
      const response=await request(agent,hosts[environment],'/portal/api/autenticar','POST',{'Role-Type':'IMPEXP'});
      if(response.status!==200)throw new InputError('Siscomex recusou a autenticação. Confira certificado, perfil e representação.',response.status===401||response.status===403?403:502);
      const connection={agent,token:null,csrf:null,expiresAt:0,busy:false};tokens(connection,response.headers);
      if(!connection.token||!connection.csrf||!connection.expiresAt)throw new InputError('Siscomex não retornou uma sessão válida.',502);
      connections.set(key(req),connection);return status(req);
    }catch(error){destroyAgent(agent);pfx?.fill(0);throw connectionError(error);}
    finally{delete req.body.passphrase;}
  }
  async function products(req){
    if(!authorized(req))throw new InputError('Integração não configurada para este operador.',403);
    const connection=current(req);if(!connection)throw new InputError('Conecte o certificado A1 antes de consultar.',409);
    if(connection.busy)throw new InputError('Aguarde a consulta anterior.',429);
    const query=new URLSearchParams({cpfCnpjRaiz:env.SISCOMEX_COMPANY_ROOT});
    const allowed=['ncm','codigoInterno','denominacao','situacao'];
    if(Object.keys(req.query).some(field=>!allowed.includes(field)))throw new InputError('Filtro não permitido.');
    for(const field of allowed){const value=req.query[field];if(value==null||value==='')continue;if(typeof value!=='string'||value.length>120)throw new InputError('Filtro inválido.');query.set(field,field==='ncm'?documentCode(value,8,'NCM'):value);}
    connection.busy=true;
    try{
      const response=await request(connection.agent,hosts[environment],'/catp/api/ext/produto?'+query,'GET',{Authorization:connection.token,'X-CSRF-Token':connection.csrf});
      if(response.status===401||response.status===403){disconnect(req);throw new InputError('Sessão expirada ou consulta não autorizada. Reconecte e confira a representação.',403);}
      tokens(connection,response.headers);
      if(response.status!==200)throw new InputError('Consulta ao Siscomex indisponível.',502);
      return response.body;
    }catch(error){if(error instanceof InputError)throw error;disconnect(req);throw new InputError('Consulta interrompida. Reconecte antes de tentar novamente.',502);}
    finally{connection.busy=false;}
  }
  const cleanup=setInterval(()=>{for(const[id,connection]of connections)if(connection.expiresAt<=Date.now()){destroyAgent(connection.agent);connections.delete(id);}for(const[id,time]of attempts)if(Date.now()-time>60000)attempts.delete(id);},60000);cleanup.unref();
  return {status,connect,products,disconnect,close(){clearInterval(cleanup);for(const value of connections.values())destroyAgent(value.agent);connections.clear();}};
}

export function registerSiscomexRoutes(app,connector,wrap){
  app.get('/api/siscomex/status',(req,res)=>res.json(connector.status(req)));
  app.post('/api/siscomex/connect',wrap(async(req,res)=>res.json(await connector.connect(req))));
  app.get('/api/siscomex/products',wrap(async(req,res)=>res.json(await connector.products(req))));
  app.post('/api/siscomex/disconnect',(req,res)=>{connector.disconnect(req);res.json({connected:false});});
}

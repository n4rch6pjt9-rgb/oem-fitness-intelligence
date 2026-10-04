import express from 'express';
import { createAssistedCollection } from './src/assisted-collection.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './src/parser.mjs';
import { listingUrl } from './src/listing-url.mjs';
import { createCrawler, unwrap } from './src/crawler.mjs';
import { registerClientRoutes, InputError } from './src/client-api.mjs';
import { createSiscomex, registerSiscomexRoutes } from './src/siscomex.mjs';
import { registerOperatorSetup } from './src/operator-setup.mjs';
import { registerCatalogRoutes } from './src/catalog-api.mjs';

export function createApp(env=process.env) {
  const app=express();app.disable('x-powered-by');
  const credentialsConfigured=!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SECRET_KEY);
  let configured=!!(credentialsConfigured&&env.OEM_OPERATOR_IDS);
  const client=key=>createClient(env.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const db=credentialsConfigured?client(env.SUPABASE_SECRET_KEY):null;
  const crawler=db?createCrawler(db):null;
  const sessions=new Map();const loginAttempts=new Map();
  let siscomex=createSiscomex(env);
  const allowed=new Set((env.OEM_OPERATOR_IDS??'').split(',').map(x=>x.trim()).filter(Boolean));
  const origin=env.APP_ORIGIN??'http://localhost:3000';const secure=origin.startsWith('https:');
  const testAuthBypass =
    env.TEST_AUTH_BYPASS === 'true' &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  app.use((req,res,next)=>{
    res.set({'Content-Security-Policy':"default-src 'self'; img-src 'self' https:; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
    if(req.method!=='GET'&&req.headers.origin!==origin)return res.status(403).json({error:'Origem não autorizada.'});next();
  });
app.use((req,res,next)=>{
  const largeAssistedPreview =
    req.path.endsWith('/assisted/preview') ||
    req.path.endsWith('/assisted/listing/preview');

  return largeAssistedPreview
    ? next()
    : express.json({limit:'16kb'})(req,res,next);
});
  app.use(express.static(fileURLToPath(new URL('./public',import.meta.url))));
  const wrap=handler=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);
  const cookie=(res,id)=>res.setHeader('Set-Cookie',`oem_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${id?28800:0}${secure?'; Secure':''}`);
  const sessionId=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('oem_session='))?.slice(12);
  app.get('/api/health',(_req,res)=>res.json({configured,crawler_enabled:env.CRAWLER_ENABLED==='true'}));
  registerOperatorSetup(app,db,env,allowed,wrap,()=>{configured=true;siscomex.close();siscomex=createSiscomex(env);});
  app.post('/api/login',wrap(async(req,res)=>{
    if(!configured)return res.status(503).json({error:'Configure o Supabase e os operadores no servidor.'});
    const now=Date.now(),key=req.ip;let attempts=loginAttempts.get(key);
    if(!attempts||attempts.until<now)attempts={count:0,until:now+900000};
    attempts.count++;loginAttempts.set(key,attempts);
    if(attempts.count>10)return res.status(429).json({error:'Muitas tentativas. Aguarde 15 minutos.'});
    if(typeof req.body.email!=='string'||typeof req.body.password!=='string')return res.status(400).json({error:'Informe email e senha.'});
    const auth=client(env.SUPABASE_PUBLISHABLE_KEY);
    const {data,error}=await auth.auth.signInWithPassword({email:req.body.email,password:req.body.password});
    if(error||!data.session||!allowed.has(data.user.id))return res.status(401).json({error:'Credenciais inválidas ou operador sem acesso.'});
    const old=sessionId(req);if(old)sessions.delete(old);
    const id=randomBytes(32).toString('hex');sessions.set(id,{auth,expiresAt:now+28800000});cookie(res,id);
    res.json({email:data.user.email});
  }));
  app.post('/api/logout',wrap(async(req,res)=>{
    const id=sessionId(req),session=sessions.get(id);
    if(session)await session.auth.auth.signOut({scope:'local'});siscomex.disconnect({sisSession:id});sessions.delete(id);cookie(res,'');res.json({ok:true});
  }));
  app.use('/api',wrap(async(req,res,next)=>{
    if(testAuthBypass){
      req.operator={id:'local-test-operator',email:'operator@localhost.test'};
      req.sisSession='local-test-session';
      return next();
    }
    const id=sessionId(req),session=sessions.get(id);
    if(!session||session.expiresAt<Date.now()){sessions.delete(id);return res.status(401).json({error:'Entre com uma conta de operador.'});}
    const {data:s}=await session.auth.auth.getSession();
    if(s.session?.expires_at*1000<Date.now()+60000){const refresh=await session.auth.auth.refreshSession();if(refresh.error){sessions.delete(id);return res.status(401).json({error:'Sessão expirada. Entre novamente.'});}}
    const {data,error}=await session.auth.auth.getUser();
    if(error||!data.user||!allowed.has(data.user.id)){sessions.delete(id);return res.status(401).json({error:'Sessão inválida.'});}
    req.operator=data.user;req.sisSession=id;next();
  }));
  app.get('/api/me',(req,res)=>res.json({email:req.operator.email}));
  app.get('/api/factories',wrap(async(_req,res)=>res.json(unwrap(await db.rpc('oem_factory_summary')))));
  app.post('/api/factories',wrap(async(req,res)=>{
    if(typeof req.body.url!=='string')return res.status(400).json({error:'Informe a URL da loja.'});
    let url;try{url=canonicalUrl(req.body.url);}catch(e){return res.status(400).json({error:e.message});}
    const u=new URL(url),source_url=listingUrl(u.origin);
    let factory=unwrap(await db.from('oem_factories').select('*').eq('domain',u.hostname).maybeSingle());
    if(!factory)factory=unwrap(await db.from('oem_factories').insert({domain:u.hostname,name:u.hostname,source_url}).select('*').single());
    await crawler.enqueue(factory.id,source_url);res.status(201).json(factory);
  }));
  app.param('id',(req,res,next,value)=>{if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))return res.status(400).json({error:'Identificador inválido.'});next();});
  app.post('/api/factories/:id/crawl',wrap(async(req,res)=>{
    if(typeof req.body.enabled!=='boolean')return res.status(400).json({error:'enabled deve ser boolean.'});
    const row=unwrap(await db.from('oem_factories').update({crawl_enabled:req.body.enabled}).eq('id',req.params.id).select('id').maybeSingle());
    if(!row)return res.status(404).json({error:'Fábrica não encontrada.'});res.json({ok:true,worker_enabled:env.CRAWLER_ENABLED==='true'});
  }));
  app.post('/api/factories/:id/retry',wrap(async(req,res)=>{
    unwrap(await db.from('oem_pages').update({state:'queued',attempts:0,error:null,available_at:new Date().toISOString()}).eq('factory_id',req.params.id).eq('state','error'));res.json({ok:true});
  }));
  const assisted=db?createAssistedCollection(db,crawler.persistProduct):null;
  app.post('/api/factories/:id/assisted/listing/preview',express.json({limit:'9mb'}),wrap(async(req,res)=>res.json(await assisted.previewListing(req.params.id,req.sisSession,req.body))));
  app.post('/api/factories/:id/assisted/listing/save',wrap(async(req,res)=>res.json(await assisted.saveListing(req.params.id,req.sisSession,req.body.token))));
  app.post('/api/factories/:id/assisted/preview',express.json({limit:'9mb'}),wrap(async(req,res)=>res.json(await assisted.preview(req.params.id,req.sisSession,req.body))));
  app.post('/api/factories/:id/assisted/save',wrap(async(req,res)=>res.json(await assisted.save(req.params.id,req.sisSession,req.body.token))));
  registerCatalogRoutes(app,db,wrap);
  app.get('/api/ads/:id',wrap(async(req,res)=>{
    const ad=unwrap(await db.from('oem_ads').select('*').eq('id',req.params.id).maybeSingle());if(!ad)return res.status(404).json({error:'Anúncio não encontrado.'});
    ad.lines=unwrap(await db.from('oem_ad_lines').select('oem_lines(name,source_url)').eq('ad_id',ad.id));res.json(ad);
  }));
  app.get('/api/factories/:id/pages',wrap(async(req,res)=>{
    const page=Number(req.query.page??1);if(!Number.isInteger(page)||page<1||page>100000)return res.status(400).json({error:'Página inválida.'});
    const result=await db.from('oem_pages').select('id,url,kind,state,attempts,http_status,error,completed_at',{count:'exact'}).eq('factory_id',req.params.id).order('created_at').order('id').range((page-1)*50,page*50-1);unwrap(result);res.json({items:result.data,total:result.count,page,size:50});
  }));
  registerClientRoutes(app,db,wrap);
  registerSiscomexRoutes(app,{status:req=>siscomex.status(req),connect:req=>siscomex.connect(req),products:req=>siscomex.products(req),disconnect:req=>siscomex.disconnect(req)},wrap);
  app.use((error,_req,res,_next)=>{if(error instanceof InputError)return res.status(error.status).json({error:error.message});console.error('Falha na operação:',error.name);res.status(500).json({error:'Operação falhou. Verifique a configuração e o banco.'});});
  let timer;
  if(crawler&&env.CRAWLER_ENABLED==='true')timer=setInterval(()=>crawler.step().catch(e=>console.error('Worker:',e.name)),2000);
  const cleanup=setInterval(()=>{const now=Date.now();for(const[id,s]of sessions)if(s.expiresAt<now)sessions.delete(id);for(const[k,v]of loginAttempts)if(v.until<now)loginAttempts.delete(k);},60000);cleanup.unref();
  return {app,close(){siscomex.close();clearInterval(timer);clearInterval(cleanup);}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const runtime=createApp();const port=Number(process.env.PORT??3000);
  const server=runtime.app.listen(port,'127.0.0.1',()=>console.log(`OEM disponível em http://localhost:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{runtime.close();server.close();});
}

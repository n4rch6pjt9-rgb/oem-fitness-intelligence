import {readFile,writeFile} from 'node:fs/promises';
import {InputError} from './client-api.mjs';

export function registerOperatorSetup(app,db,env,allowed,wrap,onConfigured){
  let creating=false;
  const email=env.OEM_SETUP_EMAIL?.trim().toLowerCase();
  const enabled=req=>db&&email&&allowed.size===0&&['127.0.0.1','::1'].includes(req.socket.remoteAddress);
  app.get('/api/operator-setup', (req,res)=>res.json({enabled:!!enabled(req),email:enabled(req)?email:null}));
  app.post('/api/operator-setup',wrap(async(req,res)=>{
    if(!enabled(req))throw new InputError('Configuração inicial não disponível.',403);
    if(creating)throw new InputError('Cadastro em andamento. Aguarde.',409);
    if(typeof req.body.password!=='string'||req.body.password.length<12||req.body.password.length>128)throw new InputError('Use uma senha com 12 a 128 caracteres.');
    creating=true;
    try{
      const existing=await db.auth.admin.listUsers({page:1,perPage:1});
      if(existing.error)throw new InputError('Não foi possível verificar as contas existentes.',503);
      if(existing.data.users.length)throw new InputError('Já existe uma conta. Configure o operador existente em vez de criar outro.',409);
      const {data,error}=await db.auth.admin.createUser({email,password:req.body.password,email_confirm:true});
      if(error||!data.user)throw new InputError('Não foi possível criar o operador. Confira a configuração do Supabase.',502);
      let content=await readFile('.env','utf8');
      const value='OEM_OPERATOR_IDS='+data.user.id;
      content=/^OEM_OPERATOR_IDS=.*$/m.test(content)?content.replace(/^OEM_OPERATOR_IDS=.*$/m,value):content+'\n'+value+'\n';
      if(env.SISCOMEX_A1_PATH&&!env.SISCOMEX_OPERATOR_ID){content+='\nSISCOMEX_OPERATOR_ID='+data.user.id+'\n';env.SISCOMEX_OPERATOR_ID=data.user.id;}
      content=content.replace(/^OEM_SETUP_EMAIL=.*(?:\r?\n)?/m,'');
      await writeFile('.env',content);
      allowed.add(data.user.id);onConfigured();res.status(201).json({created:true});
    }finally{delete req.body.password;creating=false;}
  }));
}

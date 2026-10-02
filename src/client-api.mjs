export class InputError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function documentCode(value,length,label){
  if(typeof value!=='string'||!/^[\d./\s-]+$/.test(value))throw new InputError(`${label} inválido.`);
  const code=value.replace(/\D/g,'');
  if(code.length!==length)throw new InputError(`${label} deve ter ${length} dígitos.`);
  return code;
}
export function clientInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new InputError('Cadastro inválido.');
  const fields=['cnpj','legal_name','trade_name','email','phone','contact_name','street','number','complement','district','city','state','postal_code','registration_status','main_activity'];
  if(Object.keys(body).some(key=>!fields.includes(key)))throw new InputError('Campo de cadastro não permitido.');
  const result={};
  for(const field of fields){
    const value=body[field];
    if(value==null||value===''){result[field]=null;continue;}
    if(typeof value!=='string'||value.length>500)throw new InputError('Valor de cadastro inválido.');
    result[field]=value.trim()||null;
  }
  result.cnpj=documentCode(result.cnpj,14,'CNPJ');
  if(!result.legal_name)throw new InputError('Informe a razão social.');
  if(result.state&&!/^[A-Z]{2}$/.test(result.state))throw new InputError('UF inválida.');
  if(result.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new InputError('Email inválido.');
  return result;
}
export async function brasilLookup(kind,value,fetcher=fetch){
  const code=documentCode(value,kind==='cnpj'?14:8,kind==='cnpj'?'CNPJ':'NCM');
  let response;
  try{response=await fetcher(`https://brasilapi.com.br/api/${kind}/v1/${code}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json','User-Agent':'OEM-Supplier-Gym/0.1'}});}
  catch{throw new InputError('Consulta indisponível. Tente novamente.',503);}
  if(!response.ok){
    const messages={400:'O serviço cadastral recusou o código informado. Confira os dígitos.',403:'A BrasilAPI recusou o acesso à consulta de CNPJ. Você pode preencher o cadastro manualmente; os dados informados foram preservados.',404:'Registro não encontrado.',429:'Limite de consultas atingido. Aguarde.'};
    const message=response.status===403&&kind==='ncm'?'A BrasilAPI recusou o acesso à consulta de NCM. Tente novamente mais tarde.':messages[response.status]??'O serviço cadastral está indisponível. Tente novamente mais tarde.';
    throw new InputError(message,[400,404,429].includes(response.status)?response.status:502);
  }
  let data;try{data=await response.json();}catch{throw new InputError('Resposta inválida do serviço cadastral.',502);}
  if(kind==='ncm'){
    if(typeof data?.codigo!=='string'||typeof data.descricao!=='string')throw new InputError('Resposta inválida do serviço cadastral.',502);
    return {code:data.codigo,description:data.descricao,start_date:data.data_inicio??null,end_date:data.data_fim??null};
  }
  if(typeof data?.razao_social!=='string')throw new InputError('Resposta inválida do serviço cadastral.',502);
  return {cnpj:code,legal_name:data.razao_social,trade_name:data.nome_fantasia??null,email:data.email??null,phone:data.ddd_telefone_1??null,contact_name:null,street:[data.descricao_tipo_de_logradouro,data.logradouro].filter(Boolean).join(' ')||null,number:data.numero??null,complement:data.complemento??null,district:data.bairro??null,city:data.municipio??null,state:data.uf??null,postal_code:data.cep??null,registration_status:data.descricao_situacao_cadastral??null,main_activity:data.cnae_fiscal_descricao??null};
}
export function registerClientRoutes(app,db,wrap){
  const handle=result=>{if(result.error){if(result.error.code==='23505')throw new InputError('CNPJ já cadastrado.',409);throw result.error;}return result.data;};
  const scoped=req=>db.from('oem_clients').select('*').eq('owner_id',req.operator.id).is('archived_at',null);
  app.get('/api/identification/cnpj/:code',wrap(async(req,res)=>res.json(await brasilLookup('cnpj',req.params.code))));
  app.get('/api/classification/ncm/:code',wrap(async(req,res)=>res.json(await brasilLookup('ncm',req.params.code))));
  app.get('/api/clients',wrap(async(req,res)=>res.json(handle(await scoped(req).order('legal_name').limit(200)))));
  app.get('/api/clients/:id',wrap(async(req,res)=>{const row=handle(await scoped(req).eq('id',req.params.id).maybeSingle());if(!row)throw new InputError('Cliente não encontrado.',404);res.json(row);}));
  app.post('/api/clients',wrap(async(req,res)=>{const input=clientInput(req.body);res.status(201).json(handle(await db.from('oem_clients').insert({...input,owner_id:req.operator.id}).select('*').single()));}));
  app.put('/api/clients/:id',wrap(async(req,res)=>{const input=clientInput(req.body);const row=handle(await db.from('oem_clients').update({...input,updated_at:new Date().toISOString()}).eq('owner_id',req.operator.id).eq('id',req.params.id).is('archived_at',null).select('*').maybeSingle());if(!row)throw new InputError('Cliente não encontrado.',404);res.json(row);}));
  app.delete('/api/clients/:id',wrap(async(req,res)=>{const row=handle(await db.from('oem_clients').update({archived_at:new Date().toISOString()}).eq('owner_id',req.operator.id).eq('id',req.params.id).is('archived_at',null).select('id').maybeSingle());if(!row)throw new InputError('Cliente não encontrado.',404);res.json({archived:true});}));
}

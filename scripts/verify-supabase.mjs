const url=process.env.SUPABASE_URL;
const publicKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const serverKey=process.env.SUPABASE_SECRET_KEY;
if(!url||!publicKey||!serverKey)throw new Error('Configuração Supabase incompleta.');
const auth=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:publicKey},signal:AbortSignal.timeout(15000)});
const schema=await fetch(`${url}/rest/v1/`,{headers:{apikey:serverKey,Accept:'application/openapi+json'},signal:AbortSignal.timeout(15000)});
const result={auth_status:auth.status,data_api_status:schema.status,tables:[]};
if(schema.ok){const data=await schema.json();result.tables=Object.keys(data.paths??{}).filter(x=>x!=='/'&&!x.startsWith('/rpc/')).map(x=>x.slice(1));}
console.log(JSON.stringify(result));

import {loadEnvFile} from 'node:process';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

loadEnvFile('.env');
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe o email da conta criada no Supabase Auth.');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let user;
for(let page=1;page<=100;page++){
  const {data,error}=await db.auth.admin.listUsers({page,perPage:100});
  if(error)throw new Error('Não foi possível consultar os operadores no Supabase.');
  user=data.users.find(item=>item.email?.toLowerCase()===email);
  if(user||data.users.length<100)break;
}
if(!user)throw new Error('Conta não encontrada. Crie a conta pela interface do Supabase antes de configurar o operador.');
let content=await readFile('.env','utf8');
const operators=new Set((process.env.OEM_OPERATOR_IDS??'').split(',').filter(Boolean));operators.add(user.id);
function set(name,value){const pattern=new RegExp('^'+name+'=.*$','m');content=pattern.test(content)?content.replace(pattern,name+'='+value):content+'\n'+name+'='+value+'\n';}
set('OEM_OPERATOR_IDS',[...operators].join(','));
await writeFile('.env',content);
console.log('Operador autorizado. Reinicie o servidor para carregar a configuração.');

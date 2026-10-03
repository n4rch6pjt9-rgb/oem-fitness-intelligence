const $=id=>document.getElementById(id);
let selected=null,page=1,query='',total=0,queuePage=1,queueTotal=0,loggedIn=false,factories=[];
const message=(text,error=false)=>{$('message').textContent=text;$('message').className=error?'error':'';};
async function api(url,options={}) {
  const response=await fetch('/api'+url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(response.status===401){loggedIn=false;$('workspace').hidden=true;$('login').hidden=false;$('logout').hidden=true;}
  if(!response.ok)throw new Error(data.error??'Falha na operação.');return data;
}
const post=(url,body)=>api(url,{method:'POST',body:JSON.stringify(body)});
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
function link(url,text){const a=node('a',text);try{const u=new URL(url);if(u.protocol==='https:'){a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}return a;}
function image(url){const img=node('img');try{const u=new URL(url);if(u.protocol==='https:')img.src=u.href;}catch{}img.loading='lazy';img.alt='Imagem publicada pelo fabricante';return img;}
const formatNumber=value=>new Intl.NumberFormat('pt-BR').format(value??0);
const dimensions=value=>Array.isArray(value)?value.join(' × ')+' mm':'Não informadas';
const price=ad=>ad.price_min===null?'Preço não informado':`${ad.currency??'Moeda não informada'} ${ad.price_min}${ad.price_max!==null&&ad.price_max!==ad.price_min?' – '+ad.price_max:''}`;
function coverage(f){
  const pending=Number(f.queued)+Number(f.running)+Number(f.errors);
  const comparison=f.expected_ads===null?'Total da fonte ainda não verificado.':`${formatNumber(f.ads)} anúncios coletados / ${formatNumber(f.expected_ads)} informados pela fonte.`;
  return `${comparison} ${formatNumber(f.skus)} modelos declarados distintos. `+(pending?`Coleta incompleta: ${formatNumber(f.queued)} na fila, ${formatNumber(f.running)} em execução, ${formatNumber(f.errors)} com erro.`:Number(f.done)===0?'Coleta ainda não iniciada.':Number(f.ads)===Number(f.expected_ads)?'Fila concluída; contagem coincide com a fonte.':'Fila encerrada; cobertura exige revisão.');
}
async function refreshFactories(){
  factories=await api('/factories');$('factories').replaceChildren();
  for(const f of factories){const card=node('article',undefined,'factory'+(selected===f.id?' selected':''));card.append(node('span',f.domain,'eyebrow'),node('h3',f.name),node('p',coverage(f),'metrics'));const b=node('button','Abrir catálogo');b.onclick=()=>run(async()=>{selected=f.id;page=1;queuePage=1;query='';$('catalog').hidden=false;$('queue-results').hidden=true;await refreshFactories();await refreshAds();});card.append(b);$('factories').append(card);}
  if(!factories.length)$('factories').append(node('p','Nenhuma fábrica cadastrada. Cadastre a BRTW para preparar a fila.'));
  const f=factories.find(x=>x.id===selected);if(f){$('factory-name').textContent=f.name;$('coverage').textContent=coverage(f);}
}
async function refreshAds(){
  if(!selected)return;const data=await api(`/factories/${selected}/ads?page=${page}&q=${encodeURIComponent(query)}`);total=data.total;$('products').replaceChildren();
  for(const ad of data.items){const card=node('article',undefined,'product');if(ad.images?.[0])card.append(image(ad.images[0]));card.append(node('p',ad.model??'Modelo não declarado','model'),node('h3',ad.title),node('p',price(ad)),node('p',`Montado: ${dimensions(ad.dimensions_mm)}`));const b=node('button','Ver dados e fonte');b.onclick=()=>run(()=>showDetail(ad.id));card.append(b);$('products').append(card);}
  if(!data.items.length)$('products').append(node('p','Nenhum anúncio coletado para esta consulta. Confira a fila e os erros de coleta.'));
  $('page-label').textContent=`Página ${page} de ${Math.max(1,Math.ceil(total/24))} · ${formatNumber(total)} anúncios`;$('previous').disabled=page===1;$('next').disabled=page*24>=total;
}
async function showDetail(id){
  const ad=await api('/ads/'+id),content=$('detail-content');content.replaceChildren(node('h2',ad.title),node('p',ad.model??'Modelo não declarado'),node('p',price(ad)),link(ad.source_url,'Abrir anúncio original'),node('p',`Coletado em ${new Date(ad.collected_at).toLocaleString('pt-BR')}`));
  const gallery=node('div',undefined,'detail-images');for(const url of ad.images??[])gallery.append(image(url));content.append(gallery);
  const lines=(ad.lines??[]).map(x=>x.oem_lines?.name).filter(Boolean);content.append(node('p','Grupos da fonte: '+(lines.join(', ')||'Ainda não vinculados')));
  const extraction=ad.attributes?.extraction;
  const usage=extraction?.usage_classification;
  if(usage){content.append(node('h3','Intenção de uso declarada'),node('p',usage.declared_class==='light_commercial'?'Light commercial · Comercial leve':usage.declared_class==='commercial'?'Commercial · Comercial':usage.conflict?'Classe divergente entre declarações':'Classe de uso não informada'),node('p','Declaração do fornecedor; intensidade de uso não verificada.'));for(const evidence of usage.evidence)content.append(node('p',`${evidence.value} — ${evidence.source_section}`));}
  const table=node('table');for(const[key,value]of Object.entries(ad.attributes??{})){if(key==='extraction')continue;const row=node('tr');row.append(node('th',key),node('td',value));table.append(row);}content.append(node('h3','Atributos declarados na fonte'),table);$('detail').showModal();
}
async function refreshQueue(){
  if(!selected)return;const data=await api(`/factories/${selected}/pages?page=${queuePage}`);queueTotal=data.total;$('queue-list').replaceChildren();
  for(const item of data.items){const row=node('div');row.append(node('strong',`${item.state} · ${item.kind} · tentativas ${item.attempts} · HTTP ${item.http_status??'—'}`),node('br'),link(item.url,item.url));if(item.error)row.append(node('p',item.error));$('queue-list').append(row);}
  $('queue-label').textContent=`Página ${queuePage} de ${Math.max(1,Math.ceil(queueTotal/50))}`;$('queue-previous').disabled=queuePage===1;$('queue-next').disabled=queuePage*50>=queueTotal;
}
async function run(action){try{await action();}catch(e){message(e.message,true);}}
async function enter(){
  if(new URLSearchParams(window.location.search).get('next')==='catalog'){window.location.assign('/catalogo.html');return;}if(new URLSearchParams(location.search).get('next')==='clients'){location.assign('/modelo-navegacao.html');return;}loggedIn=true;$('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await refreshFactories();}
$('login-form').onsubmit=e=>{e.preventDefault();run(async()=>{const data=new FormData(e.target);await post('/login',{email:data.get('email'),password:data.get('password')});e.target.reset();message('Acesso autorizado.');await enter();});};
$('logout').onclick=()=>run(async()=>{await post('/logout',{});loggedIn=false;$('workspace').hidden=true;$('login').hidden=false;$('logout').hidden=true;$('detail').close();message('Você saiu.');});
$('factory-form').onsubmit=e=>{e.preventDefault();run(async()=>{const data=new FormData(e.target);const f=await post('/factories',{url:data.get('url')});selected=f.id;page=1;$('catalog').hidden=false;await refreshFactories();await refreshAds();message('Fábrica cadastrada e fila preparada. Inicie a coleta quando o worker estiver habilitado.');});};
$('search-form').onsubmit=e=>{e.preventDefault();query=new FormData(e.target).get('q')??'';page=1;run(refreshAds);};
for(const[id,enabled]of [['resume',true],['pause',false]])$(id).onclick=()=>run(async()=>{if(!selected)return;const data=await post(`/factories/${selected}/crawl`,{enabled});await refreshFactories();message(enabled?(data.worker_enabled?'Coleta ativada.':'Fila ativada; configure CRAWLER_ENABLED=true no servidor para executá-la.'):'Coleta pausada. Uma página já em execução pode terminar.');});
$('retry').onclick=()=>run(async()=>{if(!selected)return;await post(`/factories/${selected}/retry`,{});await refreshFactories();message('Erros recolocados na fila.');});
$('queue').onclick=()=>run(async()=>{$('queue-results').hidden=!$('queue-results').hidden;if(!$('queue-results').hidden)await refreshQueue();});
$('previous').onclick=()=>{page--;run(refreshAds);};$('next').onclick=()=>{page++;run(refreshAds);};
$('queue-previous').onclick=()=>{queuePage--;run(refreshQueue);};$('queue-next').onclick=()=>{queuePage++;run(refreshQueue);};
$('close-detail').onclick=()=>$('detail').close();
setInterval(()=>{if(loggedIn)run(async()=>{await refreshFactories();if(selected)await refreshAds();if(!$('queue-results').hidden)await refreshQueue();});},10000);
run(async()=>{const health=await api('/health');if(!health.configured){message('Aplicação pronta para configurar: informe o Supabase e os operadores no .env do servidor. A coleta ainda não foi executada.');return;}try{await api('/me');await enter();}catch{message('Entre para acessar o catálogo.');}});

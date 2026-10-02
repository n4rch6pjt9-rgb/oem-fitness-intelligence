(() => {
  const el=id=>document.getElementById(id);
  async function api(path,options={}){const response=await fetch('/api/siscomex/'+path,{...options,headers:{'Content-Type':'application/json'}});const data=await response.json();if(!response.ok)throw new Error(data.error??'Operação indisponível.');return data;}
  function showStatus(data){el('sisStatus').textContent=data.connected?'Conectado · '+(data.environment==='production'?'Produção':'Validação')+' · Sessão expira em '+new Date(data.expires_at).toLocaleTimeString('pt-BR'):data.configured?'Certificado configurado · Desconectado':'Configuração do certificado, operador e empresa pendente no servidor.';}
  async function run(button,action){button.disabled=true;try{await action();}catch(error){el('sisStatus').textContent=error.message;}finally{button.disabled=false;}}
  el('sisCheck').onclick=event=>run(event.currentTarget,async()=>showStatus(await api('status')));
  el('sisConnect').onclick=event=>run(event.currentTarget,async()=>{
    const input=el('sisPassphrase');const passphrase=input.value;input.value='';
    if(!passphrase)throw new Error('Informe a senha do certificado.');showStatus(await api('connect',{method:'POST',body:JSON.stringify({passphrase})}));
  });
  el('sisDisconnect').onclick=event=>run(event.currentTarget,async()=>{await api('disconnect',{method:'POST',body:'{}'});el('sisProducts').replaceChildren();showStatus(await api('status'));});
  el('sisQuery').onclick=event=>run(event.currentTarget,async()=>{
    const ncm=el('ncmCode').value.trim();const data=await api('products'+(ncm?'?ncm='+encodeURIComponent(ncm):''));
    if(!Array.isArray(data))throw new Error('Resposta de produtos em formato inesperado.');
    const output=el('sisProducts');output.replaceChildren();
    if(!data.length){output.textContent='Nenhum produto encontrado nesta consulta.';return;}
    const table=document.createElement('table');table.className='sis-table';
    const header=document.createElement('tr');for(const title of ['Código','Produto','NCM','Situação']){const cell=document.createElement('th');cell.textContent=title;header.append(cell);}table.append(header);
    const statuses={ATIVADO:'Ativo',DESATIVADO:'Inativo',RASCUNHO:'Rascunho'};
    for(const product of data){const row=document.createElement('tr');for(const value of [product.codigo??'Não informado',product.denominacao??'Não informado',product.ncm??'Não informado',statuses[product.situacao]??'Não informada']){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}table.append(row);}
    output.append(table);el('sisStatus').textContent='Consulta concluída · Nenhum registro foi alterado.';
  });
})();

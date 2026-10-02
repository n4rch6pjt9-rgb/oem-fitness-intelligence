(() => {
  const el=id=>document.getElementById(id);
  const existing={cnpj:'clientDocument',legal_name:'clientName',state:'clientUf'};
  const labels={trade_name:'Nome fantasia',email:'Email',phone:'Telefone',contact_name:'Contato',street:'Logradouro',number:'Número',complement:'Complemento',district:'Bairro',city:'Município cadastral',postal_code:'CEP',registration_status:'Situação cadastral',main_activity:'Atividade principal'};
  let currentId=null;
  for(const [field,title] of Object.entries(labels)){
    const label=document.createElement('label');label.textContent=title;
    const input=document.createElement('input');input.id='customer_'+field;input.maxLength=500;
    if(field==='email')input.type='email';label.append(input);el('clientApiFields').append(label);existing[field]=input.id;
  }
  async function api(path,options={}){
    const response=await fetch(path,{...options,headers:{'Content-Type':'application/json'}});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Operação indisponível.');return data;
  }
  function load(data){for(const [field,id] of Object.entries(existing))el(id).value=data[field]??'';currentId=data.id??null;el('archiveClient').disabled=!currentId;}
  function values(){return Object.fromEntries(Object.entries(existing).map(([field,id])=>[field,el(id).value.trim()||null]));}
  async function run(button,action,status='clientApiStatus'){
    button.disabled=true;el(status).textContent='Processando…';
    try{await action();}catch(error){el(status).textContent=error.message;}finally{button.disabled=button.id==='archiveClient'?!currentId:false;}
  }
  el('lookupCnpj').onclick=event=>run(event.currentTarget,async()=>{
    const data=await api('/api/identification/cnpj/'+encodeURIComponent(el('clientDocument').value));
    const id=currentId;load(data);currentId=id;el('archiveClient').disabled=!id;
    el('clientApiStatus').textContent='Cadastro preenchido. Revise as informações antes de salvar.';
  });
  el('persistClient').onclick=event=>run(event.currentTarget,async()=>{
    const body=values();if(!body.legal_name||!body.cnpj)throw new Error('Informe CNPJ e razão social.');
    if(!el(existing.email).reportValidity())throw new Error('Revise o email.');
    load(await api('/api/clients'+(currentId?'/'+currentId:''),{method:currentId?'PUT':'POST',body:JSON.stringify(body)}));
    el('clientApiStatus').textContent='Cliente salvo.';
  });
  el('newClient').onclick=()=>{load({});el('clientApiStatus').textContent='Novo cadastro.';};
  el('listClients').onclick=event=>run(event.currentTarget,async()=>{
    const clients=await api('/api/clients');el('clientList').replaceChildren();
    for(const client of clients){const button=document.createElement('button');button.textContent=client.legal_name+' · '+client.cnpj;button.onclick=()=>run(button,async()=>{load(await api('/api/clients/'+client.id));el('clientApiStatus').textContent='Cadastro carregado para edição.';});el('clientList').append(button);}
    el('clientApiStatus').textContent=clients.length?'Clientes carregados. Selecione para editar.':'Nenhum cliente cadastrado.';
  });
  el('archiveClient').onclick=event=>run(event.currentTarget,async()=>{
    await api('/api/clients/'+currentId,{method:'DELETE'});load({});el('clientList').replaceChildren();el('clientApiStatus').textContent='Cliente arquivado.';
  });
  el('lookupNcm').onclick=event=>run(event.currentTarget,async()=>{
    const data=await api('/api/classification/ncm/'+encodeURIComponent(el('ncmCode').value));
    el('ncmStatus').textContent=data.code+' · '+data.description;
  },'ncmStatus');
})();

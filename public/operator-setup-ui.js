const setupEl=id=>document.getElementById(id);
async function setupApi(options){const response=await fetch('/api/operator-setup',options);const data=await response.json();if(!response.ok)throw new Error(data.error??'Configuração indisponível.');return data;}
setupApi().then(data=>{setupEl('setupEmail').value=data.email??'';setupEl('setupSubmit').disabled=!data.enabled;setupEl('setupStatus').textContent=data.enabled?'Email autorizado. Defina sua senha para criar o acesso.':'Configuração inicial desativada. O email do operador precisa ser definido no servidor.';}).catch(()=>setupEl('setupStatus').textContent='Não foi possível verificar a configuração.');
setupEl('setupForm').onsubmit=async event=>{
  event.preventDefault();const password=setupEl('setupPassword').value;
  if(password!==setupEl('setupConfirm').value){setupEl('setupStatus').textContent='As senhas não conferem.';return;}
  setupEl('setupSubmit').disabled=true;
  try{await setupApi({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});setupEl('setupForm').reset();setupEl('setupStatus').textContent='Acesso criado. Entre no cadastro de clientes.';}
  catch(error){setupEl('setupStatus').textContent=error.message;setupEl('setupSubmit').disabled=false;}
};

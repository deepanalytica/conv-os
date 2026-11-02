const form=document.getElementById('login-form');
const status=document.getElementById('login-status');
const button=document.getElementById('submit');
form.addEventListener('submit',async event=>{
 event.preventDefault();
 button.disabled=true;
 status.textContent='';
 try{
  const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-convos-login':'1'},body:JSON.stringify({password:form.elements.password.value}),credentials:'same-origin',cache:'no-store'});
  form.elements.password.value='';
  if(response.ok){location.replace('/');return}
  if(response.status===429)status.textContent='Demasiados intentos. Inténtalo más tarde.';
  else if(response.status===503)status.textContent='Primero configura la cuenta con npm run setup:local.';
  else status.textContent='Contraseña incorrecta o sesión no disponible.';
 }catch{status.textContent='No se pudo contactar el servicio local.'}
 finally{button.disabled=false}
});

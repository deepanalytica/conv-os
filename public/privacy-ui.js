// Registro de preferencias declarado por el operador. No concede consentimiento verificado.
export function activateConsent({tenant,staticDemo,api,notify,escape,contacts}){
 const root=document.getElementById('consent-workspace');
 if(!root)return;
 const isActive=()=>root.isConnected&&document.getElementById('consent-workspace')===root;
 const key='conv-os-consent-local-demo-v1';
 function demoData(){try{const d=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(d)?d:[]}catch{return []}}
 function storeDemo(d){try{localStorage.setItem(key,JSON.stringify(d))}catch{}}
 function summaryFor(receipts){
  const choices=receipts.filter(x=>x.purpose==='marketing');
  if(choices.some(x=>x.decision==='opted_out'))return 'OPTED_OUT';
  return choices.some(x=>x.decision==='claimed_opt_in')?'UNVERIFIED_CLAIM':'UNKNOWN';
 }
 let selected=contacts[0]?.id||'';
 async function load(){
  if(!selected)return {receipts:[],summary:{marketing_permission:'UNKNOWN',outbound_automation_allowed:false}};
  if(staticDemo){
   const receipts=demoData().filter(x=>x.tenant_id===tenant&&x.contact_id===selected);
   return {receipts,summary:{marketing_permission:summaryFor(receipts),outbound_automation_allowed:false}};
  }
  return api('/privacy/contacts/'+encodeURIComponent(selected)+'/consent');
 }
 async function refresh(){
  let data;
  try{data=await load()}catch(e){if(isActive())root.textContent=e.message;return}
  if(!isActive())return;
  root.innerHTML=`<div class="crm-toolbar" style="margin-top:28px"><div>
    <div class="crm-title">Privacidad y consentimiento</div>
    <div class="crm-subtitle">Historial de preferencias declarado manualmente · nunca habilita campañas automáticas</div></div>
    <span class="crm-demo-pill">ENVÍOS DESHABILITADOS</span>
   </div>
   <div class="crm-notice">Esta pantalla NO verifica consentimiento en Meta ni sustituye la autorización del cliente. Un «sí» declarado queda como NO VERIFICADO; una exclusión impide planificar campañas. No enviar mensajes desde aquí.</div>
   <div class="crm-forms"><section class="crm-form-panel">
    <h2>Registrar preferencia</h2>
    <form id="consent-form">
     <label for="privacy-contact">Contacto</label><select id="privacy-contact" name="contact_id" required>
      ${contacts.map(c=>`<option value="${escape(c.id)}" ${selected===c.id?'selected':''}>${escape(c.name)}</option>`).join('')}
     </select>
     <label for="privacy-channel">Canal</label><select id="privacy-channel" name="channel">
      ${['manual','instagram','facebook','whatsapp'].map(p=>`<option value="${p}">${p}</option>`).join('')}
     </select>
     <label for="privacy-purpose">Finalidad</label><select id="privacy-purpose" name="purpose">
      <option value="marketing">Publicidad y promociones</option><option value="service">Atención de servicio</option>
     </select>
     <label for="privacy-decision">Preferencia declarada</label><select id="privacy-decision" name="decision">
      <option value="opted_out">No recibir comunicaciones</option>
      <option value="claimed_opt_in">Operador registra autorización no verificada</option>
     </select>
     <button type="submit" class="btn primary" ${contacts.length?'':'disabled'}>Registrar sin enviar nada</button>
    </form></section>
    <section class="crm-form-panel">
     <h2>Estado y registros</h2>
     <div class="crm-notice">Permiso comercial: ${escape(data.summary.marketing_permission)} · Automatización saliente: BLOQUEADA.</div>
     <div class="crm-followups">${data.receipts.map(x=>`<div class="crm-followup-row"><div>
      <strong>${x.decision==='opted_out'?'Exclusión declarada':'Declaración sin comprobar'}</strong>
      <small>${escape(x.channel)} · ${escape(x.purpose)} · ${escape(new Date(x.created_at).toLocaleString('es-CL'))}</small>
     </div></div>`).join('')||'<div class="crm-empty">Sin registros para este contacto</div>'}</div>
    </section>
   </div>`;
 }
 root.addEventListener('change',e=>{
  if(e.target.id==='privacy-contact'){selected=e.target.value;refresh()}
 });
 root.addEventListener('submit',async e=>{
  if(e.target.id!=='consent-form')return;
  e.preventDefault();
  const values=Object.fromEntries(new FormData(e.target));
  const btn=e.target.querySelector('[type="submit"]');btn.disabled=true;
  try{
   const target=contacts.find(c=>c.id===values.contact_id);
   if(!target)throw Error('Contacto de esta empresa no encontrado');
   const body={channel:values.channel,purpose:values.purpose,decision:values.decision};
   if(staticDemo){
    const d=demoData();
    d.push({...body,tenant_id:tenant,contact_id:target.id,id:crypto.randomUUID(),created_at:new Date().toISOString()});
    storeDemo(d);
   }else await api('/privacy/contacts/'+encodeURIComponent(target.id)+'/consent','POST',body);
   selected=target.id;notify('Preferencia declarada guardada. Envíos automáticos bloqueados.');
   await refresh();
  }catch(error){notify(error.message);btn.disabled=false}
 });
 refresh();
}

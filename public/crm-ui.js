import {activateCommercial} from './commercial-ui.js';
import {activateConsent} from './privacy-ui.js';
const pipeline=[
 ['new','Nuevo'],['qualified','Calificado'],['proposal','Propuesta'],
 ['negotiation','Negociación'],['won','Ganado'],['lost','Perdido']
];
const transitions={
 new:['qualified','lost'],qualified:['proposal','lost'],
 proposal:['negotiation','won','lost'],negotiation:['won','lost'],won:[],lost:[]
};
const channelNames={instagram:'Instagram',facebook:'Facebook',whatsapp:'WhatsApp',manual:'Manual'};
const demoSeeds={
 'demo-wal':[
  ['Consulta WAL 01','instagram','Tazón personalizado',19990,'new'],
  ['Consulta WAL 02','whatsapp','Pack para regalo',69990,'proposal']],
 'demo-vaa':[
  ['Empresa demo 01','facebook','Diagnóstico de presencia digital',150000,'qualified'],
  ['Empresa demo 02','instagram','Automatización comercial',350000,'proposal']]
};
function demoData(){
 try{
  const previous=JSON.parse(localStorage.getItem('conv-os-crm-v1')||'null');
  if(previous&&Array.isArray(previous.contacts)&&Array.isArray(previous.opportunities)){previous.followups??=[];return previous;}
 }catch{}
 const data={contacts:[],opportunities:[],followups:[]};
 for(const [tenant,items] of Object.entries(demoSeeds))for(const [name,channel,title,amount,stage] of items){
  const id=crypto.randomUUID(),now=new Date().toISOString();
  data.contacts.push({id,tenant_id:tenant,name,channel,created_at:now,consent_status:'unknown'});
  data.opportunities.push({id:crypto.randomUUID(),tenant_id:tenant,contact_id:id,contact_name:name,channel,title,amount_cents:amount*100,stage,source:'demostración',created_at:now,updated_at:now});
 }
 saveDemo(data);return data;
}
function saveDemo(data){try{localStorage.setItem('conv-os-crm-v1',JSON.stringify(data))}catch{}}
let activeTenant=null;
export async function activateCrm({tenant,staticDemo,api,notify,escape,pesos}){
 const node=document.getElementById('crm-workspace');
 if(!node)return;
 activeTenant=tenant;
 const renderError=error=>{if(node.isConnected)node.innerHTML='<div class="crm-error">'+escape(error.message||String(error))+'</div>'};
 let data;
 let activeTab='pipeline';
 async function load(){
  if(staticDemo){
   const d=demoData();
   return {contacts:d.contacts.filter(x=>x.tenant_id===tenant),opportunities:d.opportunities.filter(x=>x.tenant_id===tenant),followups:d.followups.filter(x=>x.tenant_id===tenant)};
  }
  const [c,o,f]=await Promise.all([api('/crm/contacts'),api('/crm/opportunities'),api('/crm/followups')]);
  return {contacts:c.contacts,opportunities:o.opportunities,followups:f.followups};
 }
 function draw(){
  if(!node.isConnected||activeTenant!==tenant)return;
  const opportunities=data.opportunities;
  const won=opportunities.filter(x=>x.stage==='won'),open=opportunities.filter(x=>!['won','lost'].includes(x.stage));
  const money=won.reduce((a,x)=>a+x.amount_cents,0);
  const openTasks=data.followups.filter(t=>t.status==='open');
  const overdue=openTasks.filter(t=>Date.parse(t.due_at)<Date.now()).length;
  const cards=pipeline.map(([stage,label])=>{
   const list=opportunities.filter(x=>x.stage===stage);
   return `<div class="crm-lane"><div class="crm-lane-title"><span>${label}</span><b>${list.length}</b></div>
   ${list.map(op=>`<div class="crm-card"><strong>${escape(op.contact_name)}</strong>
    <span class="crm-card-description">${escape(op.title)}</span>
    <span class="crm-money">${pesos(op.amount_cents)}</span>
    <div class="crm-card-bottom"><span>${escape(channelNames[op.channel]||'Manual')}</span>
    ${transitions[stage].length?`<select aria-label="Mover oportunidad" data-move="${escape(op.id)}">
     <option value="">Mover a…</option>${transitions[stage].map(t=>`<option value="${t}">${pipeline.find(p=>p[0]===t)?.[1]}</option>`).join('')}</select>`:''}</div>
   </div>`).join('')||'<div class="crm-empty">Sin oportunidades</div>'}</div>`;
  }).join('');
  node.innerHTML=`<div class="crm-metrics">
   <div class="crm-metric"><small>Contactos</small><b>${data.contacts.length}</b></div>
   <div class="crm-metric"><small>Oportunidades abiertas</small><b>${open.length}</b></div>
   <div class="crm-metric"><small>Negocios ganados*</small><b>${won.length}</b></div>
   <div class="crm-metric"><small>Valor ganado*</small><b>${pesos(money)}</b></div></div>
   <div class="crm-notice">* Valores declarados de demostración; una oportunidad ganada no acredita pago. No hay conexión a Meta ni a bancos. Seguimientos pendientes: ${openTasks.length}; vencidos: ${overdue}.</div>
   <nav class="crm-section-nav" role="tablist" aria-label="Áreas comerciales">
    ${[['pipeline','Oportunidades'],['followups','Seguimientos'],['quotes','Cotizaciones'],['privacy','Privacidad']].map(([id,label])=>`<button type="button" role="tab" data-crm-tab="${id}" aria-selected="${activeTab===id}">${label}</button>`).join('')}
   </nav>
   <div class="crm-tab-panel" data-crm-section="pipeline" ${activeTab==='pipeline'?'':'hidden'}>
   <div class="crm-toolbar"><div><div class="crm-title">Embudo comercial</div><div class="crm-subtitle">Oportunidades aisladas para esta empresa</div></div><span class="crm-demo-pill">MODO LABORATORIO</span></div>
   <div class="crm-board">${cards}</div>
   <div class="crm-forms">
    <section class="crm-form-panel"><h2>Nuevo contacto</h2>
     <form id="crm-contact-form"><label for="crm-name">Nombre / empresa</label>
     <input required maxlength="120" name="name" id="crm-name" placeholder="Cliente o empresa de prueba">
     <label for="crm-channel">Canal de origen</label><select id="crm-channel" name="channel">
     ${Object.entries(channelNames).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>
     <button class="btn primary" type="submit">+ Registrar contacto</button></form></section>
    <section class="crm-form-panel"><h2>Nueva oportunidad</h2>
     <form id="crm-opportunity-form"><label for="crm-contact">Contacto</label>
     <select name="contact_id" id="crm-contact" required><option value="">Selecciona un contacto</option>
     ${data.contacts.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')}</select>
     <label for="crm-title">Producto o servicio</label><input maxlength="160" name="title" id="crm-title" required placeholder="Qué necesita el cliente">
     <label for="crm-amount">Valor estimado (CLP)</label>
     <input name="amount" id="crm-amount" type="number" min="0" max="1000000000" step="1" value="0" required>
     <button class="btn primary" type="submit">+ Crear oportunidad</button></form></section>
   </div></div>
   <div class="crm-tab-panel" data-crm-section="followups" ${activeTab==='followups'?'':'hidden'}>
    <div class="crm-toolbar"><div><div class="crm-title">Seguimientos y próximas acciones</div><div class="crm-subtitle">Crea tareas por oportunidad y evita olvidar clientes.</div></div></div>
    <div class="crm-forms">
    <section class="crm-form-panel"><h2>Programar seguimiento</h2>
     <form id="crm-followup-form">
      <label for="crm-followup-opp">Oportunidad</label>
      <select name="opportunity_id" id="crm-followup-opp" required>
       <option value="">Selecciona una oportunidad</option>
       ${opportunities.filter(o=>!['won','lost'].includes(o.stage)).map(o=>`<option value="${escape(o.id)}">${escape(o.contact_name)} · ${escape(o.title)}</option>`).join('')}
      </select>
      <label for="crm-followup-title">Próxima acción</label><input required maxlength="160" name="title" id="crm-followup-title" placeholder="Ej.: enviar cotización revisada">
      <label for="crm-followup-date">Fecha y hora</label><input type="datetime-local" name="due_at" id="crm-followup-date" required>
      <button class="btn primary" type="submit">+ Guardar recordatorio</button>
     </form>
    </section>
    <section class="crm-form-panel"><h2>Seguimientos pendientes</h2>
     <div class="crm-followups">
      ${data.followups.filter(t=>t.status==='open').map(t=>`<div class="crm-followup-row">
       <div><strong>${escape(t.title)}</strong><small>${escape(t.contact_name||opportunities.find(o=>o.id===t.opportunity_id)?.contact_name||'Contacto')}
       · ${escape(new Date(t.due_at).toLocaleString('es-CL'))}</small></div>
       <button class="btn" type="button" data-complete="${escape(t.id)}">Completar</button>
      </div>`).join('')||'<div class="crm-empty">No hay tareas abiertas</div>'}
     </div>
    </section>
   </div></div>
   <section id="commercial-workspace" data-crm-section="quotes" aria-label="Cotizaciones comerciales" class="crm-workspace crm-tab-panel" ${activeTab==='quotes'?'':'hidden'}></section>
   <section id="consent-workspace" data-crm-section="privacy" aria-label="Privacidad y preferencias" class="crm-workspace crm-tab-panel" ${activeTab==='privacy'?'':'hidden'}></section>`;
  activateCommercial({tenant,staticDemo,api,notify,escape,pesos,opportunities:data.opportunities});
  activateConsent({tenant,staticDemo,api,notify,escape,contacts:data.contacts});
 }
 try{data=await load();draw()}catch(e){renderError(e);return}
 node.addEventListener('click',e=>{
  const button=e.target.closest('[data-crm-tab]');
  if(!button)return;
  const selected=button.dataset.crmTab;
  if(!['pipeline','followups','quotes','privacy'].includes(selected))return;
  activeTab=selected;
  node.querySelectorAll('[data-crm-section]').forEach(panel=>{panel.hidden=panel.dataset.crmSection!==selected});
  node.querySelectorAll('[data-crm-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.crmTab===selected)));
 });
  node.addEventListener('submit',async e=>{
  const form=e.target;if(!['crm-contact-form','crm-opportunity-form','crm-followup-form'].includes(form.id))return;
  e.preventDefault();
  const button=form.querySelector('[type="submit"]');button.disabled=true;
  const body=Object.fromEntries(new FormData(form));
  try{
   if(form.id==='crm-contact-form'){
    if(staticDemo){const d=demoData(),now=new Date().toISOString();d.contacts.push({id:crypto.randomUUID(),tenant_id:tenant,name:body.name.trim(),channel:body.channel,created_at:now,consent_status:'unknown'});saveDemo(d)}
    else await api('/crm/contacts','POST',{name:body.name,channel:body.channel});
   }else if(form.id==='crm-followup-form'){
    if(!body.opportunity_id)throw Error('Selecciona una oportunidad');
    const date=new Date(body.due_at);
    if(!Number.isFinite(date.getTime()))throw Error('Fecha inválida');
    const due_at=date.toISOString();
    if(staticDemo){
     const d=demoData();
     if(!d.opportunities.some(o=>o.id===body.opportunity_id&&o.tenant_id===tenant))throw Error('Oportunidad inválida');
     d.followups.push({id:crypto.randomUUID(),tenant_id:tenant,opportunity_id:body.opportunity_id,title:String(body.title).trim(),due_at,status:'open',created_at:new Date().toISOString(),completed_at:null});
     saveDemo(d);
    }else await api('/crm/followups','POST',{opportunity_id:body.opportunity_id,title:body.title,due_at});
   }else{
    if(!body.contact_id)throw Error('Selecciona un contacto');
    const cents=Number(body.amount)*100;
    if(!Number.isSafeInteger(cents)||cents<0)throw Error('Importe inválido');
    if(staticDemo){
     const d=demoData(),contact=d.contacts.find(x=>x.id===body.contact_id&&x.tenant_id===tenant);
     if(!contact)throw Error('Contacto no encontrado en esta empresa');
     const now=new Date().toISOString();
     d.opportunities.push({id:crypto.randomUUID(),tenant_id:tenant,contact_id:contact.id,contact_name:contact.name,channel:contact.channel,title:body.title.trim(),amount_cents:cents,stage:'new',source:'manual',created_at:now,updated_at:now});
     saveDemo(d);
    }else await api('/crm/opportunities','POST',{contact_id:body.contact_id,title:body.title,amount_cents:cents,source:'manual'});
   }
   data=await load();draw();notify('Registro creado en el entorno de demostración');
  }catch(error){notify(error.message);button.disabled=false}
 });
 node.addEventListener('click',async e=>{
  const button=e.target.closest('[data-complete]');
  if(!button)return;
  button.disabled=true;
  const id=button.dataset.complete;
  try{
   if(staticDemo){
    const d=demoData(),task=d.followups.find(x=>x.id===id&&x.tenant_id===tenant);
    if(!task||task.status!=='open')throw Error('Seguimiento no disponible');
    task.status='completed';task.completed_at=new Date().toISOString();saveDemo(d);
   }else await api('/crm/followups/'+encodeURIComponent(id)+'/complete','POST',{});
   data=await load();draw();notify('Seguimiento completado');
  }catch(error){notify(error.message);button.disabled=false}
 });
 node.addEventListener('change',async e=>{
  const selector=e.target.closest('[data-move]');
  if(!selector||!selector.value)return;
  const id=selector.dataset.move,stage=selector.value;selector.disabled=true;
  try{
   if(staticDemo){
    const d=demoData(),op=d.opportunities.find(x=>x.id===id&&x.tenant_id===tenant);
    if(!op||!transitions[op.stage].includes(stage))throw Error('Transición no permitida');
    op.stage=stage;op.updated_at=new Date().toISOString();saveDemo(d);
   }else await api('/crm/opportunities/'+encodeURIComponent(id)+'/stage','POST',{stage});
   data=await load();draw();notify('Etapa comercial actualizada');
  }catch(error){notify(error.message);selector.disabled=false}
 });
}

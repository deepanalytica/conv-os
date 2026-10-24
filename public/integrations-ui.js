// Acquisition OS · Meta connection center.
// Never marks a channel as connected without authenticated OAuth and webhook evidence.
const providers=[
 {id:'instagram',initial:'◎',short:'IG',name:'Instagram Direct',
  className:'ig',detail:'Consultas por mensaje directo de cuentas profesionales.',
  scope:'instagram_business_basic · instagram_business_manage_messages',
  docs:'https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login',
  note:'Se requiere Instagram profesional y autorización por Instagram Login.'},
 {id:'messenger',initial:'f',short:'FB',name:'Facebook Messenger',
  className:'fb',detail:'Mensajes recibidos por las páginas de cada empresa.',
  scope:'pages_show_list · pages_messaging · pages_manage_metadata',
  docs:'https://developers.facebook.com/docs/messenger-platform/',
  note:'Se requiere una página de Facebook con permisos y App Review cuando corresponda.'},
 {id:'whatsapp',initial:'◉',short:'WA',name:'WhatsApp Business',
  className:'wa',detail:'Conversaciones de clientes mediante la API oficial de WhatsApp.',
  scope:'whatsapp_business_management · whatsapp_business_messaging',
  docs:'https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup',
  note:'Conservar el número actual: primero verificar el flujo oficial de coexistencia. No migrar la cuenta.'}
];
function statusLine(s){
 if(!s)return 'Sin verificar';
 if(s.status==='CONNECTED')return 'Conectado';
 if(s.status==='REAUTH_REQUIRED')return 'Reautorización requerida';
 return 'Sin conectar';
}
function getDemo(){
 return {mode:'LABORATORY',server:'LOCAL_ONLY',outbound_enabled:false,inbound_enabled:false,
  real_accounts_connected:0,metadata_event_counts:[],
  configured:{metaApp:false,gateway:false,appReview:false,coexistenceEligibility:'NOT_VERIFIED'},
  channels:providers.map(p=>({id:p.id,status:'NOT_CONNECTED',last_verified_at:null}))};
}
export async function activateIntegrations({api,staticDemo,escape,notify,tenantName}){
 const root=document.getElementById('integration-workspace');
 if(!root)return;
 let current;
 async function fetchStatus(){
  if(staticDemo)return getDemo();
  return api('/integrations/status');
 }
 const checklist=[
  ['01','Meta Business Portfolio','Comprobar qué Página de Facebook e Instagram profesional pertenecen a cada marca.'],
  ['02','Aplicación en Meta for Developers','Configurar productos, permisos mínimos, modo de prueba y revisión de la aplicación.'],
  ['03','Receptor HTTPS independiente','Desplegar gateway firmado en Cloudflare; nunca abrir el puerto del panel Windows.'],
  ['04','Autorización de cada marca','Completar el flujo oficial de Meta para cada cuenta, sin pegar tokens en el navegador.'],
  ['05','Prueba de extremo a extremo','Confirmar el identificador de la cuenta, evento firmado y separación de empresas antes de habilitar recepción.']
 ];
 function render(status){
  if(!root.isConnected)return;
  const cards=providers.map(p=>{
   const providerState=status.channels?.find(s=>s.id===p.id);
   const state=statusLine(providerState);
   return `<article class="connect-card"><div class="connect-card-head">
    <div class="connect-platform-logo ${p.className}" aria-hidden="true">${p.initial}</div>
    <div><h3>${escape(p.name)}</h3><span class="connect-fine">${escape(p.short)} · Meta</span></div>
   </div><p>${escape(p.detail)}</p>
   <div><span class="connect-status">${escape(state)}</span></div>
   <div class="connect-footer">
    <span class="connect-fine">${escape(p.note)}</span>
    <a href="${p.docs}" target="_blank" rel="noopener noreferrer">Consultar documentación oficial ↗</a>
    <button type="button" class="btn" data-open-details="${p.id}">Requisitos de conexión ↗</button>
   </div></article>`;
  }).join('');
  root.innerHTML=`<section class="connect-shell">
   <div class="connect-head">
    <div><div class="workspace-eyebrow">CONEXIONES / ${escape(tenantName)}</div>
     <strong>Un centro. Tres canales. Autorización por empresa.</strong>
     <p>Vincularemos solo cuentas oficiales y verificadas. Hasta terminar OAuth y validar eventos firmados, ningún canal aparecerá como activo.</p>
    </div>
    <button type="button" class="btn" id="refresh-integrations">↻ Verificar estado</button>
   </div>
   <div class="workspace-utility"><div>
    <div class="workspace-eyebrow">ESTADO DEL SISTEMA</div>
    <h2>${Number(status.real_accounts_connected||0)} cuentas conectadas · receptor local aislado</h2>
    <p>Metadatos locales importados: ${(status.metadata_event_counts||[]).reduce((n,row)=>n+Number(row.events||0),0)} · Envíos automáticos deshabilitados.</p>
   </div><span class="workspace-pill">MODO SEGURO · LABORATORIO</span></div>
   <div class="connect-grid">${cards}</div>
   <div class="connect-warning"><strong>WhatsApp actual:</strong> no desinstales WhatsApp Business, no elimines la cuenta y no migres tu número por el registro convencional. La posibilidad de coexistencia depende de los requisitos de Meta y de tu cuenta.</div>
   <div class="crm-toolbar" style="margin-top:13px"><div>
    <div class="crm-title">Ruta de activación segura</div>
    <div class="crm-subtitle">Cinco controles verificables; no se marcarán completos mediante una casilla.</div>
   </div></div>
   <div class="connect-checklist">${checklist.map(([n,label,detail])=>`<div class="connect-step">
    <span class="number">${n}</span><div><strong>${escape(label)}</strong><p>${escape(detail)}</p></div>
   </div>`).join('')}</div>
   <div class="connect-technical">
    <div class="workspace-eyebrow">DIAGNÓSTICO DE CAPACIDADES</div>
    <dl><dt>Identificador público de aplicación Meta configurado</dt><dd>${status.configured?.metaApp?'Presente, sin OAuth verificado':'No configurado'}</dd>
    <dt>Gateway HTTPS definido</dt><dd>${status.configured?.gateway?'URL registrada, todavía sin confianza verificada':'No desplegado / no configurado'}</dd>
    <dt>Permisos de aplicación</dt><dd>${status.configured?.appReview?'Declarados como aprobados: falta comprobarlo contra Meta':'Revisión externa pendiente'}</dd>
    <dt>Autorización de envío y tratamiento de datos</dt><dd>Bloqueada por diseño</dd></dl>
   </div>
   <div id="integration-detail" aria-live="polite"></div>
  </section>`;
 }
 async function refresh(){
  try{current=await fetchStatus();render(current)}
  catch(error){if(root.isConnected)root.textContent='No se pudo verificar el estado: '+(error.message||'Error')}
 }
 root.addEventListener('click',async e=>{
  const button=e.target.closest('[data-open-details]');
  if(button){
   const p=providers.find(c=>c.id===button.dataset.openDetails);
   if(!p)return;
   const el=root.querySelector('#integration-detail');
   el.innerHTML=`<section class="connect-technical" style="margin-top:13px">
    <div class="workspace-eyebrow">REQUISITOS / ${escape(p.name)}</div>
    <h3 style="margin:9px 0;font-size:15px">${escape(p.name)}</h3>
    <p style="font-size:12px;color:var(--ux-muted);line-height:1.7">${escape(p.note)}</p>
    <dt style="font-size:11px">Permisos o productos a solicitar</dt>
    <dd style="font-size:12px;margin:7px 0 14px">${escape(p.scope)}</dd>
    <p class="connect-fine">El inicio de sesión real requiere un callback HTTPS seguro, App ID, App Secret y las autorizaciones correspondientes. Esta pantalla no recolecta credenciales.</p>
    <button class="btn" type="button" id="close-integration-detail">Cerrar detalles</button>
   </section>`;
   return;
  }
  if(e.target.closest('#close-integration-detail')){root.querySelector('#integration-detail').textContent='';return}
  if(e.target.closest('#refresh-integrations')){await refresh();notify('Estado comprobado: no se han registrado cuentas oficiales')}
 });
 await refresh();
}

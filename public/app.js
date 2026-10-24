import {activateCrm} from './crm-ui.js';
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const staticDemo=location.hostname.endsWith('.github.io')||location.protocol==='file:';
const demoTenants=[
 {id:'demo-food',name:'Negocio gastronómico',segment:'food'},
 {id:'demo-service',name:'Servicios técnicos',segment:'service'},
 {id:'demo-distribution',name:'Distribuidora',segment:'distribution'},
 {id:'demo-wal',name:'WAL · Regalos personalizados',segment:'retail'},
 {id:'demo-vaa',name:'Visual Art AI',segment:'services'}
];
const demoCatalog={
 'demo-food':[{id:'p1',name:'Producto clásico',price_cents:299000},{id:'p2',name:'Promoción familiar',price_cents:1099000}],
 'demo-service':[{id:'p1',name:'Visita técnica',price_cents:1500000},{id:'p2',name:'Mantención',price_cents:3990000}],
 'demo-distribution':[{id:'p1',name:'Caja de insumos',price_cents:1299000},{id:'p2',name:'Paquete mayorista',price_cents:4999000}],
 'demo-wal':[{id:'mug',name:'Tazón personalizado',price_cents:1999000},{id:'gift-pack',name:'Pack de regalo',price_cents:6999000}],
 'demo-vaa':[{id:'audit',name:'Diagnóstico de presencia digital',price_cents:15000000},{id:'automation',name:'Automatización comercial',price_cents:35000000}]
};
let state={tenant:'demo-wal',tenants:demoTenants,orders:[],products:[],events:[],view:'crm',filter:'all',modal:false,loading:true};
const labels={draft:'Borrador',awaiting_payment:'Pago pendiente',paid:'Pago simulado',in_progress:'En proceso',ready:'Listo',out_for_delivery:'En despacho',completed:'Finalizado',cancelled:'Cancelado'};
const next={draft:'awaiting_payment',awaiting_payment:'paid',paid:'in_progress',in_progress:'ready',ready:'out_for_delivery',out_for_delivery:'completed'};
const tone=s=>s==='completed'?'green':s==='awaiting_payment'?'orange':s==='paid'?'purple':s==='cancelled'?'red':'';
const pesos=c=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(c/100);
const time=s=>new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit'}).format(new Date(s));
function notify(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),3300)}
function demoRead(){try{return JSON.parse(localStorage.getItem('conv-os-demo-v2')||'{}')}catch{return {}}}
function demoWrite(data){try{localStorage.setItem('conv-os-demo-v2',JSON.stringify(data))}catch{}}
function seed(){
 const saved=demoRead();
 if(Array.isArray(saved.orders))return saved;
 const stamp=new Date().toISOString();
 const orders=[
 {id:'DEMO-1048',tenant_id:'demo-food',status:'paid',customer:'Cliente de ejemplo 01',total_cents:598000,created_at:stamp,items:[{productId:'p1',qty:2}],verified_at:stamp},
 {id:'DEMO-1049',tenant_id:'demo-food',status:'awaiting_payment',customer:'Cliente de ejemplo 02',total_cents:1099000,created_at:stamp,items:[{productId:'p2',qty:1}],verified_at:null},
 {id:'DEMO-1050',tenant_id:'demo-food',status:'in_progress',customer:'Cliente de ejemplo 03',total_cents:299000,created_at:stamp,items:[{productId:'p1',qty:1}],verified_at:stamp},
 {id:'DEMO-1051',tenant_id:'demo-service',status:'awaiting_payment',customer:'Solicitud de mantenimiento',total_cents:3990000,created_at:stamp,items:[{productId:'p2',qty:1}],verified_at:null},
 {id:'DEMO-1052',tenant_id:'demo-distribution',status:'ready',customer:'Pedido de reposición',total_cents:1299000,created_at:stamp,items:[{productId:'p1',qty:1}],verified_at:stamp}
 ];
 const data={orders,events:[{id:'e1',tenant_id:'demo-food',kind:'created',description:'Nuevo pedido desde conversación simulada',created_at:stamp}]};
 demoWrite(data);return data;
}
async function api(path,method='GET',body=null){
 const res=await fetch('./api'+path,{method,headers:{'content-type':'application/json','authorization':'Bearer local-demo-token','x-tenant-id':state.tenant},body:body?JSON.stringify(body):undefined});
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'Error en la solicitud');
 return data;
}
async function refresh(){
 state.loading=true;
 try{
  if(staticDemo){
   const d=seed();
   state.tenants=demoTenants;state.orders=d.orders.filter(o=>o.tenant_id===state.tenant);
   state.products=demoCatalog[state.tenant];
   state.events=d.events.filter(e=>e.tenant_id===state.tenant);
  }else{
   const [ts,os,ps,overview]=await Promise.all([api('/tenants'),api('/orders'),api('/products'),api('/overview')]);
   state.tenants=ts.tenants;state.orders=os.orders;state.products=ps.products;state.events=overview.recent||[];
  }
 }catch(err){notify(err.message);state.orders=[];state.products=[];state.events=[]}
 state.loading=false;render();
}
async function mutate(action,id,value){
 try{
  if(staticDemo){
   const d=seed(),o=d.orders.find(o=>o.id===id&&o.tenant_id===state.tenant);
   if(!o)throw Error('Operación no encontrada');
   if(action==='payment'){
    if(o.status!=='awaiting_payment')throw Error('Pago no aplicable');
    o.status='paid';o.verified_at=new Date().toISOString();
   }else{
    if(next[o.status]!==value)throw Error('Transición no permitida');
    o.status=value;
   }
   d.events.unshift({id:crypto.randomUUID(),tenant_id:state.tenant,kind:action,description:action==='payment'?'Pago ficticio confirmado — solo demo':'Estado actualizado: '+labels[o.status],created_at:new Date().toISOString()});
   demoWrite(d);
  }else await api('/orders/'+encodeURIComponent(id)+'/'+(action==='payment'?'sandbox-payment':'status'),'POST',action==='payment'?{}:{status:value});
  notify(action==='payment'?'Pago SIMULADO, sin movimientos bancarios':'Estado actualizado');
  await refresh();
 }catch(err){notify(err.message)}
}
async function createOrder(event){
 event.preventDefault();
 const form=new FormData(event.currentTarget),product=state.products.find(x=>x.id===form.get('product'));
 const qty=Number(form.get('qty')),customer=String(form.get('customer')||'').trim();
 if(!product||!customer||!Number.isInteger(qty)||qty<1||qty>99){notify('Revisa el formulario');return}
 try{
  if(staticDemo){
   const d=seed();
   const o={id:'DEMO-'+String(Math.floor(Math.random()*90000)+10000),tenant_id:state.tenant,status:'awaiting_payment',customer:customer.slice(0,120),items:[{productId:product.id,qty}],total_cents:product.price_cents*qty,created_at:new Date().toISOString(),verified_at:null};
   d.orders.unshift(o);d.events.unshift({id:crypto.randomUUID(),tenant_id:state.tenant,kind:'created',description:'Pedido ficticio creado: '+o.id,created_at:o.created_at});demoWrite(d);
  }else await api('/orders','POST',{customer,items:[{productId:product.id,qty}]});
  state.modal=false;notify('Operación creada, pago pendiente');await refresh();
 }catch(err){notify(err.message)}
}
function modal(){
 return `<div class="modalback" id="modalback"><section role="dialog" aria-modal="true" aria-labelledby="modal-title" class="modal">
 <h2 id="modal-title">Nueva operación</h2><p>Crea un pedido de prueba. Los importes provienen del catálogo de cada negocio.</p>
 <div class="notice">ENTORNO DE DEMOSTRACIÓN · No genera pedidos ni cargos reales.</div>
 <form id="new-order">
 <div class="field"><label for="customer">Nombre o referencia</label><input required maxlength="120" class="input" name="customer" id="customer" placeholder="Cliente / solicitud"></div>
 <div class="field"><label for="product">Producto o servicio</label><select required class="select" id="product" name="product">${state.products.map(p=>`<option value="${escape(p.id)}">${escape(p.name)} · ${pesos(p.price_cents)}</option>`).join('')}</select></div>
 <div class="field"><label for="qty">Cantidad</label><input required class="input" id="qty" name="qty" type="number" min="1" max="99" value="1"></div>
 <div class="modalbuttons"><button type="button" class="btn ghost" id="close-modal">Cancelar</button><button type="submit" class="btn primary">Crear pedido ↗</button></div></form></section></div>`;
}
function action(o){
 if(o.status==='awaiting_payment')return `<button class="btn tiny" data-action="payment" data-id="${escape(o.id)}">Simular pago →</button>`;
 if(next[o.status])return `<button class="btn tiny" data-action="status" data-id="${escape(o.id)}" data-next="${next[o.status]}">Avanzar →</button>`;
 return '';
}

function inboxDemo(){
 const selected=state.orders.find(o=>o.id===state.chatOrder)||state.orders[0];
 const product=selected?state.products.find(p=>p.id===selected.items?.[0]?.productId):null;
 const moneyText=selected?pesos(selected.total_cents):'—';
 const paid=Boolean(selected?.verified_at);
 const stage=selected?(labels[selected.status]||selected.status):'Sin operación';
 const rows=state.orders.map(o=>'<button class="inbox-person '+(selected?.id===o.id?'selected':'')+'" data-chat-order="'+escape(o.id)+'"><span class="inbox-initial">'+escape(o.customer.slice(0,1).toUpperCase())+'</span><span class="inbox-person-copy"><strong>'+escape(o.customer)+'</strong><small>'+escape(state.products.find(p=>p.id===o.items?.[0]?.productId)?.name||'Consulta comercial')+'</small></span><span class="inbox-dot">●</span></button>').join('');
 const chat=selected?'<div class="chat-msg inbound">Hola, ¿tienen disponible '+escape(product?.name||'este producto')+'?</div><div class="chat-msg outbound">¡Hola! Te ayudo con tu pedido. ¿Cuántas unidades necesitas?</div><div class="chat-msg inbound">Quiero '+escape(selected.items?.[0]?.qty||1)+', por favor.</div><div class="chat-msg outbound chat-order"><span>RESUMEN DE OPERACIÓN</span><strong>'+escape(product?.name||'Pedido / servicio')+'</strong><b>'+moneyText+'</b><em>'+(paid?'✓ Pago de DEMO confirmado':'◷ Pago pendiente de verificar')+'</em></div><div class="chat-msg outbound">Estado registrado: <b>'+escape(stage)+'</b>.</div>':'<p class="empty">Sin conversaciones de ejemplo.</p>';
 return '<section class="inbox-workspace"><aside class="inbox-list"><div class="inbox-panel-heading"><strong>Conversaciones</strong><span>'+state.orders.length+' activas</span></div><div class="inbox-search">⌕ Buscar por nombre o pedido</div>'+rows+'<div class="inbox-caption">Conversaciones reconstruidas para la demostración. No son mensajes de WhatsApp.</div></aside><div class="inbox-thread"><header><span class="inbox-initial large">'+escape((selected?.customer||'?').slice(0,1))+'</span><div><strong>'+escape(selected?.customer||'Cliente')+'</strong><small>Vista ilustrativa · Sin conexión a Meta</small></div><span class="inbox-thread-online">●</span></header><div class="inbox-messages"><span class="inbox-today">FLUJO COMERCIAL DEMO</span>'+chat+'</div><footer><span>No se envían mensajes reales</span><button class="btn primary tiny" data-view="orders">Abrir operación ↗</button></footer></div><aside class="inbox-context"><div class="context-label">CONTEXTO COMERCIAL</div><h3>Todo conectado.</h3><p>El mensaje es solo el principio. Cada operación conserva estado, importe y siguiente paso.</p><div class="context-slice"><span>CLIENTE</span><strong>'+escape(selected?.customer||'—')+'</strong></div><div class="context-slice"><span>OPERACIÓN</span><strong>'+escape(selected?.id||'—')+'</strong><small>'+escape(stage)+'</small></div><div class="context-slice"><span>IMPORTE</span><strong>'+moneyText+'</strong><small>'+(paid?'Pago ficticio confirmado':'No existe pago verificado')+'</small></div><div class="context-slice"><span>PRÓXIMA ACCIÓN</span><strong>'+(paid?'Gestionar preparación o despacho':'Revisar pago y confirmar')+'</strong></div><button class="btn primary" data-view="orders">Ver tablero de operaciones →</button></aside></section>';
}

function render(){
 const active=state.orders.filter(x=>!['completed','cancelled'].includes(x.status));
 const pending=state.orders.filter(x=>x.status==='awaiting_payment').length;
 const completed=state.orders.filter(x=>x.status==='completed').length;
 const sum=state.orders.filter(x=>x.verified_at).reduce((a,b)=>a+b.total_cents,0);
 const current=state.tenants.find(x=>x.id===state.tenant)||demoTenants[0];
 const visible=state.orders.filter(o=>state.filter==='all'||o.status===state.filter);
 $('#app').innerHTML=`<div class="layout">
 <aside class="side">
   <div class="brand"><span class="symbol">◈</span><span>CONVERSATION <b>OPS</b><small>BUSINESS OPERATING SYSTEM</small></span></div>
   <nav aria-label="Navegación principal">
     <div class="subheading">ESPACIO DE TRABAJO</div>
     <button class="navbtn ${state.view==='overview'?'active':''}" data-view="overview"><span class="navicon">▦</span> Centro de mando</button>
     <button class="navbtn ${state.view==='inbox'?'active':''}" data-view="inbox"><span class="navicon">◎</span> Conversaciones</button>
     <button class="navbtn ${state.view==='crm'?'active':''}" data-view="crm"><span class="navicon">◇</span> Adquisición CRM</button>
     <button class="navbtn ${state.view==='orders'?'active':''}" data-view="orders"><span class="navicon">▤</span> Operaciones</button>
     <button class="navbtn ${state.view==='connections'?'active':''}" data-view="connections"><span class="navicon">⬡</span> Integraciones</button>
     <div class="subheading">PLATAFORMA</div>
     <button class="navbtn ${state.view==='settings'?'active':''}" data-view="settings"><span class="navicon">⚙</span> Configuración</button>
   </nav>
   <a class="sidebar-landing" href="./landing/">↗ &nbsp; Landing comercial</a><div class="spacer"></div>
   <div class="sidefoot"><span class="online"></span> Entorno de desarrollo<br>Sin conexión bancaria ni despacho real</div>
 </aside>
 <main class="main">
  <header class="topbar"><div class="crumb">Workspace &nbsp;/&nbsp; <strong>${escape(current.name)}</strong></div>
   <div class="actions"><button class="theme-toggle" data-theme-toggle type="button" aria-label="Cambiar tema" aria-pressed="false">☼ <span>Modo claro</span></button><span class="badge orange">◉ DEMOSTRACIÓN</span><select class="select" id="tenant-select" aria-label="Empresa">${state.tenants.map(t=>`<option value="${escape(t.id)}" ${t.id===state.tenant?'selected':''}>${escape(t.name)}</option>`).join('')}</select></div>
  </header>
  <section class="hero"><div><div class="eyebrow">OPERACIONES · EN TIEMPO REAL</div>
   <h1>${state.view==='inbox'?'Bandeja de conversaciones':state.view==='orders'?'Gestión de operaciones':state.view==='crm'?'Adquisición y oportunidades':state.view==='connections'?'Integraciones y canales':state.view==='settings'?'Configuración del espacio':'Convierte mensajes en operaciones.'}</h1>
   <p>${state.view==='inbox'?'Conversaciones ilustrativas vinculadas al estado real de cada operación de prueba.':state.view==='crm'?'Gestiona contactos, califica oportunidades y mide resultados comerciales por empresa.':state.view==='connections'?'WhatsApp, pagos y rutas se habilitan después de validar credenciales.':state.view==='settings'?'Configuración independiente por empresa y catálogo.':'De cada conversación a una operación organizada, con trazabilidad y estados claros.'}</p>
   </div><button class="btn primary" id="add-order">＋ Nueva operación</button></section>
  ${state.view==='crm'?'<section id="crm-workspace" class="crm-workspace" aria-label="CRM de demostración"></section>':state.view==='inbox'?inboxDemo():state.view==='connections'?`<div class="bottom"><div class="feature"><span class="ico">◎</span><div><b>Instagram Direct</b><small>OAuth y webhooks pendientes</small></div></div><div class="feature"><span class="ico">◈</span><div><b>Facebook Messenger</b><small>Permisos de página pendientes</small></div></div><div class="feature"><span class="ico">◉</span><div><b>WhatsApp Business</b><small>Cloud API · evaluar coexistencia del número actual</small></div></div></div><div class="bottom"><div class="feature"><span class="ico">▣</span><div><b>Pagos</b><small>Solo simulación · sin cargos</small></div></div><div class="feature"><span class="ico">⌖</span><div><b>Rutas</b><small>ETA real pendiente</small></div></div><div class="feature"><span class="ico">◇</span><div><b>Integraciones oficiales</b><small>No se han vinculado cuentas reales</small></div></div></div>`:
   state.view==='settings'?`<section class="panel" style="padding:25px"><h2>${escape(current.name)}</h2><p style="color:var(--muted);font-size:13px">Segmento: ${escape(current.segment)} · ID: ${escape(current.id)}</p><p style="color:var(--muted);font-size:13px">Productos configurados: ${state.products.length}. La edición del catálogo y los permisos de producción están en la hoja de ruta.</p></section>`:
  `<div class="premium-hero"><div class="hero-left"><span class="hero-eyebrow">● WHATSAPP-FIRST OPERATIONS</span><h2>Una conversación.<br>Todo tu <em>negocio en movimiento.</em></h2><p>Consultas, pedidos, cobros y seguimiento. La información deja de vivir perdida entre chats y se convierte en un sistema operativo comercial.</p><div class="hero-buttons"><button class="btn primary" data-view="inbox">Explorar bandeja ↗</button><button class="btn ghost" data-view="orders">Ver flujo de pedidos →</button></div></div><div class="hero-right"><div class="hero-overline">OPERACIÓN COMERCIAL · DEMO</div><div class="hero-big">${pesos(sum)}</div><p>Cobros simulados registrados</p><div class="hero-divider"></div><div><span>Operaciones en seguimiento</span><b>${active.length}</b></div><div><span>Pendientes de cobro</span><b>${pending}</b></div><div><span>Empresa seleccionada</span><b>${escape(current.name)}</b></div><footer>CONVERSACIÓN → PEDIDO → PAGO → ENTREGA</footer></div></div><div class="stats">
   <div class="stat"><div class="k">OPERACIONES <span class="bubble">▤</span></div><div class="v">${state.orders.length}</div><div class="foot">Registradas en este espacio</div></div>
   <div class="stat"><div class="k">EN PROCESO <span class="bubble">⌛</span></div><div class="v">${active.length}</div><div class="foot">Requieren seguimiento</div></div>
   <div class="stat"><div class="k">PAGOS PENDIENTES <span class="bubble">◫</span></div><div class="v">${pending}</div><div class="foot">No confirmados por proveedor</div></div>
   <div class="stat"><div class="k">IMPORTE DE DEMO <span class="bubble">↗</span></div><div class="v">${pesos(sum)}</div><div class="foot">${completed} operaciones completadas · Sin dinero real</div></div>
  </div>
<section class="journey-section" aria-label="Ciclo operativo completo"><div class="journey-head"><div><span class="journey-eyebrow">NÚCLEO OPERATIVO · 9 ETAPAS</span><h2>De WhatsApp a una operación terminada.</h2><p>Un mismo motor para restaurantes, distribuidores y servicios. Cada paso conserva responsables, estados y evidencia.</p></div><span class="journey-mark">CONVERSACIÓN → RESULTADOS</span></div><div class="journey-track"><button type="button" class="journey-stage" data-view="inbox" aria-label="Explorar Conversación"><span class="journey-number">01</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#chat"></use></svg><strong>Conversación</strong><small>Consulta del cliente</small></button><button type="button" class="journey-stage" data-view="inbox" aria-label="Explorar Calificación"><span class="journey-number">02</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#contact"></use></svg><strong>Calificación</strong><small>Necesidad y contacto</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Pedido / servicio"><span class="journey-number">03</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#order"></use></svg><strong>Pedido / servicio</strong><small>Orden estructurada</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Cobro"><span class="journey-number">04</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#payment"></use></svg><strong>Cobro</strong><small>Enlace o transferencia</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Verificación"><span class="journey-number">05</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#verify"></use></svg><strong>Verificación</strong><small>Confirmación fiable</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Preparación"><span class="journey-number">06</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#prep"></use></svg><strong>Preparación</strong><small>Trabajo en ejecución</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Despacho / agenda"><span class="journey-number">07</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#delivery"></use></svg><strong>Despacho / agenda</strong><small>Ruta o visita</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Entrega"><span class="journey-number">08</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#complete"></use></svg><strong>Entrega</strong><small>Cierre registrado</small></button><button type="button" class="journey-stage" data-view="orders" aria-label="Explorar Métricas"><span class="journey-number">09</span><svg class="journey-icon" aria-hidden="true"><use href="./assets/icons.svg#analytics"></use></svg><strong>Métricas</strong><small>Resultados y calidad</small></button></div><p class="journey-foot">Vista de demostración: WhatsApp, los pagos bancarios y las rutas reales todavía no están conectados.</p></section>
  <div class="grid2"><section class="panel"><div class="panelhead"><div><strong>Flujo de operaciones</strong><br><span>Solicitudes organizadas por etapa</span></div><span>${state.orders.length} registros</span></div>
   <div class="tabs">${[['all','Todas'],['awaiting_payment','Por cobrar'],['paid','Pagadas*'],['in_progress','En proceso'],['completed','Finalizadas']].map(t=>`<button class="tab ${state.filter===t[0]?'active':''}" data-filter="${t[0]}">${t[1]}</button>`).join('')}</div>
   <div class="rows">${visible.length?visible.map(o=>`<div class="order"><div class="avatar">${escape(o.customer.slice(0,2).toUpperCase())}</div><div class="info"><div class="name">${escape(o.customer)}</div><div class="desc">#${escape(o.id.slice(0,13))} · ${time(o.created_at)} · ${o.items.length} línea(s)</div></div><div class="meta"><span class="money">${pesos(o.total_cents)}</span><span class="badge ${tone(o.status)}">${escape(labels[o.status]||o.status)}</span>${action(o)}</div></div>`).join(''):'<div class="empty">No hay operaciones en esta etapa.</div>'}</div>
  </section><section class="panel"><div class="panelhead"><div><strong>Actividad reciente</strong><br><span>Historial de eventos</span></div><span>Auditoría</span></div><div class="timeline">${state.events.length?state.events.slice(0,9).map(e=>`<div class="event"><div class="eventico">↗</div><div class="copy">${escape(e.description)}<time>${time(e.created_at)}</time></div></div>`).join(''):'<div class="empty">Los nuevos eventos aparecerán aquí.</div>'}</div></section></div>
  <div class="bottom"><div class="feature"><span class="ico">◎</span><div><b>Espacios independientes</b><small>Tres sectores en un mismo núcleo</small></div></div><div class="feature"><span class="ico">▣</span><div><b>Estados controlados</b><small>Sin pagos aprobados por la IA</small></div></div><div class="feature"><span class="ico">◇</span><div><b>Diseño modular</b><small>Preparado para ampliar funciones</small></div></div></div>`}
  <div class="statusfoot"><span>* Todos los pagos mostrados son ficticios en esta demostración.</span><span>CONV-OS · PREMIUM PREVIEW v0.3</span></div>
 </main></div>${state.modal?modal():''}`;
 bind();
}
function bind(){
 $('#tenant-select')?.addEventListener('change',async e=>{state.tenant=e.target.value;state.filter='all';await refresh()});
 $('#add-order')?.addEventListener('click',()=>{state.modal=true;render()});
 $('#close-modal')?.addEventListener('click',()=>{state.modal=false;render()});
 $('#new-order')?.addEventListener('submit',createOrder);
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;state.filter='all';render()}));
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;render()}));
 document.querySelectorAll('[data-chat-order]').forEach(b=>b.addEventListener('click',()=>{state.chatOrder=b.dataset.chatOrder;render()}));
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>mutate(b.dataset.action,b.dataset.id,b.dataset.next)));
 if(state.view==='crm')activateCrm({tenant:state.tenant,staticDemo,api,notify,escape,pesos});
}
refresh();

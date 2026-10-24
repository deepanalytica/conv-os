// Aurora Glass: data-driven commercial command center.
// Works with isolated local API records. On GitHub Pages all values are SAMPLE or NOT_CONNECTED.
const CHANNEL_LABELS={instagram:'Instagram',facebook:'Facebook',whatsapp:'WhatsApp',manual:'Registro manual'};
const STAGE_ORDER=[['new','Nuevo'],['qualified','Calificado'],['proposal','Propuesta'],['negotiation','Negociación'],['won','Ganado'],['lost','Perdido']];
const DEMO_RECORDS=[
 ['demo-wal','instagram','new',1999000],['demo-wal','whatsapp','proposal',6999000],
 ['demo-vaa','facebook','qualified',15000000],['demo-vaa','instagram','proposal',35000000]
];
const NODATA='Sin datos';
function rawDemo(){
 try{
  const d=JSON.parse(localStorage.getItem('conv-os-crm-v1')||'null');
  return d&&Array.isArray(d.contacts)&&Array.isArray(d.opportunities)?d:null;
 }catch{return null}
}
function demoAnalytics(tenant,days){
 const d=rawDemo();
 const baseline=DEMO_RECORDS.filter(r=>r[0]===tenant);
 const contacts=d?d.contacts.filter(c=>c.tenant_id===tenant):baseline.map((r,i)=>({id:'example-'+i,channel:r[1],created_at:new Date().toISOString()}));
 const opp=d?d.opportunities.filter(o=>o.tenant_id===tenant):baseline.map((r,i)=>({id:'example-'+i,contact_id:'example-'+i,stage:r[2],amount_cents:r[3],created_at:new Date().toISOString(),channel:r[1]}));
 const cById=new Map(contacts.map(c=>[c.id,c]));
 const channels=['instagram','facebook','whatsapp','manual'].map(channel=>({
  channel,contacts:contacts.filter(c=>c.channel===channel).length,
  opportunities:opp.filter(o=>(o.channel||cById.get(o.contact_id)?.channel)===channel).length
 }));
 const stages=STAGE_ORDER.map(([stage,label])=>({stage,label,count:opp.filter(o=>o.stage===stage).length,
  estimated_value_cents:opp.filter(o=>o.stage===stage).reduce((n,o)=>n+o.amount_cents,0)}));
 const count=days===7?7:days===30?6:13;
 const series=Array.from({length:count},(_,i)=>({label:String(i+1).padStart(2,'0'),
  contacts:i===count-1?contacts.length:0,opportunities:i===count-1?opp.length:0}));
 const tasks=d?d.followups||[]:[];
 const quotes=(()=>{try{const q=JSON.parse(localStorage.getItem('conv-os-quotes-demo-v1')||'{}');return (q.quotes||[]).filter(x=>x.tenant_id===tenant)}catch{return []}})();
 const open=opp.filter(o=>!['won','lost'].includes(o.stage)),won=opp.filter(o=>o.stage==='won');
 return {tenant_id:tenant,period_days:days,mode:'SYNTHETIC_DEMO',as_of:new Date().toISOString(),
  coverage:{contacts:contacts.length,opportunities:opp.length,quotes:quotes.length},
  kpis:{
   contacts_total:contacts.length,contacts_period:contacts.length,opportunities_open:open.length,
   opportunities_won_declarations:won.length,pipeline_open_estimated_cents:open.reduce((n,o)=>n+o.amount_cents,0),
   won_declared_estimated_cents:won.reduce((n,o)=>n+o.amount_cents,0),
   followups_open:tasks.filter(t=>t.status==='open').length,followups_overdue:tasks.filter(t=>t.status==='open'&&Date.parse(t.due_at)<Date.now()).length,
   quote_drafts:quotes.length,quoted_estimated_cents:quotes.length?quotes.reduce((n,q)=>n+q.subtotal_cents,0):null,
   direct_contribution_estimated_cents:null,verified_revenue_cents:null,spend_cents:null,cac_cents:null,roas:null,average_response_seconds:null
  },stages,channels,series,review_queue:[],
  evidence:{contacts:'Demo local no conectada',opportunities:'Registros ficticios',revenue:'NOT_INTEGRATED',marketing_spend:'NOT_INTEGRATED',
    caveat:'Estos datos son ilustrativos. No hay integración real con plataformas, gastos ni pagos.'}};
}
function line(points){
 if(!points.length)return '';
 const max=Math.max(...points,1);
 return points.map((v,i)=>`${i?'L':'M'}${(i/(points.length-1||1)*100).toFixed(2)},${(81-v/max*62).toFixed(2)}`).join(' ');
}
function softArea(points){const path=line(points);return path?path+' L100,90 L0,90 Z':''}
function trendChart(data){
 const p1=data.series.map(x=>x.contacts),p2=data.series.map(x=>x.opportunities);
 const labels=data.series.map(x=>x.label);
 const max=Math.max(...p1,...p2,1);
 return `<div class="prism-chart-wrap">
 <svg viewBox="0 0 640 265" role="img" aria-label="Contactos y oportunidades registrados por período, sin cifras simuladas como reales">
 <defs>
 <linearGradient id="prism-area-one" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e94df1" stop-opacity=".37"/><stop offset="1" stop-color="#e94df1" stop-opacity="0"/></linearGradient>
 <linearGradient id="prism-area-two" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3bd7ff" stop-opacity=".24"/><stop offset="1" stop-color="#3bd7ff" stop-opacity="0"/></linearGradient>
 <linearGradient id="prism-chartstroke" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#8c56ff"/><stop offset=".6" stop-color="#ff55de"/><stop offset="1" stop-color="#70ddff"/></linearGradient>
 </defs>
 ${[40,90,140,190,240].map(y=>`<line class="prism-gridline" x1="48" x2="627" y1="${y}" y2="${y}"/>`).join('')}
 ${Array.from({length:4},(_,i)=>`<text class="prism-axis" x="39" y="${244-i*60}" text-anchor="end">${Math.round(max*i/3)}</text>`).join('')}
 <g transform="translate(48 18) scale(5.76 2.31)">
   <path fill="url(#prism-area-two)" d="${softArea(p2)}"/>
   <path fill="url(#prism-area-one)" d="${softArea(p1)}"/>
   <path class="prism-chart-line" stroke="#36cfff" d="${line(p2)}"/>
   <path class="prism-chart-line" stroke="url(#prism-chartstroke)" d="${line(p1)}"/>
 </g>
 ${labels.filter((_,i)=>i===0||i===labels.length-1||i===Math.floor(labels.length/2))
   .map(label=>`<text class="prism-axis" x="${48+(labels.indexOf(label)/(labels.length-1||1)*576)}" y="258" text-anchor="middle">${label}</text>`).join('')}
 </svg></div>`;
}
function coloredBar(value,max){
 const percent=Math.max(0,Math.min(100,Math.round(value/(max||1)*100)));
 return `<span class="prism-bar-track"><span class="prism-bar-fill" style="width:${percent}%"></span></span>`;
}
const formatNumber=n=>new Intl.NumberFormat('es-CL').format(n||0);
const safeNumber=(n,method)=>n===null||n===undefined?NODATA:method(n);
export async function activateInsights({staticDemo,tenant,api,escape,pesos,notify,onNavigate}){
 const host=document.getElementById('insights-workspace');if(!host)return;
 let days=30;
 let state=null;
 const modeLabel=d=>d.mode==='SYNTHETIC_DEMO'?'DATOS DE DEMOSTRACIÓN':'REGISTROS LOCALES · SIN META';
 const active=()=>host.isConnected&&document.getElementById('insights-workspace')===host;
 async function load(){
  return staticDemo?demoAnalytics(tenant,days):api('/os/analytics?days='+days);
 }
 function render(data){
  if(!active())return;
  const k=data.kpis,totalStages=data.stages.reduce((sum,x)=>sum+x.count,0);
  const maxCh=Math.max(1,...data.channels.map(x=>x.contacts));
  host.innerHTML=`<div class="prism-dashboard">
   <section class="prism-banner"><div class="prism-banner-orb orb-one"></div><div class="prism-banner-orb orb-two"></div>
    <div class="prism-banner-copy"><span class="prism-eyebrow">ACQUISITION INTELLIGENCE / ${escape(tenant==='demo-wal'?'WAL':tenant==='demo-vaa'?'VISUAL ART AI':tenant.toUpperCase())}</span>
    <h2>Convierte señales en <em>decisiones.</em></h2>
    <p>Tu sistema de adquisición, conversaciones y operaciones en una sola vista. Sin métricas inventadas.</p>
    <div class="prism-banner-chips"><span>◈ Privado en Windows</span><span>◎ Automatización con revisión</span><span>◇ Trazabilidad por empresa</span></div></div>
    <div class="prism-crystal" aria-hidden="true"><span class="prism-crystal-core"></span></div>
   </section>
   <div class="prism-command-row"><div>
    <div class="prism-eyebrow">ESTADO COMERCIAL</div><h3>Vista ejecutiva</h3>
    <p>Origen: ${escape(modeLabel(data))} · ${escape(new Date(data.as_of).toLocaleDateString('es-CL'))}</p></div>
    <div class="prism-controls"><div class="prism-segment" role="group" aria-label="Ventana de análisis">
     ${[7,30,90].map(n=>`<button type="button" data-days="${n}" aria-pressed="${days===n}">${n} días</button>`).join('')}</div>
     <button type="button" class="prism-action" data-os-nav="crm">＋ Nueva oportunidad</button>
    </div></div>
   <div class="prism-kpis">
    ${[
      ['Contactos registrados',formatNumber(k.contacts_total),'◌','sky','Datos del CRM'],
      ['Oportunidades abiertas',formatNumber(k.opportunities_open),'◇','purple','Embudo comercial'],
      ['Pipeline estimado',pesos(k.pipeline_open_estimated_cents),'↗','pink','No equivale a ventas'],
      ['Seguimientos vencidos',formatNumber(k.followups_overdue),'◷','green','Requieren revisión']
    ].map(([label,value,icon,tone,foot])=>`<div class="prism-kpi prism-kpi-${tone}">
      <div class="prism-kpi-head"><span>${escape(label)}</span><span class="prism-kpi-icon">${icon}</span></div>
      <strong>${escape(value)}</strong><div class="prism-kpi-foot"><span class="prism-kpi-dot"></span>${escape(foot)}</div>
     </div>`).join('')}
   </div>
   <div class="prism-analysis-grid">
     <section class="prism-panel prism-trend"><div class="prism-panel-head"><div><span class="prism-eyebrow">ADQUISICIÓN</span><h3>Flujo de contactos</h3></div><span class="prism-subchip">Datos registrados</span></div>
      <div class="prism-large-number">${formatNumber(k.contacts_period)} <span>contactos en ${days} días</span></div>
      ${trendChart(data)}
      <div class="prism-legend"><span><i class="prism-key purple"></i> Contactos</span><span><i class="prism-key cyan"></i> Oportunidades</span></div>
     </section>
     <section class="prism-panel prism-pipeline"><div class="prism-panel-head"><div><span class="prism-eyebrow">PIPELINE</span><h3>Etapas comerciales</h3></div><button type="button" class="prism-text-link" data-os-nav="crm">Abrir CRM ↗</button></div>
     <div class="prism-funnel"><div class="prism-funnel-ring ring-1"></div><div class="prism-funnel-ring ring-2"></div><div class="prism-funnel-ring ring-3"></div><div class="prism-funnel-ring ring-4"></div></div>
     <div class="prism-stage-list">${data.stages.map((x,i)=>`<div class="prism-stage"><span><i style="--stage:${i}"></i>${escape(x.label)}</span><b>${formatNumber(x.count)}</b>${coloredBar(x.count,totalStages)}</div>`).join('')}</div>
      <div class="prism-note">“Ganado” es una declaración comercial, no un cobro verificado.</div>
     </section>
     <section class="prism-panel prism-sources"><div class="prism-panel-head"><div><span class="prism-eyebrow">ATRIBUCIÓN BÁSICA</span><h3>Origen declarado</h3></div><span class="prism-subchip">CRM local</span></div>
      <div class="prism-channel-list">${data.channels.map((c,i)=>`<div class="prism-channel-row">
       <span class="prism-channel-bubble ch-${i}">${['◎','f','◉','✧'][i]}</span><span class="prism-channel-name">${escape(CHANNEL_LABELS[c.channel]||c.channel)}</span>
       ${coloredBar(c.contacts,maxCh)}<strong>${formatNumber(c.contacts)}</strong></div>`).join('')}
      </div><p class="prism-note">No representa campañas, impresiones ni métricas verificadas de Meta.</p>
     </section>
     <section class="prism-panel prism-ops"><div class="prism-panel-head"><div><span class="prism-eyebrow">OPERACIONES</span><h3>Control y seguimiento</h3></div>
     <button type="button" class="prism-text-link" data-os-nav="orchestration">Revisar reglas ↗</button></div>
      <div class="prism-todo">
       <div><span class="prism-todo-icon">◷</span><span><b>${formatNumber(k.followups_open)} seguimientos abiertos</b><small>${formatNumber(k.followups_overdue)} necesitan atención por vencimiento</small></span></div>
       <div><span class="prism-todo-icon purple">◇</span><span><b>${formatNumber(k.quote_drafts)} cotizaciones borrador</b><small>${safeNumber(k.quoted_estimated_cents,pesos)} cotizados, no cobrados</small></span></div>
       <div><span class="prism-todo-icon cyan">◈</span><span><b>${formatNumber(k.opportunities_won_declarations)} negocios marcados ganados</b><small>El cobro real sigue sin verificación financiera</small></span></div>
      </div>
     </section>
   </div>
   <div class="prism-bottom-grid">
    <section class="prism-panel"><div class="prism-panel-head"><div><span class="prism-eyebrow">CALIDAD DE DATO</span><h3>Finanzas y atribución</h3></div><span class="prism-subchip caution">Fuentes pendientes</span></div>
      <div class="prism-missing-grid">
       <div><span>Ingresos cobrados</span><strong>${safeNumber(k.verified_revenue_cents,pesos)}</strong></div>
       <div><span>Inversión publicitaria</span><strong>${safeNumber(k.spend_cents,pesos)}</strong></div>
       <div><span>Costo de adquisición</span><strong>${safeNumber(k.cac_cents,pesos)}</strong></div>
       <div><span>ROAS</span><strong>${safeNumber(k.roas,x=>x+'×')}</strong></div>
      </div>
      <div class="prism-note">Sin acceso financiero o publicitario autorizado, estas cifras permanecen desconocidas.</div>
    </section>
    <section class="prism-panel prism-connectivity"><div class="prism-panel-head"><div><span class="prism-eyebrow">CANALES</span><h3>Estado de conexión</h3></div><button type="button" class="prism-text-link" data-os-nav="connections">Ver permisos ↗</button></div>
     ${['Instagram','Facebook Messenger','WhatsApp Business'].map((x,i)=>`<div class="prism-connectivity-row"><span class="prism-channel-bubble ch-${i}">${['◎','f','◉'][i]}</span><span>${x}</span><b>Sin conectar</b></div>`).join('')}
     <div class="prism-note">No se accede ni publica ninguna conversación real.</div>
    </section>
   </div>
  </div>`;
 }
 async function refresh(){
  try{state=await load();render(state)}
  catch(error){if(active())host.innerHTML='<div class="prism-error">No se pudo cargar analítica: '+escape(error.message||'Error')+'</div>';notify('No se pudo completar la lectura')}
 }
 host.addEventListener('click',async e=>{
  const daysBtn=e.target.closest('[data-days]');
  if(daysBtn){days=Number(daysBtn.dataset.days);await refresh();return}
  const nav=e.target.closest('[data-os-nav]');
  if(nav)onNavigate(nav.dataset.osNav);
 });
 await refresh();
}

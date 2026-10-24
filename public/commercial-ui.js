// Panel de cotizaciones y contribución directa estimada.
// Sin cobros, envíos, anuncios ni facturación; nunca clasificar como "ingreso real".
const demoOffers={
 'demo-wal':[
  {id:'mug',tenant_id:'demo-wal',label:'Tazón personalizado · demo',price_cents:1999000,direct_cost_cents:null,active:1},
  {id:'gift-pack',tenant_id:'demo-wal',label:'Pack regalos · demo',price_cents:6999000,direct_cost_cents:null,active:1}
 ],
 'demo-vaa':[
  {id:'audit',tenant_id:'demo-vaa',label:'Diagnóstico comercial · demo',price_cents:15000000,direct_cost_cents:null,active:1},
  {id:'automation',tenant_id:'demo-vaa',label:'Automatización comercial · demo',price_cents:35000000,direct_cost_cents:null,active:1}
 ]
};
function loadDemo(){
 try{
  const d=JSON.parse(localStorage.getItem('conv-os-quotes-demo-v1')||'null');
  if(d&&Array.isArray(d.quotes)&&Array.isArray(d.offers))return d;
 }catch{}
 const d={offers:Object.values(demoOffers).flat().map(o=>({...o})),quotes:[]};
 storeDemo(d);return d;
}
function storeDemo(d){try{localStorage.setItem('conv-os-quotes-demo-v1',JSON.stringify(d))}catch{}}
function projected(offer,units){
 const total=offer.price_cents*units, cost=offer.direct_cost_cents===null?null:offer.direct_cost_cents*units;
 return {subtotal_cents:total,direct_cost_snapshot_cents:offer.direct_cost_cents,
  projected_contribution_cents:cost===null?null:total-cost};
}
function summarize(quotes){
 const count=quotes.length;
 const allCosts=count>0&&quotes.every(q=>q.direct_cost_snapshot_cents!==null);
 return {
  quotes:count,
  estimated_quoted_revenue_cents:count?quotes.reduce((n,q)=>n+q.subtotal_cents,0):null,
  projected_direct_contribution_cents:allCosts?quotes.reduce((n,q)=>n+q.projected_contribution_cents,0):null,
  net_profit_cents:null,money_collected_cents:null,marketing_spend_cents:null,status:'DEMO_ESTIMATES_ONLY'
 };
}
export async function activateCommercial({tenant,staticDemo,api,notify,escape,pesos,opportunities}){
 const root=document.getElementById('commercial-workspace');
 if(!root)return;
 const isLive=()=>root.isConnected&&document.getElementById('commercial-workspace')===root;
 const formatValue=v=>v===null||v===undefined?'SIN DATOS':pesos(v);
 async function load(){
  if(staticDemo){
   const d=loadDemo(),quotes=d.quotes.filter(q=>q.tenant_id===tenant),offers=d.offers.filter(o=>o.tenant_id===tenant);
   return {quotes,offers,summary:summarize(quotes)};
  }
  const [o,q,s]=await Promise.all([api('/commercial/offers'),api('/commercial/quotes'),api('/commercial/summary')]);
  return {offers:o.offers,quotes:q.quotes,summary:s};
 }
 let data;
 try{data=await load()}catch(e){if(isLive())root.textContent='Presupuestos: '+(e.message||'Error');return}
 function draw(){
  if(!isLive())return;
  const {quotes,offers,summary}=data;
  root.innerHTML=`<div class="crm-toolbar" style="margin-top:27px">
   <div><div class="crm-title">Cotizaciones y costos directos</div>
    <div class="crm-subtitle">Estimaciones internas por marca · sin pagos registrados</div></div>
    <span class="crm-demo-pill">NO SON INGRESOS</span></div>
   <div class="crm-metrics">
    <div class="crm-metric"><small>Cotizaciones de prueba</small><b>${summary.quotes}</b></div>
    <div class="crm-metric"><small>Total cotizado (no cobrado)</small><b>${formatValue(summary.estimated_quoted_revenue_cents)}</b></div>
    <div class="crm-metric"><small>Contribución directa estimada</small><b>${formatValue(summary.projected_direct_contribution_cents)}</b></div>
    <div class="crm-metric"><small>Utilidad neta</small><b>SIN DATOS</b></div>
   </div>
   <div class="crm-notice">Las ofertas y sus precios son de demostración. Registra costos directos para estimar la contribución; faltan comisiones, publicidad, impuestos, tiempo operativo y pagos reales. No es una utilidad neta.</div>
   <div class="crm-forms">
    <section class="crm-form-panel">
      <h2>Precios y costos por oferta</h2>
      ${offers.map(o=>`<form class="crm-offer-form" data-offer="${escape(o.id)}">
        <strong>${escape(o.label)}</strong>
        <label>Precio unitario CLP</label>
        <input aria-label="Precio de ${escape(o.label)}" name="price" type="number" min="0" max="1000000000" step="1" required value="${o.price_cents/100}">
        <label>Costo directo unitario CLP (vacío = desconocido)</label>
        <input aria-label="Costo de ${escape(o.label)}" name="cost" type="number" min="0" max="1000000000" step="1" value="${o.direct_cost_cents===null?'':o.direct_cost_cents/100}" placeholder="Sin datos">
        <button class="btn" type="submit">Guardar presupuesto base</button>
       </form>`).join('')||'<div class="crm-empty">Sin ofertas</div>'}
    </section>
    <section class="crm-form-panel">
      <h2>Preparar cotización (sin envío)</h2>
      <form id="crm-quote-create">
       <label for="commercial-opportunity">Oportunidad</label>
       <select id="commercial-opportunity" name="opportunity_id" required>
        <option value="">Selecciona una oportunidad</option>
        ${opportunities.map(o=>`<option value="${escape(o.id)}">${escape(o.contact_name)} · ${escape(o.title)}</option>`).join('')}
       </select>
       <label for="commercial-offer">Oferta</label>
       <select id="commercial-offer" name="offer_id" required>
        <option value="">Selecciona una oferta</option>
        ${offers.filter(o=>o.active===1).map(o=>`<option value="${escape(o.id)}">${escape(o.label)} · ${pesos(o.price_cents)}</option>`).join('')}
       </select>
       <label for="commercial-quantity">Unidades</label>
       <input id="commercial-quantity" name="units" type="number" min="1" max="100" step="1" value="1" required>
       <button type="submit" class="btn primary">Crear borrador interno</button>
      </form>
      <h2 style="margin-top:22px">Borradores registrados</h2>
      <div class="crm-followups">
       ${quotes.map(q=>`<div class="crm-followup-row"><div>
        <strong>${escape(q.contact_name||opportunities.find(o=>o.id===q.opportunity_id)?.contact_name||'Contacto')} · ${escape(q.offer_label||offers.find(o=>o.id===q.offer_id)?.label||'Oferta')}</strong>
        <small>${q.units} unidad(es) · Cotizado: ${pesos(q.subtotal_cents)} · Contribución directa: ${formatValue(q.projected_contribution_cents)} · BORRADOR</small>
       </div></div>`).join('')||'<div class="crm-empty">Sin presupuestos todavía</div>'}
      </div>
    </section>
   </div>`;
 }
 draw();
 root.addEventListener('submit',async e=>{
  const form=e.target;if(!form.matches('.crm-offer-form')&&form.id!=='crm-quote-create')return;
  e.preventDefault();
  const btn=form.querySelector('[type="submit"]');btn.disabled=true;
  const v=Object.fromEntries(new FormData(form));
  try{
   if(form.matches('.crm-offer-form')){
    const id=form.dataset.offer;
    const price=Number(v.price),cost=v.cost===''?null:Number(v.cost);
    if(!Number.isSafeInteger(price)||price<0||price>1000000000
     ||(cost!==null&&(!Number.isSafeInteger(cost)||cost<0||cost>1000000000)))
     throw Error('Introduce importes CLP válidos');
    if(staticDemo){
     const d=loadDemo(),offer=d.offers.find(o=>o.id===id&&o.tenant_id===tenant);
     if(!offer)throw Error('Oferta no disponible');
     offer.price_cents=price*100;offer.direct_cost_cents=cost===null?null:cost*100;storeDemo(d);
    }else await api('/commercial/offers/'+encodeURIComponent(id),'PATCH',{price_cents:price*100,direct_cost_cents:cost===null?null:cost*100});
   }else{
    const units=Number(v.units);
    if(!Number.isSafeInteger(units)||units<1||units>100)throw Error('Unidades entre 1 y 100');
    if(staticDemo){
     const d=loadDemo();
     const offer=d.offers.find(o=>o.id===v.offer_id&&o.tenant_id===tenant);
     const opp=opportunities.find(o=>o.id===v.opportunity_id);
     if(!offer||!opp)throw Error('Oportunidad u oferta no disponible');
     d.quotes.push({...projected(offer,units),id:crypto.randomUUID(),tenant_id:tenant,
       opportunity_id:opp.id,offer_id:offer.id,units,contact_name:opp.contact_name,
       offer_label:offer.label,status:'draft',created_at:new Date().toISOString()});
     storeDemo(d);
    }else await api('/commercial/quotes','POST',{opportunity_id:v.opportunity_id,offer_id:v.offer_id,units});
   }
   data=await load();draw();
   notify('Cambio guardado solo en el entorno de demostración');
  }catch(error){notify(error.message||'Error');btn.disabled=false}
 });
}

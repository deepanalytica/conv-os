// Fictitious demonstration only. ZERO real customer data and ZERO external credentials.
// Explicitly labeled demo; changes stay in the visitor's browser.
const crmKey='conv-os-crm-v1';
const quotesKey='conv-os-quotes-demo-v1';
const decisionsKey='acquisition-os-rule-review-v1';
const ordersKey='conv-os-demo-v2';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const ago=(days,hours=0)=>new Date(Date.now()-(days*24+hours)*3600000).toISOString();
const DATA=[
 ['demo-wal','Cliente demostración A','instagram','Tazón anamórfico personalizado',24990,'new',0],
 ['demo-wal','Cliente demostración B','whatsapp','Pack de 6 tazones regalo',119940,'qualified',2],
 ['demo-wal','Cliente demostración C','instagram','Colección Navidad · 12 unidades',259900,'proposal',5],
 ['demo-wal','Cliente demostración D','facebook','Regalos para equipo de trabajo',349900,'negotiation',8],
 ['demo-wal','Cliente demostración E','manual','Set taza + café premium',39990,'won',12],
 ['demo-wal','Cliente demostración F','instagram','Pedido especial corporativo',589900,'won',18],
 ['demo-wal','Cliente demostración G','whatsapp','Tazón ilustración Valparaíso',29990,'lost',23],
 ['demo-wal','Cliente demostración H','facebook','Pack cumpleaños familiar',79990,'new',1],
 ['demo-wal','Cliente demostración I','instagram','Tazones colección paisajes',189900,'proposal',10],
 ['demo-vaa','Empresa demostración A','instagram','Diagnóstico de visibilidad digital',150000,'new',1],
 ['demo-vaa','Empresa demostración B','facebook','Sitio web y posicionamiento',650000,'qualified',4],
 ['demo-vaa','Empresa demostración C','manual','Automatización de atención comercial',990000,'proposal',8],
 ['demo-vaa','Empresa demostración D','instagram','Plan SEO para búsquedas con IA',490000,'negotiation',12],
 ['demo-vaa','Empresa demostración E','facebook','Campaña digital de lanzamiento',750000,'won',19],
 ['demo-vaa','Empresa demostración F','manual','Sistema de reservas y WhatsApp',420000,'won',24],
 ['demo-vaa','Empresa demostración G','instagram','Auditoría UX / analítica',190000,'lost',27],
 ['demo-vaa','Empresa demostración H','instagram','Publicidad y contenidos',380000,'qualified',2]
];
const offers=[
 {id:'mug',tenant_id:'demo-wal',label:'Tazón personalizado · demo',price_cents:2499000,direct_cost_cents:900000,active:1},
 {id:'gift-pack',tenant_id:'demo-wal',label:'Pack regalo premium · demo',price_cents:6999000,direct_cost_cents:2800000,active:1},
 {id:'audit',tenant_id:'demo-vaa',label:'Diagnóstico comercial · demo',price_cents:15000000,direct_cost_cents:3500000,active:1},
 {id:'automation',tenant_id:'demo-vaa',label:'Automatización comercial · demo',price_cents:35000000,direct_cost_cents:13000000,active:1}
];
export function resetDemoFixtures(){
 for(const key of [crmKey,quotesKey,decisionsKey,ordersKey])try{localStorage.removeItem(key)}catch{}
 ensureDemoFixtures();
}
export function ensureDemoFixtures(){
 try{
  if(localStorage.getItem(crmKey)&&localStorage.getItem(quotesKey))return;
  const contacts=[],opportunities=[];
  for(let i=0;i<DATA.length;i++){
   const [tenant,name,channel,title,amount,stage,days]=DATA[i];
   const id=uuid(100+i),oppId=uuid(200+i),created_at=ago(days,5),updated_at=ago(days);
   contacts.push({id,tenant_id:tenant,name,channel,created_at,consent_status:'unknown',origin:'DEMO FICTICIA'});
   opportunities.push({id:oppId,tenant_id:tenant,contact_id:id,contact_name:name,channel,title,
     amount_cents:amount*100,stage,source:'DEMO FICTICIA',created_at,updated_at});
  }
  const followups=[
   [0,'Solicitar referencia visual',-2],
   [1,'Confirmar diseño del pack',1],
   [2,'Enviar propuesta creativa',-1],
   [7,'Revisar fecha de entrega',2],
   [9,'Enviar diagnóstico inicial',-1],
   [10,'Programar reunión comercial',2],
   [11,'Presentar demo de automatización',-3],
   [15,'Revisar brief publicitario',1]
  ].map(([opIndex,title,diff],i)=>({
   id:uuid(300+i),tenant_id:DATA[opIndex][0],
   opportunity_id:opportunities[opIndex].id,title,
   due_at:ago(-diff),status:'open',created_at:ago(Math.max(1,DATA[opIndex][6]))}));
  const quotes=[
   {opp:2,offer:'gift-pack',units:2},
   {opp:3,offer:'mug',units:12},
   {opp:11,offer:'automation',units:1},
   {opp:12,offer:'audit',units:1}
  ].map((q,i)=>{
    const offer=offers.find(x=>x.tenant_id===DATA[q.opp][0]&&x.id===q.offer);
    return {id:uuid(400+i),tenant_id:offer.tenant_id,opportunity_id:opportunities[q.opp].id,
      offer_id:offer.id,offer_label:offer.label,contact_name:DATA[q.opp][1],units:q.units,
      price_snapshot_cents:offer.price_cents,direct_cost_snapshot_cents:offer.direct_cost_cents,
      subtotal_cents:offer.price_cents*q.units,
      projected_contribution_cents:(offer.price_cents-offer.direct_cost_cents)*q.units,
      status:'draft',created_at:ago(i+1)};
  });
  localStorage.setItem(crmKey,JSON.stringify({contacts,opportunities,followups}));
  localStorage.setItem(quotesKey,JSON.stringify({offers,quotes}));
 }catch{/* Private browsing may disable storage. The dashboard has a read-only fallback. */}
}

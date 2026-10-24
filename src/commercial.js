import {randomUUID} from 'node:crypto';

// Presupuestos DRAFT y contribución directa estimada. SIN cobros, API de pagos
// ni atribución publicitaria; las cifras nunca son "ingresos realizados".
const invalid=(message,status=400)=>Object.assign(Error(message),{status});
const cents=(value,label)=>{
 if(!Number.isSafeInteger(value)||value<0||value>100_000_000_000)
  throw invalid(label+' inválido');
 return value;
};
const quantity=value=>{
 if(!Number.isSafeInteger(value)||value<1||value>100)
  throw invalid('Cantidad inválida');
 return value;
};
const id=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function quoteValues(offer,qty){
 const units=quantity(qty);
 const subtotal=cents(offer.price_cents,'Precio')*units;
 if(!Number.isSafeInteger(subtotal))throw invalid('Monto de presupuesto demasiado grande');
 const direct=offer.direct_cost_cents===null?null:cents(offer.direct_cost_cents,'Costo')*units;
 if(direct!==null&&!Number.isSafeInteger(direct))throw invalid('Costo demasiado grande');
 return {units,subtotal_cents:subtotal,direct_cost_cents:direct,
  projected_contribution_cents:direct===null?null:subtotal-direct};
}
export function initCommercial(db){
 db.exec(`CREATE TABLE IF NOT EXISTS commercial_offers (
 id TEXT NOT NULL,tenant_id TEXT NOT NULL REFERENCES tenants(id),
 label TEXT NOT NULL,price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
 direct_cost_cents INTEGER CHECK(direct_cost_cents >= 0),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 updated_at TEXT NOT NULL,
 PRIMARY KEY (id,tenant_id)
 );
 CREATE TABLE IF NOT EXISTS commercial_quotes (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
 opportunity_id TEXT NOT NULL,offer_id TEXT NOT NULL,units INTEGER NOT NULL CHECK(units BETWEEN 1 AND 100),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status='draft'),
 price_snapshot_cents INTEGER NOT NULL CHECK(price_snapshot_cents >= 0),
 direct_cost_snapshot_cents INTEGER CHECK(direct_cost_snapshot_cents >= 0),
 subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents >= 0),
 projected_contribution_cents INTEGER,source TEXT NOT NULL DEFAULT 'manual_demo',
 created_at TEXT NOT NULL,
 FOREIGN KEY(opportunity_id,tenant_id) REFERENCES crm_opportunities(id,tenant_id),
 FOREIGN KEY(offer_id,tenant_id) REFERENCES commercial_offers(id,tenant_id)
 );
 CREATE INDEX IF NOT EXISTS commercial_quotes_tenant ON commercial_quotes(tenant_id,created_at);`);
 const now=new Date().toISOString();
 const stmt=db.prepare('INSERT OR IGNORE INTO commercial_offers (id,tenant_id,label,price_cents,direct_cost_cents,updated_at) VALUES (?,?,?,?,NULL,?)');
 for(const [id,tenant,label,price] of [
  ['mug','demo-wal','Tazón personalizado · demo',1999000],
  ['gift-pack','demo-wal','Pack regalos · demo',6999000],
  ['audit','demo-vaa','Diagnóstico comercial · demo',15000000],
  ['automation','demo-vaa','Automatización comercial · demo',35000000]
 ])stmt.run(id,tenant,label,price,now);
}
const listQuotes=`SELECT q.*,o.label AS offer_label,c.name AS contact_name,
 op.title AS opportunity_title
 FROM commercial_quotes q
 JOIN commercial_offers o ON o.id=q.offer_id AND o.tenant_id=q.tenant_id
 JOIN crm_opportunities op ON op.id=q.opportunity_id AND op.tenant_id=q.tenant_id
 JOIN crm_contacts c ON c.id=op.contact_id AND c.tenant_id=q.tenant_id
 WHERE q.tenant_id=? ORDER BY q.created_at DESC LIMIT 250`;
export function commercialSummary(db,tenant){
 const agg=db.prepare(`SELECT COUNT(*) quotes,
 COALESCE(SUM(subtotal_cents),0) total_estimated_cents,
 SUM(CASE WHEN direct_cost_snapshot_cents IS NULL THEN 1 ELSE 0 END) incomplete_cost_quotes,
 SUM(direct_cost_snapshot_cents * units) AS known_direct_costs_cents
 FROM commercial_quotes WHERE tenant_id=?`).get(tenant);
 const quotes=agg.quotes;
 const costsKnown=quotes>0&&agg.incomplete_cost_quotes===0;
 const amount=quotes>0?agg.total_estimated_cents:null;
 const directCost=costsKnown?agg.known_direct_costs_cents:null;
 return {
  quotes,estimated_quoted_revenue_cents:amount,
  known_direct_costs_cents:directCost,
  projected_direct_contribution_cents:costsKnown?amount-directCost:null,
  money_collected_cents:null,marketing_spend_cents:null,
  cac:null,net_profit_cents:null,
  status:'DEMO_ESTIMATES_ONLY',
  caveat:'Costos directos manuales y estimaciones. No incluye impuestos, marketing, operación total ni pagos verificados.'
 };
}
export async function handleCommercial({db,req,res,path,tenant,json,limited,checkedJson}){
 if(path==='/api/commercial/summary'&&req.method==='GET'){
  json(res,200,commercialSummary(db,tenant));return true;
 }
 if(path==='/api/commercial/offers'&&req.method==='GET'){
  json(res,200,{offers:db.prepare('SELECT * FROM commercial_offers WHERE tenant_id=? ORDER BY label LIMIT 200').all(tenant)});
  return true;
 }
 const offerPatch=path.match(/^\/api\/commercial\/offers\/([a-z0-9_-]+)$/);
 if(offerPatch&&req.method==='PATCH'){
  const offer=db.prepare('SELECT * FROM commercial_offers WHERE tenant_id=? AND id=?').get(tenant,offerPatch[1]);
  if(!offer)throw invalid('Oferta de esta empresa no encontrada',404);
  const body=checkedJson(await limited(req));
  if(!body||typeof body!=='object'||Array.isArray(body))throw invalid('Formato inválido');
  // Unit price and cost are mandatory, so a stale form cannot silently reset values.
  const price=cents(body.price_cents,'Precio');
  const cost=body.direct_cost_cents===null?null:cents(body.direct_cost_cents,'Costo directo');
  const updated=new Date().toISOString();
  db.prepare('UPDATE commercial_offers SET price_cents=?,direct_cost_cents=?,updated_at=? WHERE tenant_id=? AND id=?')
   .run(price,cost,updated,tenant,offer.id);
  json(res,200,{offer:db.prepare('SELECT * FROM commercial_offers WHERE tenant_id=? AND id=?').get(tenant,offer.id)});
  return true;
 }
 if(path==='/api/commercial/quotes'){
  if(req.method==='GET'){json(res,200,{quotes:db.prepare(listQuotes).all(tenant)});return true}
  if(req.method==='POST'){
   const body=checkedJson(await limited(req));
   if(!body||typeof body!=='object'||Array.isArray(body))throw invalid('Formato inválido');
   if(!id(body.opportunity_id))throw invalid('Oportunidad inválida');
   const opportunity=db.prepare('SELECT id FROM crm_opportunities WHERE tenant_id=? AND id=?').get(tenant,body.opportunity_id);
   if(!opportunity)throw invalid('Oportunidad de esta empresa no encontrada',404);
   if(typeof body.offer_id!=='string'||!/^[-_a-z0-9]{1,80}$/.test(body.offer_id))
    throw invalid('Oferta inválida');
   const offer=db.prepare('SELECT * FROM commercial_offers WHERE tenant_id=? AND id=? AND active=1')
    .get(tenant,body.offer_id);
   if(!offer)throw invalid('Oferta no encontrada o desactivada',404);
   const values=quoteValues(offer,body.units);
   const newId=randomUUID(),now=new Date().toISOString();
   db.prepare(`INSERT INTO commercial_quotes
     (id,tenant_id,opportunity_id,offer_id,units,status,price_snapshot_cents,
      direct_cost_snapshot_cents,subtotal_cents,projected_contribution_cents,source,created_at)
      VALUES (?,?,?,?,?,'draft',?,?,?,?, 'manual_demo',?)`)
     .run(newId,tenant,opportunity.id,offer.id,values.units,offer.price_cents,offer.direct_cost_cents,
      values.subtotal_cents,values.projected_contribution_cents,now);
   json(res,201,{quote:db.prepare('SELECT * FROM commercial_quotes WHERE tenant_id=? AND id=?').get(tenant,newId)});
   return true;
  }
 }
 return false;
}

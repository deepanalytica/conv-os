import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initCrm} from '../src/crm.js';
import {initCommercial,commercialSummary,quoteValues,handleCommercial} from '../src/commercial.js';

const db=new DatabaseSync(':memory:');
db.exec("PRAGMA foreign_keys=ON; CREATE TABLE tenants (id TEXT PRIMARY KEY,name TEXT,segment TEXT); INSERT INTO tenants VALUES ('wal','WAL','retail'),('vaa','VAA','services');");
initCrm(db);initCommercial(db);
const one='f35b912b-63dd-469a-b30b-0e987f9ad451';
const two='1fbc9324-ab63-4f32-a19e-5095f5b4f2fa';
const opportunity='b6ed67a2-ae72-413b-87b8-79a901511ed0';
const oppVAA='b7fa8b93-30d2-4113-9149-ea761d19c4ce';
const now=new Date().toISOString();
db.prepare('INSERT INTO crm_contacts (id,tenant_id,name,channel,created_at) VALUES (?,?,?,?,?)').run(one,'wal','Cliente demo WAL','manual',now);
db.prepare('INSERT INTO crm_contacts (id,tenant_id,name,channel,created_at) VALUES (?,?,?,?,?)').run(two,'vaa','Cliente demo VAA','manual',now);
db.prepare("INSERT INTO crm_opportunities (id,tenant_id,contact_id,title,amount_cents,stage,created_at,updated_at) VALUES (?,?,?,?,?,'new',?,?)").run(opportunity,'wal',one,'Regalo',500000,now,now);
db.prepare("INSERT INTO crm_opportunities (id,tenant_id,contact_id,title,amount_cents,stage,created_at,updated_at) VALUES (?,?,?,?,?,'new',?,?)").run(oppVAA,'vaa',two,'Servicio',1000000,now,now);

async function call(path,tenant='wal',body,method='GET'){
 let result;
 const json=(res,status,payload)=>{result={status,data:payload}};
 const req={method},res={};
 const processed=await handleCommercial({
  db,req,res,path,tenant,json,
  limited:async()=>Buffer.from(JSON.stringify(body??{})),
  checkedJson:raw=>JSON.parse(raw.toString())
 });
 return {processed,...result};
}
test('sin cotizaciones los márgenes y ventas comprobadas son NO_DATA',()=>{
 const result=commercialSummary(db,'wal');
 assert.equal(result.quotes,0);
 assert.equal(result.estimated_quoted_revenue_cents,null);
 assert.equal(result.projected_direct_contribution_cents,null);
 assert.equal(result.money_collected_cents,null);
 assert.equal(result.net_profit_cents,null);
});
test('cotización deriva totales del catálogo de empresa y conserva costo desconocido',async()=>{
 const offers=await call('/api/commercial/offers','demo-wal');
 assert.equal(offers.status,200);
 const mug=offers.data.offers.find(x=>x.id==='mug');
 assert.ok(mug);assert.equal(mug.direct_cost_cents,null);
 const quote=await call('/api/commercial/quotes','demo-wal',{opportunity_id:opportunity,offer_id:'mug',units:2},'POST');
 // This opportunity belongs to "wal", never "demo-wal".
 assert.equal(quote.status,404);
 const outside=await call('/api/commercial/quotes','demo-vaa',{opportunity_id:opportunity,offer_id:'audit',units:2},'POST');
 assert.equal(outside.status,404);
});
test('importe estimado con costos definidos conserva margen negativo cuando corresponde',()=>{
 assert.deepEqual(quoteValues({price_cents:1000,direct_cost_cents:800},2),
  {units:2,subtotal_cents:2000,direct_cost_cents:1600,projected_contribution_cents:400});
 assert.equal(quoteValues({price_cents:1000,direct_cost_cents:1500},2).projected_contribution_cents,-1000);
 assert.equal(quoteValues({price_cents:1000,direct_cost_cents:null},1).projected_contribution_cents,null);
 assert.throws(()=>quoteValues({price_cents:1000,direct_cost_cents:null},0),/Cantidad/);
 assert.throws(()=>quoteValues({price_cents:1000,direct_cost_cents:null},101),/Cantidad/);
});
test('alta local de oferta y cotización: no se marca pago ni ingreso',async()=>{
 // El seed inserta demo-wal. Creamos una oferta de prueba bajo la empresa wal.
 db.prepare("INSERT INTO commercial_offers VALUES (?,?,?,?,?,1,?)").run('trial','wal','Oferta local',150000,120000,now);
 const creation=await call('/api/commercial/quotes','wal',{opportunity_id:opportunity,offer_id:'trial',units:2,price_cents:1},'POST');
 assert.equal(creation.status,201);
 assert.equal(creation.data.quote.subtotal_cents,300000);
 assert.equal(creation.data.quote.projected_contribution_cents,60000);
 assert.equal(creation.data.quote.status,'draft');
 const summary=commercialSummary(db,'wal');
 assert.equal(summary.projected_direct_contribution_cents,60000);
 assert.equal(summary.money_collected_cents,null);
 assert.equal(summary.net_profit_cents,null);
 const cross=await call('/api/commercial/quotes','vaa');
 assert.equal(cross.status,200);
 assert.equal(cross.data.quotes.length,0);
 const crossOffer=await call('/api/commercial/quotes','vaa',{opportunity_id:oppVAA,offer_id:'trial',units:1},'POST');
 assert.equal(crossOffer.status,404);
 const noOp=await call('/api/commercial/quotes','wal',{opportunity_id:oppVAA,offer_id:'trial',units:1},'POST');
 assert.equal(noOp.status,404);
});
test('cambiar costos solo modifica oferta propia, preserva snapshots previos',async()=>{
 const patch=await call('/api/commercial/offers/trial','wal',{price_cents:250000,direct_cost_cents:300000},'PATCH');
 assert.equal(patch.status,200);
 assert.equal(patch.data.offer.price_cents,250000);
 const quotes=await call('/api/commercial/quotes','wal');
 assert.equal(quotes.data.quotes[0].subtotal_cents,300000);
 const newQuote=await call('/api/commercial/quotes','wal',{opportunity_id:opportunity,offer_id:'trial',units:1},'POST');
 assert.equal(newQuote.status,201);
 assert.equal(newQuote.data.quote.projected_contribution_cents,-50000);
 const outside=await call('/api/commercial/offers/trial','vaa',{price_cents:1,direct_cost_cents:0},'PATCH');
 assert.equal(outside.status,404);
 const invalid=await call('/api/commercial/offers/trial','wal',{price_cents:1,direct_cost_cents:-1},'PATCH');
 assert.equal(invalid.status,400);
 const missing=await call('/api/commercial/offers/trial','wal',{price_cents:1},'PATCH');
 assert.equal(missing.status,400);
});

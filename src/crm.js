import {randomUUID} from 'node:crypto';

// CRM de laboratorio. La autorización por tenant sigue dependiendo del servidor.
// No habilitar clientes reales hasta implementar sesiones, roles y permisos.
export const CRM_STAGES=Object.freeze(['new','qualified','proposal','negotiation','won','lost']);
export const CRM_CHANNELS=Object.freeze(['instagram','facebook','whatsapp','manual']);
const nextStages={
 new:['qualified','lost'],
 qualified:['proposal','lost'],
 proposal:['negotiation','won','lost'],
 negotiation:['won','lost'],
 won:[],lost:[]
};
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
export function assertCrmTransition(before,after){
 if(!CRM_STAGES.includes(after)||!nextStages[before]?.includes(after))
  throw invalid('Transición comercial no permitida');
 return true;
}
const trimmed=(value,label,max=140,required=true)=>{
 if(typeof value!=='string')throw invalid(label+' inválido');
 const v=value.trim();
 if((required&&!v)||v.length>max)throw invalid(label+' inválido');
 return v;
};
export function amountInCents(value){
 if(!Number.isSafeInteger(value)||value<0||value>100000000000)
  throw invalid('Importe estimado inválido');
 return value;
}
export function initCrm(db){
 db.exec(`CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('instagram','facebook','whatsapp','manual')),
  external_handle TEXT NOT NULL DEFAULT '',
  consent_status TEXT NOT NULL DEFAULT 'unknown' CHECK(consent_status IN ('unknown','opted_in','opted_out')),
  created_at TEXT NOT NULL,
  UNIQUE(id,tenant_id)
 );
 CREATE INDEX IF NOT EXISTS crm_contacts_tenant ON crm_contacts(tenant_id,created_at);
 CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),
  stage TEXT NOT NULL CHECK(stage IN ('new','qualified','proposal','negotiation','won','lost')),
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(contact_id,tenant_id) REFERENCES crm_contacts(id,tenant_id)
 );
 CREATE INDEX IF NOT EXISTS crm_opportunities_tenant ON crm_opportunities(tenant_id,stage,updated_at);
 CREATE TABLE IF NOT EXISTS crm_activity (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  opportunity_id TEXT NOT NULL REFERENCES crm_opportunities(id),
  event TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
 );
 CREATE INDEX IF NOT EXISTS crm_activity_tenant ON crm_activity(tenant_id,created_at);`);
}
export function seedCrmDemo(db){
 const examples=[
  ['demo-wal','Contacto WAL 01','instagram','Tazón personalizado',1999000,'new'],
  ['demo-wal','Contacto WAL 02','whatsapp','Pack de regalo',6999000,'proposal'],
  ['demo-vaa','Empresa de ejemplo 01','facebook','Diagnóstico de presencia digital',15000000,'qualified'],
  ['demo-vaa','Empresa de ejemplo 02','instagram','Automatización comercial',35000000,'proposal']
 ];
 const available=db.prepare('SELECT id FROM tenants WHERE id=?');
 const exists=db.prepare('SELECT id FROM crm_contacts WHERE tenant_id=? LIMIT 1');
 const now=new Date().toISOString();
 const insertContact=db.prepare('INSERT INTO crm_contacts (id,tenant_id,name,channel,created_at) VALUES (?,?,?,?,?)');
 const insertOpportunity=db.prepare('INSERT INTO crm_opportunities (id,tenant_id,contact_id,title,amount_cents,stage,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
 for(const [tenant,name,channel,title,amount,stage] of examples){
  if(!available.get(tenant))continue;
  // Fixtures solo para empresas sin contactos. No mezclar con datos incorporados.
  if(exists.get(tenant))continue;
  const contactId=randomUUID();
  insertContact.run(contactId,tenant,name,channel,now);
  insertOpportunity.run(randomUUID(),tenant,contactId,title,amount,stage,'demostración',now,now);
 }
}
const summarySql=`SELECT stage,COUNT(*) count,COALESCE(SUM(amount_cents),0) amount_cents
 FROM crm_opportunities WHERE tenant_id=? GROUP BY stage`;
const opportunitySql=`SELECT o.*,c.name AS contact_name,c.channel
 FROM crm_opportunities o
 JOIN crm_contacts c ON c.id=o.contact_id AND c.tenant_id=o.tenant_id
 WHERE o.tenant_id=? ORDER BY o.updated_at DESC LIMIT 250`;
export async function handleCrm({db,req,res,path,tenant,json,limited,checkedJson}){
 if(path==='/api/crm/overview'&&req.method==='GET'){
  const stages=db.prepare(summarySql).all(tenant);
  const total=stages.reduce((n,s)=>n+s.count,0);
  const won=stages.find(s=>s.stage==='won');
  json(res,200,{total,wonCount:won?.count||0,wonEstimatedCents:won?.amount_cents||0,stages});
  return true;
 }
 if(path==='/api/crm/contacts'){
  if(req.method==='GET'){
   json(res,200,{contacts:db.prepare('SELECT * FROM crm_contacts WHERE tenant_id=? ORDER BY created_at DESC LIMIT 250').all(tenant)});
   return true;
  }
  if(req.method==='POST'){
   const body=checkedJson(await limited(req));
   const name=trimmed(body.name,'Nombre',120);
   const channel=body.channel??'manual';
   if(!CRM_CHANNELS.includes(channel))throw invalid('Canal inválido');
   const handle=trimmed(body.external_handle??'','Identificador',160,false);
   // No asumir consentimiento a partir de un mensaje o de un import.
   const id=randomUUID(),created=new Date().toISOString();
   db.prepare('INSERT INTO crm_contacts (id,tenant_id,name,channel,external_handle,consent_status,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id,tenant,name,channel,handle,'unknown',created);
   json(res,201,{contact:db.prepare('SELECT * FROM crm_contacts WHERE tenant_id=? AND id=?').get(tenant,id)});
   return true;
  }
 }
 if(path==='/api/crm/opportunities'){
  if(req.method==='GET'){
   json(res,200,{opportunities:db.prepare(opportunitySql).all(tenant)});
   return true;
  }
  if(req.method==='POST'){
   const body=checkedJson(await limited(req));
   const contact=trimmed(body.contact_id,'Contacto',90);
   if(!db.prepare('SELECT id FROM crm_contacts WHERE id=? AND tenant_id=?').get(contact,tenant))
    throw invalid('Contacto inexistente para esta empresa',404);
   const title=trimmed(body.title,'Oportunidad',160);
   const amount=amountInCents(body.amount_cents??0);
   const source=trimmed(body.source??'manual','Origen',100);
   const id=randomUUID(),now=new Date().toISOString();
   db.prepare(`INSERT INTO crm_opportunities
    (id,tenant_id,contact_id,title,amount_cents,stage,source,created_at,updated_at)
    VALUES (?,?,?,?,?,'new',?,?,?)`)
    .run(id,tenant,contact,title,amount,source,now,now);
   json(res,201,{opportunity:db.prepare('SELECT * FROM crm_opportunities WHERE id=? AND tenant_id=?').get(id,tenant)});
   return true;
  }
 }
 const stageMatch=path.match(/^\/api\/crm\/opportunities\/([a-f0-9-]+)\/stage$/);
 if(stageMatch&&req.method==='POST'){
  const old=db.prepare('SELECT * FROM crm_opportunities WHERE id=? AND tenant_id=?').get(stageMatch[1],tenant);
  if(!old)throw invalid('Oportunidad no encontrada',404);
  const body=checkedJson(await limited(req));
  assertCrmTransition(old.stage,body.stage);
  const now=new Date().toISOString();
  const update=db.prepare('UPDATE crm_opportunities SET stage=?,updated_at=? WHERE tenant_id=? AND id=? AND stage=?');
  const log=db.prepare('INSERT INTO crm_activity VALUES (?,?,?,?,?,?)');
  db.exec('BEGIN IMMEDIATE');
  try{
   const result=update.run(body.stage,now,tenant,old.id,old.stage);
   if(result.changes!==1)throw invalid('Estado modificado por otra operación',409);
   log.run(randomUUID(),tenant,old.id,'stage_changed',old.stage+' → '+body.stage,now);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  json(res,200,{opportunity:db.prepare('SELECT * FROM crm_opportunities WHERE id=? AND tenant_id=?').get(old.id,tenant)});
  return true;
 }
 return false;
}

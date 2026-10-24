import {randomUUID} from 'node:crypto';

// Registro local de decisiones declaradas. No habilita envío.
// Un operador no puede declarar una verificación oficial de proveedor con este endpoint.
const bad=(message,status=400)=>Object.assign(Error(message),{status});
const validId=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const CHANNELS=new Set(['instagram','facebook','whatsapp','manual']);
const PURPOSES=new Set(['service','marketing']);
const DECISIONS=new Set(['claimed_opt_in','opted_out']);
export function initConsent(db){
 db.exec(`CREATE TABLE IF NOT EXISTS crm_consent_receipts (
 id TEXT NOT NULL PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 contact_id TEXT NOT NULL,
 channel TEXT NOT NULL CHECK(channel IN ('instagram','facebook','whatsapp','manual')),
 purpose TEXT NOT NULL CHECK(purpose IN ('service','marketing')),
 decision TEXT NOT NULL CHECK(decision IN ('claimed_opt_in','opted_out')),
 evidence TEXT NOT NULL CHECK(evidence='operator_claim_unverified'),
 created_at TEXT NOT NULL,
 FOREIGN KEY(contact_id,tenant_id) REFERENCES crm_contacts(id,tenant_id)
 );
 CREATE INDEX IF NOT EXISTS consent_contact_tenant
 ON crm_consent_receipts(tenant_id,contact_id,created_at);`);
}
export function consentSummary(receipts){
 const result={marketing_permission:'UNKNOWN',service_permission:'UNKNOWN',
  outbound_automation_allowed:false,reason:'No hay OAuth, evidencia verificable ni política de canal aprobada'};
 for(const purpose of PURPOSES){
  const found=[...receipts].reverse().find(r=>r.purpose===purpose);
  if(found?.decision==='opted_out')result[purpose+'_permission']='OPTED_OUT';
  else if(found?.decision==='claimed_opt_in')result[purpose+'_permission']='UNVERIFIED_CLAIM';
 }
 return result;
}
export async function handleConsent({db,req,res,path,tenant,json,limited,checkedJson}){
 const match=path.match(/^\/api\/privacy\/contacts\/([a-f0-9-]{36})\/consent$/);
 if(!match)return false;
 const contactId=match[1];
 if(!db.prepare('SELECT id FROM crm_contacts WHERE id=? AND tenant_id=?').get(contactId,tenant))
  throw bad('Contacto no encontrado en esta empresa',404);
 if(req.method==='GET'){
  const receipts=db.prepare('SELECT * FROM crm_consent_receipts WHERE contact_id=? AND tenant_id=? ORDER BY created_at,id LIMIT 250')
   .all(contactId,tenant);
  json(res,200,{receipts,summary:consentSummary(receipts)});
  return true;
 }
 if(req.method==='POST'){
  const body=checkedJson(await limited(req,4096));
  if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Formato inválido');
  if(!CHANNELS.has(body.channel)||!PURPOSES.has(body.purpose)||!DECISIONS.has(body.decision))
   throw bad('Canal, finalidad o decisión inválidos');
  const id=randomUUID(),now=new Date().toISOString();
  db.prepare(`INSERT INTO crm_consent_receipts
   (id,tenant_id,contact_id,channel,purpose,decision,evidence,created_at)
   VALUES (?,?,?,?,? ,?,'operator_claim_unverified',?)`)
    .run(id,tenant,contactId,body.channel,body.purpose,body.decision,now);
  const receipts=db.prepare('SELECT * FROM crm_consent_receipts WHERE contact_id=? AND tenant_id=? ORDER BY created_at,id')
   .all(contactId,tenant);
  json(res,201,{receipt:receipts.find(x=>x.id===id),summary:consentSummary(receipts)});
  return true;
 }
 return false;
}

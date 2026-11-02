import {randomUUID} from 'node:crypto';

// Seguimientos locales, sin mensajes salientes ni decisiones autónomas.
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const validTitle=t=>typeof t==='string'&&t.trim().length>0&&t.trim().length<=160;
const validDate=t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(t)
 &&Number.isFinite(Date.parse(t))&&Date.parse(t)>Date.parse('2020-01-01T00:00:00Z')
 &&Date.parse(t)<Date.parse('2100-01-01T00:00:00Z');
export function initFollowups(db){
 db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS crm_opp_tenant_unique
    ON crm_opportunities(id,tenant_id);
  CREATE TABLE IF NOT EXISTS crm_followups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    opportunity_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','completed')),
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY(opportunity_id,tenant_id) REFERENCES crm_opportunities(id,tenant_id)
  );
  CREATE INDEX IF NOT EXISTS crm_followups_lookup
    ON crm_followups(tenant_id,status,due_at);`);
}
export async function handleFollowups({db,req,res,path,tenant,json,limited,checkedJson}){
 if(path==='/api/crm/followups'){
  if(req.method==='GET'){
   json(res,200,{followups:db.prepare(`SELECT f.*,o.title AS opportunity_title,
     c.name AS contact_name FROM crm_followups f
     JOIN crm_opportunities o ON o.id=f.opportunity_id AND o.tenant_id=f.tenant_id
     JOIN crm_contacts c ON c.id=o.contact_id AND c.tenant_id=f.tenant_id
     WHERE f.tenant_id=? ORDER BY
     CASE WHEN f.status='open' THEN 0 ELSE 1 END,
     f.due_at ASC LIMIT 250`).all(tenant)});
   return true;
  }
  if(req.method==='POST'){
   const body=checkedJson(await limited(req));
   const opportunity=String(body.opportunity_id||'');
   if(!/^[a-f0-9-]{36}$/.test(opportunity))throw fail('Oportunidad inválida');
   if(!db.prepare('SELECT id FROM crm_opportunities WHERE id=? AND tenant_id=?').get(opportunity,tenant))
    throw fail('Oportunidad inexistente para esta empresa',404);
   if(!validTitle(body.title))throw fail('Título de seguimiento inválido');
   if(!validDate(body.due_at))throw fail('Fecha de seguimiento inválida');
   const id=randomUUID(),now=new Date().toISOString();
   db.prepare("INSERT INTO crm_followups (id,tenant_id,opportunity_id,title,due_at,status,created_at) VALUES (?,?,?,?,?,'open',?)")
    .run(id,tenant,opportunity,body.title.trim(),body.due_at,now);
   json(res,201,{followup:db.prepare('SELECT * FROM crm_followups WHERE tenant_id=? AND id=?').get(tenant,id)});
   return true;
  }
 }
 const match=path.match(/^\/api\/crm\/followups\/([a-f0-9-]{36})\/complete$/);
 if(match&&req.method==='POST'){
  const old=db.prepare('SELECT id,status FROM crm_followups WHERE tenant_id=? AND id=?').get(tenant,match[1]);
  if(!old)throw fail('Seguimiento no encontrado',404);
  if(old.status==='completed')throw fail('Seguimiento ya completado',409);
  const now=new Date().toISOString();
  db.prepare("UPDATE crm_followups SET status='completed',completed_at=? WHERE tenant_id=? AND id=? AND status='open'")
    .run(now,tenant,match[1]);
  json(res,200,{followup:db.prepare('SELECT * FROM crm_followups WHERE tenant_id=? AND id=?').get(tenant,match[1])});
  return true;
 }
 return false;
}

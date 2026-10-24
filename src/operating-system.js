import {randomUUID} from 'node:crypto';
import {ONTOLOGY_VERSION,RULES,commercialKnowledge} from './ontology.js';

const fail=(msg,status=400)=>Object.assign(new Error(msg),{status});
const DAY=86400000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const OPEN_STAGES=Object.freeze(['new','qualified','proposal','negotiation']);
const stageNames=Object.freeze({new:'Nuevo',qualified:'Calificado',proposal:'Propuesta',negotiation:'Negociación',won:'Ganado',lost:'Perdido'});
const iso=s=>new Date(s).toISOString();

export function initOperatingSystem(db){
 db.exec(`CREATE TABLE IF NOT EXISTS os_rule_runs(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
  idempotency_key TEXT NOT NULL,
  rule_version TEXT NOT NULL,created_at TEXT NOT NULL,
  candidates INTEGER NOT NULL CHECK(candidates>=0),
  created INTEGER NOT NULL CHECK(created>=0),
  UNIQUE(tenant_id,idempotency_key)
 );
 CREATE TABLE IF NOT EXISTS os_recommendations(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
  rule_id TEXT NOT NULL CHECK(rule_id IN ('OVERDUE_FOLLOWUP','OPEN_WITHOUT_FOLLOWUP','STALLED_OPPORTUNITY')),
  subject_type TEXT NOT NULL CHECK(subject_type IN ('opportunity','followup')),
  subject_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('critical','attention')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','acknowledged','dismissed')),
  first_detected_at TEXT NOT NULL,reviewed_at TEXT,
  UNIQUE(tenant_id,rule_id,subject_id),
  FOREIGN KEY(opportunity_id,tenant_id) REFERENCES crm_opportunities(id,tenant_id)
 );
 CREATE INDEX IF NOT EXISTS os_recommendations_by_tenant ON os_recommendations(tenant_id,status,severity,first_detected_at);
 CREATE TABLE IF NOT EXISTS os_audit(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
  actor TEXT NOT NULL CHECK(actor IN ('local_rule_engine','local_owner')),
  verb TEXT NOT NULL,subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,occurred_at TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT ''
 );
 CREATE INDEX IF NOT EXISTS os_audit_by_tenant ON os_audit(tenant_id,occurred_at);`);
}
export function planRules(db,tenant,clock=new Date()){
 const now=clock instanceof Date?clock.getTime():new Date(clock).getTime();
 if(!Number.isFinite(now))throw fail('Reloj inválido');
 const stageParams=OPEN_STAGES;
 const opportunities=db.prepare(`SELECT o.id,o.title,o.stage,o.updated_at,c.name AS contact_name
 FROM crm_opportunities o JOIN crm_contacts c ON o.contact_id=c.id AND o.tenant_id=c.tenant_id
 WHERE o.tenant_id=? AND o.stage IN ('new','qualified','proposal','negotiation')
 ORDER BY o.updated_at ASC LIMIT 1000`).all(tenant);
 const tasks=db.prepare(`SELECT f.id,f.opportunity_id,f.title,f.due_at,f.status
 FROM crm_followups f JOIN crm_opportunities o ON o.id=f.opportunity_id AND o.tenant_id=f.tenant_id
 WHERE f.tenant_id=? AND f.status='open' AND o.stage IN ('new','qualified','proposal','negotiation')
 ORDER BY f.due_at ASC LIMIT 2000`).all(tenant);
 const indexed=new Map();
 for(const t of tasks){if(!indexed.has(t.opportunity_id))indexed.set(t.opportunity_id,[]);indexed.get(t.opportunity_id).push(t)}
 const results=[];
 for(const opportunity of opportunities){
  const active=indexed.get(opportunity.id)||[];
  for(const t of active){
   if(new Date(t.due_at).getTime()>=now)continue;
   results.push({
    rule_id:RULES.OVERDUE_FOLLOWUP.id,subject_type:'followup',subject_id:t.id,
    opportunity_id:opportunity.id,title:'Seguimiento vencido: '+opportunity.contact_name,
    explanation:'La tarea '+t.title+' tiene fecha anterior a la revisión.',
    severity:'critical'
   });
  }
  if(!active.length){
   results.push({
    rule_id:RULES.OPEN_WITHOUT_FOLLOWUP.id,subject_type:'opportunity',subject_id:opportunity.id,
    opportunity_id:opportunity.id,title:'Sin próxima acción: '+opportunity.contact_name,
    explanation:'Esta oportunidad está abierta y no tiene un seguimiento pendiente.',
    severity:'attention'
   });
  }
  if(now-new Date(opportunity.updated_at).getTime()>=7*DAY){
   results.push({
    rule_id:RULES.STALLED_OPPORTUNITY.id,subject_type:'opportunity',subject_id:opportunity.id,
    opportunity_id:opportunity.id,title:'Oportunidad sin movimiento: '+opportunity.contact_name,
    explanation:'La oportunidad lleva al menos siete días sin cambios de etapa registrados.',
    severity:'attention'
   });
  }
 }
 return results;
}
export function runLocalRules(db,tenant,idempotencyKey,clock=new Date()){
 if(typeof idempotencyKey!=='string'||!UUID.test(idempotencyKey))throw fail('Clave de idempotencia inválida');
 const old=db.prepare('SELECT * FROM os_rule_runs WHERE tenant_id=? AND idempotency_key=?').get(tenant,idempotencyKey);
 if(old)return {...old,replayed:true};
 const candidates=planRules(db,tenant,clock);
 const now=iso(clock);
 let created=0;
 db.exec('BEGIN IMMEDIATE');
 try{
  // Check again under the SQLite write lock.
  const replay=db.prepare('SELECT * FROM os_rule_runs WHERE tenant_id=? AND idempotency_key=?').get(tenant,idempotencyKey);
  if(replay){db.exec('COMMIT');return {...replay,replayed:true}}
  const insert=db.prepare(`INSERT OR IGNORE INTO os_recommendations
   (id,tenant_id,rule_id,subject_type,subject_id,opportunity_id,title,explanation,severity,status,first_detected_at)
   VALUES (?,?,?,?,?,?,?,?,?,'pending_review',?)`);
  for(const item of candidates){
   const result=insert.run(randomUUID(),tenant,item.rule_id,item.subject_type,item.subject_id,
    item.opportunity_id,item.title,item.explanation,item.severity,now);
   created+=result.changes;
  }
  const runId=randomUUID();
  db.prepare(`INSERT INTO os_rule_runs
   (id,tenant_id,idempotency_key,rule_version,created_at,candidates,created)
   VALUES (?,?,?,?,?,?,?)`).run(runId,tenant,idempotencyKey,ONTOLOGY_VERSION,now,candidates.length,created);
  db.prepare(`INSERT INTO os_audit(id,tenant_id,actor,verb,subject_type,subject_id,occurred_at,context)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(),tenant,'local_rule_engine',
     'recommendations_evaluated','rule_run',runId,now,JSON.stringify({candidates:candidates.length,created}));
  db.exec('COMMIT');
  return {id:runId,tenant_id:tenant,idempotency_key:idempotencyKey,rule_version:ONTOLOGY_VERSION,
   created_at:now,candidates:candidates.length,created,replayed:false};
 }catch(err){db.exec('ROLLBACK');throw err}
}
export function reviewRecommendation(db,tenant,identifier,decision,clock=new Date()){
 if(typeof identifier!=='string'||!UUID.test(identifier))throw fail('Identificador inválido');
 if(!['acknowledged','dismissed'].includes(decision))throw fail('Revisión inválida');
 const now=iso(clock);
 let result;
 db.exec('BEGIN IMMEDIATE');
 try{
  const old=db.prepare('SELECT * FROM os_recommendations WHERE tenant_id=? AND id=?').get(tenant,identifier);
  if(!old)throw fail('Recomendación inexistente',404);
  if(old.status!=='pending_review')throw fail('Recomendación ya revisada',409);
  const updated=db.prepare(`UPDATE os_recommendations SET status=?,reviewed_at=?
    WHERE tenant_id=? AND id=? AND status='pending_review'`).run(decision,now,tenant,identifier);
  if(updated.changes!==1)throw fail('Conflicto de concurrencia',409);
  db.prepare(`INSERT INTO os_audit(id,tenant_id,actor,verb,subject_type,subject_id,occurred_at,context)
   VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(),tenant,'local_owner','recommendation_'+decision,'recommendation',identifier,now,'human review; no external side effect');
  result=db.prepare('SELECT * FROM os_recommendations WHERE tenant_id=? AND id=?').get(tenant,identifier);
  db.exec('COMMIT');
 }catch(err){db.exec('ROLLBACK');throw err}
 return result;
}
const rangeDays=x=>[7,30,90].includes(Number(x))?Number(x):30;
function makeBuckets(days,now){
 const count=days===7?7:days===30?6:13;
 const unit=days===7?DAY:7*DAY;
 const buckets=[];
 const aligned=Math.floor(now/unit)*unit;
 for(let i=count-1;i>=0;i--){
  const ts=aligned-i*unit;
  buckets.push({start:ts,end:ts+unit,label:new Date(ts).toISOString().slice(5,10),
   contacts:0,opportunities:0});
 }
 return buckets;
}
export function acquisitionAnalytics(db,tenant,{days=30,clock=new Date()}={}){
 days=rangeDays(days);
 const now=clock.getTime(),since=new Date(now-days*DAY).toISOString();
 const contacts=db.prepare(`SELECT id,name,channel,created_at FROM crm_contacts WHERE tenant_id=? ORDER BY created_at DESC LIMIT 10000`).all(tenant);
 const opp=db.prepare(`SELECT o.id,o.stage,o.amount_cents,o.updated_at,o.created_at,c.channel,c.name
 FROM crm_opportunities o JOIN crm_contacts c ON c.id=o.contact_id AND c.tenant_id=o.tenant_id
 WHERE o.tenant_id=? ORDER BY o.created_at DESC LIMIT 10000`).all(tenant);
 const followups=db.prepare(`SELECT status,due_at FROM crm_followups WHERE tenant_id=?`).all(tenant);
 const quotes=db.prepare(`SELECT subtotal_cents,direct_cost_snapshot_cents,projected_contribution_cents
 FROM commercial_quotes WHERE tenant_id=? ORDER BY created_at DESC LIMIT 10000`).all(tenant);
 const stages=['new','qualified','proposal','negotiation','won','lost'].map(stage=>({
  stage,label:stageNames[stage],count:opp.filter(o=>o.stage===stage).length,
  estimated_value_cents:opp.filter(o=>o.stage===stage).reduce((n,o)=>n+o.amount_cents,0)
 }));
 const channels=['instagram','facebook','whatsapp','manual'].map(channel=>({
  channel,contacts:contacts.filter(c=>c.channel===channel).length,
  opportunities:opp.filter(o=>o.channel===channel).length
 }));
 const overdue=followups.filter(f=>f.status==='open'&&Date.parse(f.due_at)<now).length;
 const tasksOpen=followups.filter(f=>f.status==='open').length;
 const openOpportunities=opp.filter(o=>OPEN_STAGES.includes(o.stage));
 const gained=opp.filter(o=>o.stage==='won');
 const series=makeBuckets(days,now);
 for(const contact of contacts){const ts=Date.parse(contact.created_at);const b=series.find(x=>ts>=x.start&&ts<x.end);if(b)b.contacts++}
 for(const o of opp){const ts=Date.parse(o.created_at);const b=series.find(x=>ts>=x.start&&ts<x.end);if(b)b.opportunities++}
 const quoteValue=quotes.reduce((a,q)=>a+q.subtotal_cents,0);
 const allKnown=quotes.length>0&&quotes.every(q=>q.direct_cost_snapshot_cents!==null);
 const recommendations=db.prepare(`SELECT status,severity,COUNT(*) count FROM os_recommendations
 WHERE tenant_id=? GROUP BY status,severity`).all(tenant);
 return {
  as_of:clock.toISOString(),tenant_id:tenant,period_days:days,mode:'LOCAL_RECORDS',
  coverage:{contacts:contacts.length,opportunities:opp.length,quotes:quotes.length},
  kpis:{
   contacts_total:contacts.length,
   contacts_period:contacts.filter(c=>c.created_at>=since).length,
   opportunities_open:openOpportunities.length,
   opportunities_won_declarations:gained.length,
   pipeline_open_estimated_cents:openOpportunities.reduce((n,o)=>n+o.amount_cents,0),
   won_declared_estimated_cents:gained.reduce((n,o)=>n+o.amount_cents,0),
   followups_open:tasksOpen,followups_overdue:overdue,
   quote_drafts:quotes.length,
   quoted_estimated_cents:quotes.length?quoteValue:null,
   direct_contribution_estimated_cents:allKnown?quotes.reduce((n,q)=>n+q.projected_contribution_cents,0):null,
   verified_revenue_cents:null,spend_cents:null,cac_cents:null,roas:null,
   average_response_seconds:null
  },
  stages,channels,series:series.map(({start,end,...b})=>b),
  review_queue:recommendations,
  evidence:{
   contacts:'crm_contacts.created_at',
   opportunities:'crm_opportunities.stage; won is not payment',
   channels:'crm_contacts.channel (declared origin, not Meta analytics)',
   quote_estimates:'commercial_quotes draft snapshots',
   conversions:'stage declarations only; not independent sales evidence',
   revenue:'NOT_INTEGRATED',marketing_spend:'NOT_INTEGRATED',
   response_time:'NOT_INTEGRATED',
   caveat:'Los números reflejan únicamente registros locales. CAC, ROAS, cobros reales y conversaciones no están conectados.'
  }
 };
}
export async function handleOperatingSystem({db,req,res,path,url,tenant,json,limited,checkedJson}){
 if(req.method==='GET'&&path==='/api/os/ontology'){
  return json(res,200,commercialKnowledge());
 }
 if(req.method==='GET'&&path==='/api/os/analytics'){
  return json(res,200,acquisitionAnalytics(db,tenant,{days:rangeDays(url.searchParams.get('days'))}));
 }
 if(req.method==='GET'&&path==='/api/os/recommendations'){
  const rows=db.prepare(`SELECT r.*,o.title AS opportunity_title,c.name AS contact_name
    FROM os_recommendations r
    JOIN crm_opportunities o ON o.id=r.opportunity_id AND o.tenant_id=r.tenant_id
    JOIN crm_contacts c ON c.id=o.contact_id AND c.tenant_id=o.tenant_id
    WHERE r.tenant_id=?
    ORDER BY CASE WHEN r.status='pending_review' THEN 0 ELSE 1 END,
     CASE WHEN r.severity='critical' THEN 0 ELSE 1 END,r.first_detected_at DESC LIMIT 250`).all(tenant);
  return json(res,200,{recommendations:rows,automation_enabled:false});
 }
 if(req.method==='POST'&&path==='/api/os/orchestrate'){
  const body=checkedJson(await limited(req,4096));
  if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Solicitud inválida');
  const result=runLocalRules(db,tenant,body.idempotency_key);
  return json(res,200,{run:result,external_actions:0,requires_human_review:true});
 }
 const match=path.match(/^\/api\/os\/recommendations\/([a-f0-9-]{36})\/review$/);
 if(req.method==='POST'&&match){
  const body=checkedJson(await limited(req,4096));
  if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Solicitud inválida');
  const record=reviewRecommendation(db,tenant,match[1],body.decision);
  return json(res,200,{recommendation:record,external_actions:0});
 }
 return false;
}

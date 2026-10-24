import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initCrm} from '../src/crm.js';
import {initFollowups} from '../src/followups.js';
import {initCommercial} from '../src/commercial.js';
import {initOperatingSystem,planRules,runLocalRules,reviewRecommendation,acquisitionAnalytics} from '../src/operating-system.js';
import {DOMAIN,ONTOLOGY_VERSION,commercialKnowledge} from '../src/ontology.js';

const NOW=new Date('2026-10-24T12:00:00.000Z');
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE tenants(id TEXT PRIMARY KEY,name TEXT,segment TEXT);
 INSERT INTO tenants VALUES('demo-wal','WAL','retail'),('demo-vaa','Visual Art AI','services');`);
 initCrm(db);initFollowups(db);initCommercial(db);initOperatingSystem(db);
 const c=db.prepare('INSERT INTO crm_contacts(id,tenant_id,name,channel,created_at) VALUES(?,?,?,?,?)');
 const o=db.prepare(`INSERT INTO crm_opportunities
  (id,tenant_id,contact_id,title,amount_cents,stage,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?)`);
 const f=db.prepare(`INSERT INTO crm_followups
  (id,tenant_id,opportunity_id,title,due_at,status,created_at)
  VALUES(?,?,?,?,?,'open',?)`);
 const contacts=['a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','c3333333-3333-4333-8333-333333333333'];
 const opportunities=['d4444444-4444-4444-8444-444444444444','e5555555-5555-4555-8555-555555555555','f6666666-6666-4666-8666-666666666666'];
 const task='a7777777-7777-4777-8777-777777777777';
 c.run(contacts[0],'demo-wal','Persona WAL','instagram','2026-10-23T12:00:00.000Z');
 c.run(contacts[1],'demo-wal','Otra persona WAL','manual','2026-10-20T12:00:00.000Z');
 c.run(contacts[2],'demo-vaa','Empresa VAA','facebook','2026-10-24T11:00:00.000Z');
 o.run(opportunities[0],'demo-wal',contacts[0],'Tazón',1999000,'proposal','2026-10-23T12:00:00.000Z','2026-10-23T12:00:00.000Z');
 o.run(opportunities[1],'demo-wal',contacts[1],'Pack',6999000,'qualified','2026-10-12T12:00:00.000Z','2026-10-12T12:00:00.000Z');
 o.run(opportunities[2],'demo-vaa',contacts[2],'Servicio digital',15000000,'won','2026-10-24T11:00:00.000Z','2026-10-24T11:00:00.000Z');
 f.run(task,'demo-wal',opportunities[0],'Enviar diseño','2026-10-21T12:00:00.000Z','2026-10-23T12:00:00.000Z');
 return {db,contacts,opportunities,task};
}
test('la ontología separa pago, consentimiento, organizaciones y acciones externas',()=>{
 assert.equal(ONTOLOGY_VERSION,'acquisition-os.ontology.v1');
 assert.equal(DOMAIN.Opportunity.states.at(-2),'won');
 const o=commercialKnowledge();
 assert.equal(o.capabilities['send.message'].mode,'unavailable');
 assert.equal(o.capabilities['verify.payment'].mode,'unavailable');
 assert.ok(o.invariants.some(x=>x.includes('won is not a verified payment')));
});
test('reglas calculan solo oportunidades abiertas de su empresa y vencimientos reales',()=>{
 const {db}=fixture();
 const wal=planRules(db,'demo-wal',NOW),vaa=planRules(db,'demo-vaa',NOW);
 assert.equal(wal.filter(x=>x.rule_id==='OVERDUE_FOLLOWUP').length,1);
 assert.equal(wal.filter(x=>x.rule_id==='OPEN_WITHOUT_FOLLOWUP').length,1);
 assert.equal(wal.filter(x=>x.rule_id==='STALLED_OPPORTUNITY').length,1);
 assert.equal(vaa.length,0);
 assert.ok(wal.every(x=>x.severity!=='critical'||x.rule_id==='OVERDUE_FOLLOWUP'));
});
test('orquestación es transaccional, idempotente y jamás ejecuta acciones externas',()=>{
 const {db}=fixture();
 const key='a8888888-8888-4888-8888-888888888888';
 const one=runLocalRules(db,'demo-wal',key,NOW);
 assert.equal(one.created,3);assert.equal(one.candidates,3);assert.equal(one.replayed,false);
 const same=runLocalRules(db,'demo-wal',key,NOW);
 assert.equal(same.replayed,true);assert.equal(same.id,one.id);
 const two=runLocalRules(db,'demo-wal','a9999999-9999-4999-8999-999999999999',NOW);
 assert.equal(two.created,0);
 const count=db.prepare('SELECT COUNT(*) n FROM os_recommendations WHERE tenant_id=?').get('demo-wal').n;
 assert.equal(count,3);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM os_recommendations WHERE tenant_id=?').get('demo-vaa').n,0);
 const audit=db.prepare('SELECT actor,verb,context FROM os_audit WHERE tenant_id=?').all('demo-wal');
 assert.equal(audit.length,2);
 assert.ok(audit.every(x=>x.actor==='local_rule_engine'));
 assert.throws(()=>runLocalRules(db,'demo-wal','not-a-uuid',NOW),/idempotencia/);
});
test('revisión humana no altera estados CRM ni decisiones ajenas',()=>{
 const {db,opportunities}=fixture();
 runLocalRules(db,'demo-wal','b8888888-8888-4888-8888-888888888888',NOW);
 const item=db.prepare('SELECT * FROM os_recommendations WHERE tenant_id=? ORDER BY id LIMIT 1').get('demo-wal');
 assert.throws(()=>reviewRecommendation(db,'demo-vaa',item.id,'acknowledged',NOW),/inexistente/);
 assert.throws(()=>reviewRecommendation(db,'demo-wal',item.id,'send_message',NOW),/inválida/);
 const reviewed=reviewRecommendation(db,'demo-wal',item.id,'acknowledged',NOW);
 assert.equal(reviewed.status,'acknowledged');
 assert.throws(()=>reviewRecommendation(db,'demo-wal',item.id,'dismissed',NOW),/ya revisada/);
 assert.equal(db.prepare('SELECT stage FROM crm_opportunities WHERE id=?').get(opportunities[0]).stage,'proposal');
 const a=db.prepare(`SELECT actor,verb FROM os_audit WHERE tenant_id=? AND subject_type='recommendation'`).all('demo-wal');
 assert.equal(a.length,1);assert.equal(a[0].actor,'local_owner');
});
test('analítica refleja hechos locales y no inventa CAC, ROAS, ingresos cobrados ni respuesta',()=>{
 const {db}=fixture();
 const wal=acquisitionAnalytics(db,'demo-wal',{days:30,clock:NOW});
 assert.equal(wal.kpis.contacts_total,2);
 assert.equal(wal.kpis.opportunities_open,2);
 assert.equal(wal.kpis.pipeline_open_estimated_cents,8998000);
 assert.equal(wal.kpis.followups_overdue,1);
 assert.equal(wal.kpis.verified_revenue_cents,null);
 assert.equal(wal.kpis.spend_cents,null);
 assert.equal(wal.kpis.roas,null);
 assert.equal(wal.kpis.average_response_seconds,null);
 assert.equal(wal.channels.find(x=>x.channel==='instagram').contacts,1);
 assert.equal(wal.series.reduce((n,x)=>n+x.contacts,0),2);
 const vaa=acquisitionAnalytics(db,'demo-vaa',{days:30,clock:NOW});
 assert.equal(vaa.kpis.contacts_total,1);
 assert.equal(vaa.kpis.opportunities_open,0);
 assert.equal(vaa.kpis.opportunities_won_declarations,1);
 assert.equal(vaa.kpis.verified_revenue_cents,null);
 assert.equal(vaa.stages.find(x=>x.stage==='won').count,1);
});

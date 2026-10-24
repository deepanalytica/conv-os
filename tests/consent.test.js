import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initCrm} from '../src/crm.js';
import {initConsent,consentSummary,handleConsent} from '../src/consent.js';
const db=new DatabaseSync(':memory:');
db.exec("PRAGMA foreign_keys=ON; CREATE TABLE tenants(id TEXT PRIMARY KEY,name TEXT,segment TEXT); INSERT INTO tenants VALUES ('tenant-a','A','retail'),('tenant-b','B','services');");
initCrm(db);initConsent(db);
const a='90aebc1b-1c5d-4e09-88a2-52f0c7d83735';
const b='c06e9e11-d8a2-44ec-a6d8-ad97e5364a52';
const now=new Date().toISOString();
const insert=db.prepare('INSERT INTO crm_contacts (id,tenant_id,name,channel,created_at) VALUES (?,?,?,?,?)');
insert.run(a,'tenant-a','Ficticio A','manual',now);
insert.run(b,'tenant-b','Ficticio B','manual',now);
async function call(tenant,id,method='GET',body={}){
 let response;
 try{
  const routed=await handleConsent({db,tenant,req:{method},res:{},
   path:'/api/privacy/contacts/'+id+'/consent',
   limited:async()=>Buffer.from(JSON.stringify(body)),
   checkedJson:raw=>JSON.parse(raw.toString()),
   json:(_res,status,payload)=>{response={status,data:payload}}});
  return {routed,...response};
 }catch(error){return {routed:true,status:error.status||500,data:{error:error.message}}}
}
test('sin consentimiento verificable no existe autorización para enviar',()=>{
 assert.deepEqual(consentSummary([]),{
  marketing_permission:'UNKNOWN',service_permission:'UNKNOWN',outbound_automation_allowed:false,
  reason:'No hay OAuth, evidencia verificable ni política de canal aprobada'
 });
});
test('opt-in autodeclarado no habilita marketing autónomo',async()=>{
 const x=await call('tenant-a',a,'POST',{channel:'instagram',purpose:'marketing',decision:'claimed_opt_in'});
 assert.equal(x.status,201);
 assert.equal(x.data.summary.marketing_permission,'UNVERIFIED_CLAIM');
 assert.equal(x.data.summary.outbound_automation_allowed,false);
 assert.equal(x.data.receipt.evidence,'operator_claim_unverified');
});
test('opt-out es conservador y mantiene historia sin alterar otra empresa',async()=>{
 const x=await call('tenant-a',a,'POST',{channel:'instagram',purpose:'marketing',decision:'opted_out'});
 assert.equal(x.status,201);
 assert.equal(x.data.summary.marketing_permission,'OPTED_OUT');
 const cross=await call('tenant-b',a);
 assert.equal(cross.status,404);
 const get=await call('tenant-a',a);
 assert.equal(get.status,200);
 assert.equal(get.data.receipts.length,2);
 const laterUnverified=await call('tenant-a',a,'POST',{channel:'facebook',purpose:'marketing',decision:'claimed_opt_in'});
 assert.equal(laterUnverified.status,201);
 assert.equal(laterUnverified.data.summary.marketing_permission,'OPTED_OUT');
  const other=await call('tenant-b',b);
 assert.equal(other.data.receipts.length,0);
 assert.equal(other.data.summary.marketing_permission,'UNKNOWN');
});
test('no se permite fingir consentimiento validado o canal desconocido',async()=>{
 const fake=await call('tenant-a',a,'POST',{channel:'whatsapp',purpose:'marketing',decision:'verified_opt_in'});
 assert.equal(fake.status,400);
 const bad=await call('tenant-a',a,'POST',{channel:'sms',purpose:'marketing',decision:'opted_out'});
 assert.equal(bad.status,400);
 const another=await call('tenant-a',b,'POST',{channel:'manual',purpose:'service',decision:'opted_out'});
 assert.equal(another.status,404);
});

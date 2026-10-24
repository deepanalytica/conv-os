import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {request} from 'node:http';
import {passwordHash} from '../src/security.js';
process.env.DB_PATH=':memory:';
process.env.DEMO_MODE='true';
process.env.CONVOS_AUTH_HASH=passwordHash('unit test private owner password');
process.env.ENABLE_META_WEBHOOKS='true';
process.env.META_APP_SECRET='unit-test-meta-secret';
process.env.META_TENANT_ID='demo-food';
process.env.META_PHONE_NUMBER_ID='123';
const {createServer}=await import('../src/server.js');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
test.after(()=>new Promise(resolve=>server.close(resolve)));
let cookie='',csrf='';
async function call(path,{method='GET',tenant='demo-food',token='valid',body,headers={}}={}){
 const response=await fetch(url+path,{method,headers:{cookie:token==='wrong'?'convos_local_session=invalid':cookie,'x-csrf-token':csrf,'x-tenant-id':tenant,'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
test('no hay acceso por token demo y existe login seguro',async()=>{
 const unauth=await fetch(url+'/api/tenants',{headers:{authorization:'Bearer local-demo-token'}});
 assert.equal(unauth.status,401);
 const incorrect=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-convos-login':'1'},body:JSON.stringify({password:'bad password'})});
 assert.equal(incorrect.status,401);
 const login=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-convos-login':'1'},body:JSON.stringify({password:'unit test private owner password'})});
 assert.equal(login.status,200);
 cookie=login.headers.get('set-cookie').split(';')[0];
 assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
 const session=await fetch(url+'/api/auth/session',{headers:{cookie}});
 assert.equal(session.status,200);
 csrf=(await session.json()).csrf;
 const denied=await fetch(url+'/api/crm/contacts',{method:'POST',headers:{cookie,'x-tenant-id':'demo-wal','content-type':'application/json'},body:JSON.stringify({name:'Bad',channel:'manual'})});
 assert.equal(denied.status,403);
 const hostStatus=await new Promise((resolve,reject)=>{
  const h=request(url+'/api/health',{headers:{Host:'evil.com'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});
  h.on('error',reject);h.end();
 });
 assert.equal(hostStatus,403);
 const foreignOrigin=await fetch(url+'/api/crm/contacts',{method:'POST',headers:{cookie,'x-tenant-id':'demo-wal','x-csrf-token':csrf,'content-type':'application/json',origin:'http://localhost:5555'},body:JSON.stringify({name:'No autorizado',channel:'manual'})});
 assert.equal(foreignOrigin.status,403);
});
test('salud y acceso protegido',async()=>{
 assert.equal((await call('/api/health')).status,200);
 assert.equal((await call('/api/tenants',{token:'wrong'})).status,401);
 const tenants=await call('/api/tenants');
 assert.equal(tenants.data.tenants.length,5);
});
test('pedido cotizado y aislado por empresa',async()=>{
 const created=await call('/api/orders',{method:'POST',body:{customer:'Cliente de prueba',items:[{productId:'p1',qty:2}]}});
 assert.equal(created.status,201);
 assert.equal(created.data.order.total_cents,598000);
 const order=created.data.order;
 const cross=await call('/api/orders',{tenant:'demo-service'});
 assert.equal(cross.data.orders.length,0);
 const denied=await call('/api/orders/'+order.id+'/status',{method:'POST',body:{status:'paid'}});
 assert.equal(denied.status,403);
 const paid=await call('/api/orders/'+order.id+'/sandbox-payment',{method:'POST',body:{}});
 assert.equal(paid.status,200);
 assert.equal(paid.data.order.status,'paid');
 assert.ok(paid.data.order.verified_at);
 const duplicate=await call('/api/orders/'+order.id+'/sandbox-payment',{method:'POST',body:{}});
 assert.notEqual(duplicate.status,200);
 const progressed=await call('/api/orders/'+order.id+'/status',{method:'POST',body:{status:'in_progress'}});
 assert.equal(progressed.status,200);
 const crossUpdate=await call('/api/orders/'+order.id+'/status',{tenant:'demo-service',method:'POST',body:{status:'ready'}});
 assert.equal(crossUpdate.status,404);
});
test('Meta webhook invalida firmas incorrectas y evita mensajes duplicados',async()=>{
 const message={entry:[{changes:[{value:{metadata:{phone_number_id:'123'},messages:[{id:'test-message-1',from:'56912345678',type:'text',text:{body:'Necesito cotizar'}}]}}]}]};
 const raw=JSON.stringify(message);
 const bad=await fetch(url+'/api/meta/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256=incorrect'},body:raw});
 assert.equal(bad.status,401);
 const sig='sha256='+createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex');
 for(let i=0;i<2;i++){
  const result=await fetch(url+'/api/meta/webhook',{method:'POST',headers:{'x-hub-signature-256':sig},body:raw});
  assert.equal(result.status,200);
 }
 const list=await call('/api/messages');
 assert.equal(list.data.messages.length,1);
});

test('CRM: contactos y oportunidades están aislados por empresa',async()=>{
 const contact=await call('/api/crm/contacts',{method:'POST',tenant:'demo-wal',body:{name:'Contacto de prueba',channel:'instagram'}});
 assert.equal(contact.status,201);
 assert.equal(contact.data.contact.consent_status,'unknown');
 const contactId=contact.data.contact.id;
 const wrongTenant=await call('/api/crm/opportunities',{method:'POST',tenant:'demo-vaa',body:{contact_id:contactId,title:'No permitido',amount_cents:1000}});
 assert.equal(wrongTenant.status,404);
 const created=await call('/api/crm/opportunities',{method:'POST',tenant:'demo-wal',body:{contact_id:contactId,title:'Tazón personalizado',amount_cents:1999000,source:'manual'}});
 assert.equal(created.status,201);
 assert.equal(created.data.opportunity.stage,'new');
 const id=created.data.opportunity.id;
 const crossList=await call('/api/crm/opportunities',{tenant:'demo-vaa'});
 assert.ok(crossList.data.opportunities.every(x=>x.id!==id));
 const crossUpdate=await call('/api/crm/opportunities/'+id+'/stage',{method:'POST',tenant:'demo-vaa',body:{stage:'qualified'}});
 assert.equal(crossUpdate.status,404);
 const leap=await call('/api/crm/opportunities/'+id+'/stage',{method:'POST',tenant:'demo-wal',body:{stage:'won'}});
 assert.equal(leap.status,400);
 for(const stage of ['qualified','proposal','won']){
  const update=await call('/api/crm/opportunities/'+id+'/stage',{method:'POST',tenant:'demo-wal',body:{stage}});
  assert.equal(update.status,200);
  assert.equal(update.data.opportunity.stage,stage);
 }
 const repeat=await call('/api/crm/opportunities/'+id+'/stage',{method:'POST',tenant:'demo-wal',body:{stage:'won'}});
 assert.equal(repeat.status,400);
 const overview=await call('/api/crm/overview',{tenant:'demo-wal'});
 assert.equal(overview.status,200);
 assert.ok(overview.data.wonEstimatedCents>=1999000);
});
test('CRM: valida canales, importes y autenticación',async()=>{
 const invalidChannel=await call('/api/crm/contacts',{method:'POST',tenant:'demo-wal',body:{name:'X',channel:'sms'}});
 assert.equal(invalidChannel.status,400);
 const c=await call('/api/crm/contacts',{tenant:'demo-wal'});
 const valid=c.data.contacts[0];
 const negative=await call('/api/crm/opportunities',{method:'POST',tenant:'demo-wal',body:{contact_id:valid.id,title:'Precio inválido',amount_cents:-10}});
 assert.equal(negative.status,400);
 const noToken=await call('/api/crm/contacts',{tenant:'demo-wal',token:'wrong'});
 assert.equal(noToken.status,401);
});

test('seguimientos manuales conservan aislamiento y estado de cumplimiento',async()=>{
 const c=await call('/api/crm/contacts',{method:'POST',tenant:'demo-wal',body:{name:'Cliente de seguimiento',channel:'manual'}});
 assert.equal(c.status,201);
 const o=await call('/api/crm/opportunities',{method:'POST',tenant:'demo-wal',body:{contact_id:c.data.contact.id,title:'Pedido personalizado',amount_cents:1000000}});
 assert.equal(o.status,201);
 const due_at='2026-12-01T12:00:00.000Z';
 const other=await call('/api/crm/followups',{tenant:'demo-vaa',method:'POST',body:{opportunity_id:o.data.opportunity.id,title:'No permitido',due_at}});
 assert.equal(other.status,404);
 const f=await call('/api/crm/followups',{tenant:'demo-wal',method:'POST',body:{opportunity_id:o.data.opportunity.id,title:'Confirmar diseño del pedido',due_at}});
 assert.equal(f.status,201);
 assert.equal(f.data.followup.status,'open');
 const incorrectDate=await call('/api/crm/followups',{tenant:'demo-wal',method:'POST',body:{opportunity_id:o.data.opportunity.id,title:'Fecha incorrecta',due_at:'mañana'}});
 assert.equal(incorrectDate.status,400);
 const cross=await call('/api/crm/followups/'+f.data.followup.id+'/complete',{tenant:'demo-vaa',method:'POST',body:{}});
 assert.equal(cross.status,404);
 const done=await call('/api/crm/followups/'+f.data.followup.id+'/complete',{tenant:'demo-wal',method:'POST',body:{}});
 assert.equal(done.status,200);
 assert.equal(done.data.followup.status,'completed');
 const duplicate=await call('/api/crm/followups/'+f.data.followup.id+'/complete',{tenant:'demo-wal',method:'POST',body:{}});
 assert.equal(duplicate.status,409);
});

test('Acquisition OS: endpoints protegidos, métricas verificables y revisión humana',async()=>{
 const noAuth=await call('/api/os/analytics',{tenant:'demo-wal',token:'wrong'});
 assert.equal(noAuth.status,401);
 const ontology=await call('/api/os/ontology',{tenant:'demo-wal'});
 assert.equal(ontology.status,200);
 assert.equal(ontology.data.ontology_version,'acquisition-os.ontology.v1');
 assert.equal(ontology.data.capabilities['send.message'].mode,'unavailable');
 const metrics=await call('/api/os/analytics?days=30',{tenant:'demo-wal'});
 assert.equal(metrics.status,200);
 assert.equal(metrics.data.tenant_id,'demo-wal');
 assert.equal(metrics.data.kpis.verified_revenue_cents,null);
 assert.equal(metrics.data.kpis.roas,null);
 const originalVaa=await call('/api/os/recommendations',{tenant:'demo-vaa'});
 assert.equal(originalVaa.status,200);
 const key='c1234567-1234-4123-8123-123456789012';
 const created=await call('/api/os/orchestrate',{method:'POST',tenant:'demo-wal',body:{idempotency_key:key}});
 assert.equal(created.status,200);
 assert.equal(created.data.external_actions,0);
 assert.equal(created.data.requires_human_review,true);
 assert.ok(created.data.run.candidates>=1);
 const replay=await call('/api/os/orchestrate',{method:'POST',tenant:'demo-wal',body:{idempotency_key:key}});
 assert.equal(replay.status,200);
 assert.equal(replay.data.run.replayed,true);
 const recommendations=await call('/api/os/recommendations',{tenant:'demo-wal'});
 assert.equal(recommendations.status,200);
 const item=recommendations.data.recommendations.find(x=>x.status==='pending_review');
 assert.ok(item);
 const wrong=await call('/api/os/recommendations/'+item.id+'/review',{method:'POST',tenant:'demo-vaa',body:{decision:'acknowledged'}});
 assert.equal(wrong.status,404);
 const invalid=await call('/api/os/recommendations/'+item.id+'/review',{method:'POST',tenant:'demo-wal',body:{decision:'send_message'}});
 assert.equal(invalid.status,400);
 const accepted=await call('/api/os/recommendations/'+item.id+'/review',{method:'POST',tenant:'demo-wal',body:{decision:'acknowledged'}});
 assert.equal(accepted.status,200);
 assert.equal(accepted.data.external_actions,0);
 const second=await call('/api/os/recommendations/'+item.id+'/review',{method:'POST',tenant:'demo-wal',body:{decision:'dismissed'}});
 assert.equal(second.status,409);
 const afterVaa=await call('/api/os/recommendations',{tenant:'demo-vaa'});
 assert.deepEqual(afterVaa.data.recommendations,originalVaa.data.recommendations);
});

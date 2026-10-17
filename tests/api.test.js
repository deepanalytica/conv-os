import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
process.env.DB_PATH=':memory:';
process.env.DEMO_MODE='true';
process.env.META_APP_SECRET='unit-test-meta-secret';
process.env.META_TENANT_ID='demo-food';
process.env.META_PHONE_NUMBER_ID='123';
const {createServer}=await import('../src/server.js');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
test.after(()=>new Promise(resolve=>server.close(resolve)));
async function call(path,{method='GET',tenant='demo-food',token='local-demo-token',body,headers={}}={}){
 const response=await fetch(url+path,{method,headers:{authorization:'Bearer '+token,'x-tenant-id':tenant,'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
test('salud y acceso protegido',async()=>{
 assert.equal((await call('/api/health')).status,200);
 assert.equal((await call('/api/tenants',{token:'wrong'})).status,401);
 const tenants=await call('/api/tenants');
 assert.equal(tenants.data.tenants.length,3);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionStatus,CHANNELS} from '../src/integrations.js';
import {handleMetaRequest,hmacHex,descriptors} from '../edge/meta-gateway/src/index.js';

test('connection manager never invents OAuth, consent or live accounts',()=>{
 const data=connectionStatus({META_APP_ID:'123',META_WEBHOOK_GATEWAY_URL:'https://gateway.example',
   META_APP_REVIEW_APPROVED:'true'});
 assert.equal(data.channels.length,3);
 assert.deepEqual(data.channels.map(c=>c.status),['NOT_CONNECTED','NOT_CONNECTED','NOT_CONNECTED']);
 assert.equal(data.outbound_enabled,false);
 assert.equal(data.inbound_enabled,false);
 assert.equal(data.real_accounts_connected,0);
 assert.equal(data.configured.gateway,true);
 assert.equal(data.configured.appReview,true);
 assert.ok(CHANNELS.find(x=>x.id==='instagram').permissions.includes('instagram_business_manage_messages'));
});
function mock(known=[]){
 const sent=[];
 const env={
  ENABLE_META_INBOUND:'true',META_APP_SECRET:'example-unit-secret-not-for-production',
  META_VERIFY_TOKEN:'test-verifier',HASH_KEY:'another-different-test-secret-not-for-prod',
  ACCOUNTS:{
   prepare:()=>({bind:(platform,account,status)=>({
    first:async()=>known.some(k=>k.platform===platform&&k.account===account&&status==='VERIFIED')?{tenant_id:'tenant-wal'}:null
   })})
  },
  INBOUND_EVENTS:{sendBatch:async events=>sent.push(...events)}
 };
 return {env,sent};
}
async function signed(payload,env,override){
 const body=JSON.stringify(payload);
 const sig='sha256='+await hmacHex(env.META_APP_SECRET,new TextEncoder().encode(body));
 return handleMetaRequest(new Request('https://gateway.example/webhooks/meta',{
  method:'POST',headers:{'x-hub-signature-256':override||sig,'content-type':'application/json'},body
 }),env);
}
test('gateway accepts only enabled and correctly signed webhooks',async()=>{
 const {env,sent}=mock();
 const req=new Request('https://gateway.example/webhooks/meta',{method:'POST',
  headers:{'x-hub-signature-256':'sha256=bad'},body:'{"object":"page"}'});
 const bad=await handleMetaRequest(req,env);
 assert.equal(bad.status,401);
 assert.equal(sent.length,0);
 const disabled=await handleMetaRequest(new Request('https://gateway.example/webhooks/meta',{method:'POST',body:'{}'}),{...env,ENABLE_META_INBOUND:'false'});
 assert.equal(disabled.status,503);
 const verification=await handleMetaRequest(new Request('https://gateway.example/webhooks/meta?hub.mode=subscribe&hub.verify_token=test-verifier&hub.challenge=health123'),env);
 assert.equal(verification.status,200);
 assert.equal(await verification.text(),'health123');
 const forbidden=await handleMetaRequest(new Request('https://gateway.example/webhooks/meta?hub.mode=subscribe&hub.verify_token=guess&hub.challenge=abc'),env);
 assert.equal(forbidden.status,403);
});
test('verified WhatsApp receives only metadata; sender number and text never leave gateway',async()=>{
 const {env,sent}=mock([{platform:'whatsapp',account:'123456789'}]);
 const payload={object:'whatsapp_business_account',entry:[{changes:[{value:{
  metadata:{phone_number_id:'123456789',display_phone_number:'+56 9 9999 9999'},
  messages:[{id:'wamid.unique-demo',from:'56912345678',type:'text',text:{body:'Private customer conversation'}}]
 }}]}]};
 const response=await signed(payload,env);
 assert.equal(response.status,200);
 assert.equal(sent.length,1);
 const record=sent[0].body;
 assert.equal(record.tenant_id,'tenant-wal');
 assert.equal(record.platform,'whatsapp');
 assert.equal(record.contains_customer_content,false);
 assert.match(record.event_hash,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(sent),/56912345678|Private customer conversation|9999 9999/);
 const wrongAccount={...payload,entry:[{changes:[{value:{metadata:{phone_number_id:'111222333'},messages:payload.entry[0].changes[0].value.messages}}]}]};
 assert.equal((await signed(wrongAccount,env)).status,200);
 assert.equal(sent.length,1);
});
test('Messenger and Instagram event extraction stays account-scoped and bounded',()=>{
 const instagram={object:'instagram',entry:[{id:'1234567890',messaging:[{message:{mid:'ig-mid'},sender:{id:'private-sender'}}]}]};
 const fb={object:'page',entry:[{id:'9876543210',messaging:[{message:{mid:'fb-mid',text:'secret'}}]}]};
 const i=descriptors(instagram);const m=descriptors(fb);
 assert.deepEqual(i,[{platform:'instagram',account:'1234567890',eventId:'ig-mid',kind:'inbound_message'}]);
 assert.deepEqual(m,[{platform:'messenger',account:'9876543210',eventId:'fb-mid',kind:'inbound_message'}]);
 assert.deepEqual(descriptors({object:'unknown',entry:fb.entry}),[]);
});
test('invalid or overly large requests do not enqueue',async()=>{
 const {env,sent}=mock([{platform:'whatsapp',account:'123456789'}]);
 const huge=new Request('https://gateway.example/webhooks/meta',{method:'POST',
  headers:{'content-length':'99999999'},body:'abc'});
 assert.equal((await handleMetaRequest(huge,env)).status,413);
 const broken='{"object":"whatsapp_business_account"';
 const sig='sha256='+await hmacHex(env.META_APP_SECRET,new TextEncoder().encode(broken));
 const res=await handleMetaRequest(new Request('https://gateway.example/webhooks/meta',{method:'POST',
  headers:{'x-hub-signature-256':sig},body:broken}),env);
 assert.equal(res.status,400);
 assert.equal(sent.length,0);
});

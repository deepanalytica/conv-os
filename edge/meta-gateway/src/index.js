// Cloudflare Worker / Meta inbound-only gateway.
// Deliberately transfers *no* customer message body, sender phone, attachments or token.
// Mapping external accounts to a tenant is an administrative database operation
// after a VERIFIED official OAuth/Embedded Signup; no public onboarding endpoints.
const LIMIT=256*1024;
const textHeaders={'cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(status,body)=>new Response(body,{status,headers:{...textHeaders,'content-type':'text/plain; charset=utf-8'}});
const eq=(a,b)=>{
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
};
const bytes=s=>new TextEncoder().encode(s);
const hex=data=>Array.from(new Uint8Array(data),x=>x.toString(16).padStart(2,'0')).join('');
export async function hmacHex(secret,data){
 const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,data));
}
async function bufferLimited(request){
 const reader=request.body?.getReader();
 if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>LIMIT){await reader.cancel();return null}
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 const result=new Uint8Array(size);let i=0;
 for(const chunk of chunks){result.set(chunk,i);i+=chunk.byteLength}
 return result;
}
export function descriptors(payload){
 const objects={whatsapp_business_account:'whatsapp',instagram:'instagram',page:'messenger'};
 const platform=objects[payload?.object];
 if(!platform||!Array.isArray(payload.entry))return [];
 const out=[];
 for(const entry of payload.entry.slice(0,100)){
  if(!entry||typeof entry!=='object')continue;
  if(platform==='whatsapp'){
   for(const change of Array.isArray(entry.changes)?entry.changes.slice(0,100):[]){
    const account=change?.value?.metadata?.phone_number_id;
    if(!/^[0-9]{5,40}$/.test(String(account||'')))continue;
    const msgs=Array.isArray(change?.value?.messages)?change.value.messages:[];
    for(const m of msgs.slice(0,100)){
     if(typeof m?.id!=='string'||m.id.length>400)continue;
     out.push({platform,account,eventId:m.id,kind:'inbound_message'});
    }
   }
  }else{
   const account=String(entry.id||'');
   if(!/^[0-9]{5,40}$/.test(account))continue;
   for(const event of Array.isArray(entry.messaging)?entry.messaging.slice(0,100):[]){
    const externalId=event.message?.mid||event.postback?.mid;
    if(typeof externalId!=='string'||externalId.length>400)continue;
    out.push({platform,account,eventId:externalId,kind:event.message?'inbound_message':'postback'});
   }
  }
 }
 return out.slice(0,100);
}
export async function handleMetaRequest(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/health'&&request.method==='GET')return reply(200,'meta-inbound-gateway: deployment only; not proof of connection');
 if(url.pathname!=='/webhooks/meta')return reply(404,'not found');
 if(env.ENABLE_META_INBOUND!=='true')return reply(503,'not enabled');
 if(request.method==='GET'){
  if(!env.META_VERIFY_TOKEN)return reply(503,'not configured');
  const mode=url.searchParams.get('hub.mode');
  const token=url.searchParams.get('hub.verify_token')||'';
  if(mode!=='subscribe'||!eq(bytes(token),bytes(env.META_VERIFY_TOKEN)))return reply(403,'forbidden');
  const challenge=url.searchParams.get('hub.challenge');
  return typeof challenge==='string'&&challenge.length<256?reply(200,challenge):reply(400,'bad challenge');
 }
 if(request.method!=='POST')return reply(405,'method not allowed');
 if(!env.META_APP_SECRET||!env.HASH_KEY||!env.ACCOUNTS||!env.INBOUND_EVENTS)return reply(503,'not configured');
 const declared=Number(request.headers.get('content-length')||'0');
 if(declared>LIMIT)return reply(413,'too large');
 const raw=await bufferLimited(request);
 if(!raw)return reply(413,'too large');
 const signature=request.headers.get('x-hub-signature-256')||'';
 const expected='sha256='+await hmacHex(env.META_APP_SECRET,raw);
 if(!eq(bytes(signature),bytes(expected)))return reply(401,'unauthorized');
 let payload;
 try{payload=JSON.parse(new TextDecoder().decode(raw))}catch{return reply(400,'invalid json')}
 const events=descriptors(payload);
 if(events.length===0)return reply(200,'accepted (no matched events)');
 const deliveries=[];
 const seen=new Set();
 for(const event of events){
  // Registered accounts require prior verified ownership. Public webhooks cannot create mappings.
  const row=await env.ACCOUNTS.prepare(
   'SELECT tenant_id FROM meta_accounts WHERE platform=? AND account_id=? AND status=? LIMIT 1'
  ).bind(event.platform,event.account,'VERIFIED').first();
  if(!row)continue;
  const id=await hmacHex(env.HASH_KEY,bytes(event.platform+'|'+event.account+'|'+event.eventId));
  if(seen.has(id))continue;seen.add(id);
  deliveries.push({
   schema:1,tenant_id:row.tenant_id,platform:event.platform,
   account_id:event.account,event_hash:id,kind:event.kind,
   received_at:new Date().toISOString(),contains_customer_content:false
  });
 }
 if(deliveries.length)await env.INBOUND_EVENTS.sendBatch(deliveries.map(body=>({body})));
 return reply(200,'accepted');
}
export default {fetch:handleMetaRequest};

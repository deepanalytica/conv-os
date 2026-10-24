import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {initChannelEvents,importMetaReceipt} from '../src/channel-events.js';

// Explicit, one-shot, OUTBOUND ONLY pull. No exposed local HTTP port.
// Only customer-free metadata is accepted. Credentials in environment, never in repo.
export function parseQueueRecord(item){
 if(!item||typeof item!=='object'||typeof item.lease_id!=='string'||item.lease_id.length<10)
  throw Error('Invalid queue lease');
 const kind=item.metadata?.['CF-Content-Type'];
 if(kind!=='json')throw Error('Non-JSON queue content rejected');
 if(typeof item.body!=='string'||item.body.length>18000
  ||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.body))
  throw Error('Invalid encoded queue body');
 const payload=Buffer.from(item.body,'base64').toString('utf8');
 if(payload.length>12000)throw Error('Oversized queue metadata');
 return JSON.parse(payload);
}
export function processQueueBatch(db,messages){
 if(!Array.isArray(messages)||messages.length>20)throw Error('Queue batch invalid');
 const acks=[],retries=[];let imported=0;
 for(const message of messages){
  try{
   const record=parseQueueRecord(message);
   const r=importMetaReceipt(db,record);
   if(r.imported)imported++;
   acks.push({lease_id:message.lease_id});
  }catch{
   // Unknown tenant, malformed message or potential PII is NEVER imported or acked.
   if(typeof message?.lease_id==='string'&&message.lease_id.length<2048)
    retries.push({lease_id:message.lease_id,delay_seconds:60});
  }
 }
 return {acks,retries,imported};
}
export async function pullOnce(db,{fetchImpl=fetch,accountId,queueId,apiToken}){
 if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!apiToken||typeof queueId!=='string'||queueId.length<3)
  throw Error('Cloudflare Queue configuration missing');
 if(!/^[a-z0-9_-]{3,80}$/i.test(queueId)&&!/^[a-f0-9-]{36}$/i.test(queueId))
  throw Error('Queue ID invalid');
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/queues/'+queueId+'/messages';
 const headers={'content-type':'application/json',authorization:'Bearer '+apiToken};
 const signal=AbortSignal.timeout(15000);
 const response=await fetchImpl(endpoint+'/pull',{method:'POST',headers,body:JSON.stringify({visibility_timeout_ms:60000,batch_size:10}),signal});
 if(!response.ok)throw Error('Cloudflare queue pull failed');
 const payload=await response.json();
 if(payload.success!==true||!Array.isArray(payload.result?.messages))throw Error('Cloudflare queue result invalid');
 const result=processQueueBatch(db,payload.result.messages);
 if(result.acks.length||result.retries.length){
  const confirmation=await fetchImpl(endpoint+'/ack',{method:'POST',headers,signal,body:JSON.stringify({acks:result.acks,retries:result.retries})});
  if(!confirmation.ok)throw Error('Queue ACK failed (safe to retry due to deduplication)');
  const ackResult=await confirmation.json();
  if(ackResult.success!==true)throw Error('Queue ACK was not confirmed');
 }
 return {imported:result.imported,received:payload.result.messages.length,retried:result.retries.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.env.ENABLE_META_METADATA_PULL!=='true'){
  console.error('Cloudflare pull disabled. See edge/meta-gateway/README.md.');
  process.exitCode=1;
 }else{
  const dbPath=resolve(process.env.DB_PATH||'data/ops.sqlite');
  if(!existsSync(dbPath)){console.error('Start Conv OS to initialize the local database first.');process.exitCode=1}
  else{
   const db=new DatabaseSync(dbPath);
   try{
    db.exec('PRAGMA foreign_keys=ON');
    initChannelEvents(db);
    const result=await pullOnce(db,{
     accountId:process.env.CF_ACCOUNT_ID,
     queueId:process.env.CF_QUEUE_ID,
     apiToken:process.env.CF_QUEUES_TOKEN
    });
    console.log('Metadata pull completed. Received:',result.received,'Imported:',result.imported,'Retried:',result.retried);
   }catch{
    console.error('Cloudflare pull could not complete. Inspect protected local configuration. No secrets were logged.');
    process.exitCode=1;
   }finally{db.close()}
  }
 }
}

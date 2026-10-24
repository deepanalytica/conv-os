import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initChannelEvents,importMetaReceipt,metaEventCounts,validateMetaReceipt} from '../src/channel-events.js';
import {parseQueueRecord,processQueueBatch,pullOnce} from '../scripts/pull-meta-metadata.mjs';

const db=new DatabaseSync(':memory:');
db.exec("PRAGMA foreign_keys=ON;CREATE TABLE tenants (id TEXT PRIMARY KEY,name TEXT,segment TEXT);INSERT INTO tenants VALUES('demo-wal','WAL','retail'),('demo-vaa','Visual Art AI','services');");
initChannelEvents(db);
const envelope=Object.freeze({
 schema:1,tenant_id:'demo-wal',platform:'whatsapp',account_id:'123456789',
 event_hash:'a'.repeat(64),kind:'inbound_message',
 received_at:new Date().toISOString(),contains_customer_content:false
});
const record=data=>({lease_id:'fake-lease-id-123456',metadata:{'CF-Content-Type':'json'},body:Buffer.from(JSON.stringify(data)).toString('base64')});
test('only schema-versioned privacy-minimized metadata is acceptable',()=>{
 assert.equal(validateMetaReceipt(envelope).platform,'whatsapp');
 assert.throws(()=>validateMetaReceipt({...envelope,text:'private text'}),/Unexpected metadata/);
 assert.throws(()=>validateMetaReceipt({...envelope,contains_customer_content:true}),/content not permitted/);
 assert.throws(()=>validateMetaReceipt({...envelope,platform:'telegram'}),/platform/);
 assert.throws(()=>validateMetaReceipt({...envelope,event_hash:'raw sender phone'}),/event hash/);
});
test('queue body decodes JSON only, rejects malformed content',()=>{
 const b=record(envelope);
 assert.deepEqual(parseQueueRecord(b),envelope);
 assert.throws(()=>parseQueueRecord({...b,metadata:{'CF-Content-Type':'v8'}}),/Non-JSON/);
 assert.throws(()=>parseQueueRecord({...b,body:'INVALID?'}),/Invalid encoded/);
});
test('local SQLite import is tenant-bound, idempotent and rejects unexpected PII',()=>{
 const first=processQueueBatch(db,[record(envelope)]);
 assert.deepEqual({imported:first.imported,acked:first.acks.length,retried:first.retries.length},{imported:1,acked:1,retried:0});
 const replay=processQueueBatch(db,[record(envelope)]);
 assert.equal(replay.imported,0);assert.equal(replay.acks.length,1);
 const wrong=processQueueBatch(db,[record({...envelope,tenant_id:'other',event_hash:'b'.repeat(64)})]);
 assert.equal(wrong.acks.length,0);assert.equal(wrong.retries.length,1);
 const leaked=processQueueBatch(db,[record({...envelope,from:'56999999999',event_hash:'c'.repeat(64)})]);
 assert.equal(leaked.acks.length,0);
 assert.equal(metaEventCounts(db,'demo-wal')[0].events,1);
 assert.deepEqual(metaEventCounts(db,'demo-vaa'),[]);
});
test('Cloudflare Queue consumer ACKs only committed metadata, never opens local web server',async()=>{
 const sample={...envelope,event_hash:'d'.repeat(64)};
 const received=[];
 const fetchImpl=async(url,options)=>{
  received.push({url,options});
  if(url.endsWith('/pull'))return Response.json({success:true,result:{messages:[record(sample)]}});
  if(url.endsWith('/ack'))return Response.json({success:true});
  throw Error('Unexpected endpoint');
 };
 const result=await pullOnce(db,{fetchImpl,accountId:'b'.repeat(32),queueId:'queue-test',apiToken:'fake-token'});
 assert.deepEqual(result,{imported:1,received:1,retried:0});
 assert.equal(received.length,2);
 assert.match(received[0].url,/https:\/\/api.cloudflare.com\/client\/v4\/accounts/);
 const ack=JSON.parse(received[1].options.body);
 assert.equal(ack.acks.length,1);assert.equal(ack.retries.length,0);
 assert.doesNotMatch(JSON.stringify(received),/56999999999|private text/);
});

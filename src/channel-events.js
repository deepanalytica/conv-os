// Local audit of *metadata-only* Meta events received from an authenticated
// Cloudflare Queue pull. No message body, sender contact, attachment or full payload.
export const ALLOWED_META_PLATFORMS=new Set(['whatsapp','instagram','messenger']);
const fail=message=>Object.assign(Error(message),{status:400});
export function initChannelEvents(db){
 db.exec(`CREATE TABLE IF NOT EXISTS channel_event_receipts (
  event_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  platform TEXT NOT NULL CHECK(platform IN ('whatsapp','instagram','messenger')),
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('inbound_message','postback')),
  received_at TEXT NOT NULL,
  imported_at TEXT NOT NULL
 );
 CREATE INDEX IF NOT EXISTS channel_event_receipts_tenant
 ON channel_event_receipts(tenant_id,received_at);`);
}
export function validateMetaReceipt(item){
 if(!item||typeof item!=='object'||Array.isArray(item))throw fail('Invalid meta receipt');
 const expected=['schema','tenant_id','platform','account_id','event_hash','kind','received_at','contains_customer_content'];
 if(Object.keys(item).some(k=>!expected.includes(k)))throw fail('Unexpected metadata fields');
 if(item.schema!==1||item.contains_customer_content!==false)throw fail('Customer content not permitted');
 if(!ALLOWED_META_PLATFORMS.has(item.platform))throw fail('Invalid platform');
 if(typeof item.tenant_id!=='string'||!/^[-_a-z0-9]{2,80}$/.test(item.tenant_id))throw fail('Invalid tenant');
 if(typeof item.account_id!=='string'||!/^[0-9]{5,40}$/.test(item.account_id))throw fail('Invalid account');
 if(typeof item.event_hash!=='string'||!/^[a-f0-9]{64}$/.test(item.event_hash))throw fail('Invalid event hash');
 if(!['inbound_message','postback'].includes(item.kind))throw fail('Invalid event kind');
 if(typeof item.received_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(item.received_at)||!Number.isFinite(Date.parse(item.received_at)))throw fail('Invalid timestamp');
 const date=Date.parse(item.received_at);
 if(date>Date.now()+5*60*1000||date<Date.parse('2020-01-01T00:00:00Z'))throw fail('Timestamp outside allowed window');
 return item;
}
export function importMetaReceipt(db,receipt){
 const item=validateMetaReceipt(receipt);
 if(!db.prepare('SELECT id FROM tenants WHERE id=?').get(item.tenant_id))throw fail('Unrecognized tenant');
 const r=db.prepare(`INSERT OR IGNORE INTO channel_event_receipts
  (event_hash,tenant_id,platform,account_id,kind,received_at,imported_at)
  VALUES (?,?,?,?,?,?,?)`).run(item.event_hash,item.tenant_id,item.platform,
    item.account_id,item.kind,item.received_at,new Date().toISOString());
 return {imported:r.changes===1};
}
export function metaEventCounts(db,tenant){
 return db.prepare('SELECT platform,COUNT(*) AS events FROM channel_event_receipts WHERE tenant_id=? GROUP BY platform').all(tenant);
}

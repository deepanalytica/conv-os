import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { assertTransition, totalInCents, deliveryFee } from './domain.js';
import {initCrm,seedCrmDemo,handleCrm} from './crm.js';
import {initFollowups,handleFollowups} from './followups.js';
import {initCommercial,handleCommercial} from './commercial.js';
import {getLocalPasswordHash,isLoopback,isLocalHost,allowedOrigin,currentSession,startSession,makeSessionCookie,clearSessionCookie,endSession,validCsrf} from './security.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const staticDir=join(root,'public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const demo=process.env.DEMO_MODE!=='false' && process.env.NODE_ENV!=='production';
// Nunca aceptar tokens de demostración como autorización para datos locales.
const localAuthHash=getLocalPasswordHash();
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y)};
const json=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(payload))};
const dbPath=process.env.DB_PATH||join(root,'data','ops.sqlite');
if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true});
export const db=new DatabaseSync(dbPath);
db.exec(`PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY,name TEXT NOT NULL,segment TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id TEXT NOT NULL,tenant_id TEXT NOT NULL REFERENCES tenants(id),name TEXT NOT NULL,price_cents INTEGER NOT NULL,available INTEGER NOT NULL DEFAULT 1,PRIMARY KEY (id,tenant_id));
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),status TEXT NOT NULL,items TEXT NOT NULL,total_cents INTEGER NOT NULL,customer TEXT NOT NULL,created_at TEXT NOT NULL,verified_at TEXT);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),order_id TEXT,kind TEXT NOT NULL,created_at TEXT NOT NULL,description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),from_phone TEXT NOT NULL,text TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS orders_tenant ON orders(tenant_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS events_unique_payment ON events(tenant_id,order_id,kind) WHERE kind='payment_verified';`);
if(db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n===0){
 const ins=db.prepare('INSERT INTO tenants VALUES (?,?,?)');
 for(const t of [['demo-food','Negocio gastronómico','food'],['demo-service','Servicios técnicos','service'],['demo-distribution','Distribuidora','distribution']])ins.run(...t);
 const item=db.prepare('INSERT INTO products (id,tenant_id,name,price_cents,available) VALUES (?,?,?,?,1)');
 for(const p of [
 ['p1','demo-food','Producto clásico',299000],['p2','demo-food','Promoción familiar',1099000],
 ['p1','demo-service','Visita técnica',1500000],['p2','demo-service','Mantención',3990000],
 ['p1','demo-distribution','Caja de insumos',1299000],['p2','demo-distribution','Paquete mayorista',4999000]
 ])item.run(...p);
}
// Los negocios reales del usuario se incorporan como espacios de DEMOSTRACIÓN.
// No quedan habilitados para operar con clientes hasta instalar identidad y RBAC.
for(const [id,name,segment] of [
 ['demo-wal','WAL · Regalos personalizados','retail'],
 ['demo-vaa','Visual Art AI','services']
])db.prepare('INSERT OR IGNORE INTO tenants VALUES (?,?,?)').run(id,name,segment);
for(const [tenant,id,name,price] of [
 ['demo-wal','mug','Tazón personalizado',1999000],
 ['demo-wal','gift-pack','Pack de regalo',6999000],
 ['demo-vaa','audit','Diagnóstico de presencia digital',15000000],
 ['demo-vaa','automation','Automatización comercial',35000000]
])db.prepare('INSERT OR IGNORE INTO products(id,tenant_id,name,price_cents,available) VALUES (?,?,?,?,1)').run(id,tenant,name,price);
initCrm(db);
initFollowups(db);
initCommercial(db);
if(demo)seedCrmDemo(db);

function tenantRequired(req){
 const id=String(req.headers['x-tenant-id']||'');
 if(!db.prepare('SELECT id FROM tenants WHERE id=?').get(id))throw Object.assign(Error('Empresa inválida'),{status:400});
 return id;
}
function log(tenant,orderId,kind,description){
 db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)').run(randomUUID(),tenant,orderId,kind,new Date().toISOString(),description);
}
async function limited(req,max=131072){
 const arr=[];let bytes=0;
 for await (const c of req){bytes+=c.length;if(bytes>max)throw Object.assign(Error('Contenido demasiado grande'),{status:413});arr.push(c)}
 return Buffer.concat(arr);
}
function checkedJson(raw){try{return JSON.parse(raw.toString()||'{}')}catch{throw Object.assign(Error('JSON inválido'),{status:400})}}
const getOrders=db.prepare('SELECT * FROM orders WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100');
const readOrder=db.prepare('SELECT * FROM orders WHERE tenant_id=? AND id=?');
const decodeOrder=o=>o?{...o,items:JSON.parse(o.items)}:null;

export function createServer(){
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'");
  // La aplicación es local-only. Un proxy público o un Host arbitrario se rechaza.
  if(!isLoopback(req.socket.remoteAddress)||!isLocalHost(req.headers.host)){
   return json(res,403,{error:'Solo se permite acceso desde esta computadora'});
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!allowedOrigin(req)){
   return json(res,403,{error:'Origen no autorizado'});
  }
  // Un request-target o Host malformado nunca debe terminar el proceso.
  if(!String(req.url||'').startsWith('/'))return json(res,400,{error:'Ruta inválida'});
  let url;
  try{url=new URL(req.url||'/',`http://${req.headers.host}`)}
  catch{return json(res,400,{error:'Dirección inválida'})}
  const path=url.pathname;
  try {
   if(path==='/api/auth/login'&&req.method==='POST'){
    if(req.headers['x-convos-login']!=='1'||!String(req.headers['content-type']||'').startsWith('application/json'))
     return json(res,403,{error:'Solicitud de inicio de sesión no permitida'});
    const body=checkedJson(await limited(req,2048));
    const result=startSession(body.password,localAuthHash);
    if(result.status!==200)return json(res,result.status,{error:result.error});
    res.setHeader('Set-Cookie',makeSessionCookie(result.token));
    return json(res,200,{ok:true});
   }
   if(path==='/api/auth/session'&&req.method==='GET'){
    const session=currentSession(req);
    if(!session)return json(res,401,{authenticated:false,configured:!!localAuthHash});
    return json(res,200,{authenticated:true,role:'local_owner',csrf:session.csrf});
   }
   if(path==='/api/auth/logout'&&req.method==='POST'){
    const session=currentSession(req);
    if(!session||!validCsrf(req,session))return json(res,403,{error:'Sesión o CSRF inválidos'});
    endSession(req);res.setHeader('Set-Cookie',clearSessionCookie());
    return json(res,200,{ok:true});
   }
   if(path==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,mode:demo?'demo':'restricted',storage:'sqlite',service:'conv-os'});
   if(path==='/api/meta/webhook'&&req.method==='GET'){
    if(process.env.ENABLE_META_WEBHOOKS!=='true')return json(res,503,{error:'Integración Meta deshabilitada'});
    const valid=process.env.META_VERIFY_TOKEN&&equal(url.searchParams.get('hub.verify_token'),process.env.META_VERIFY_TOKEN)&&url.searchParams.get('hub.mode')==='subscribe';
    if(!valid)return json(res,403,{error:'Verificación fallida'});
    res.writeHead(200,{'content-type':'text/plain'});return res.end(url.searchParams.get('hub.challenge')||'');
   }
   if(path==='/api/meta/webhook'&&req.method==='POST'){
    if(process.env.ENABLE_META_WEBHOOKS!=='true')return json(res,503,{error:'Integración Meta deshabilitada'});
    if(!process.env.META_APP_SECRET||!process.env.META_TENANT_ID||!process.env.META_PHONE_NUMBER_ID)
     return json(res,503,{error:'Meta no configurado con identificador de número'});
    const raw=await limited(req,1024*1024);
    const expected='sha256='+createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex');
    if(!equal(expected,req.headers['x-hub-signature-256']))return json(res,401,{error:'Firma inválida'});
    const payload=checkedJson(raw);
    for(const entry of payload.entry||[])for(const ch of entry.changes||[])for(const msg of ch.value?.messages||[]){
     if(msg.type!=='text'||typeof msg.text?.body!=='string')continue;
     if(process.env.META_PHONE_NUMBER_ID&&ch.value?.metadata?.phone_number_id!==process.env.META_PHONE_NUMBER_ID)continue;
     if(!db.prepare('SELECT id FROM tenants WHERE id=?').get(process.env.META_TENANT_ID))continue;
     db.prepare('INSERT OR IGNORE INTO messages VALUES (?,?,?,?,?)').run(msg.id,process.env.META_TENANT_ID,msg.from,msg.text.body,new Date().toISOString());
    }
    return json(res,200,{received:true});
   }
   if(path.startsWith('/api/')){
    const session=currentSession(req);
    if(!session)return json(res,401,{error:'Autenticación requerida'});
    if(!['GET','HEAD'].includes(req.method)&&!validCsrf(req,session))
     return json(res,403,{error:'Protección CSRF: actualización rechazada'});
    if(path==='/api/tenants'&&req.method==='GET')return json(res,200,{tenants:db.prepare('SELECT * FROM tenants').all()});
    const tenant=tenantRequired(req);
    if(await handleCrm({db,req,res,path,tenant,json,limited,checkedJson}))return;
    if(await handleFollowups({db,req,res,path,tenant,json,limited,checkedJson}))return;
    if(await handleCommercial({db,req,res,path,tenant,json,limited,checkedJson}))return;
    if(path==='/api/overview'&&req.method==='GET'){
     const count=db.prepare("SELECT status,COUNT(*) n FROM orders WHERE tenant_id=? GROUP BY status").all(tenant);
     const sales=db.prepare("SELECT COALESCE(SUM(total_cents),0) v FROM orders WHERE tenant_id=? AND verified_at IS NOT NULL").get(tenant);
     return json(res,200,{orders:count,salesCents:sales.v,recent:db.prepare('SELECT * FROM events WHERE tenant_id=? ORDER BY created_at DESC LIMIT 15').all(tenant)});
    }
    if(path==='/api/products'&&req.method==='GET')return json(res,200,{products:db.prepare('SELECT * FROM products WHERE tenant_id=?').all(tenant)});
    if(path==='/api/orders'&&req.method==='GET')return json(res,200,{orders:getOrders.all(tenant).map(decodeOrder)});
    if(path==='/api/messages'&&req.method==='GET')return json(res,200,{messages:db.prepare('SELECT * FROM messages WHERE tenant_id=? ORDER BY created_at DESC LIMIT 50').all(tenant)});
    if(path==='/api/orders'&&req.method==='POST'){
     const body=checkedJson(await limited(req));
     const catalog=db.prepare('SELECT id,name,price_cents AS priceCents,available FROM products WHERE tenant_id=?').all(tenant);
     const amount=totalInCents(body.items,catalog);
     const id=randomUUID(), customer=String(body.customer||'Cliente');
     db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,NULL)').run(id,tenant,'awaiting_payment',JSON.stringify(body.items),amount,customer.slice(0,120),new Date().toISOString());
     log(tenant,id,'created','Pedido recibido: pago pendiente');
     return json(res,201,{order:decodeOrder(readOrder.get(tenant,id))});
    }
    const match=path.match(/^\/api\/orders\/([a-f0-9-]+)\/(status|sandbox-payment)$/);
    if(match&&req.method==='POST'){
     const order=readOrder.get(tenant,match[1]);if(!order)return json(res,404,{error:'Pedido no encontrado'});
     if(match[2]==='sandbox-payment'){
      if(!demo)return json(res,403,{error:'Confirmación simulada prohibida'});
      assertTransition(order.status,'paid',{paymentVerified:true});
      db.prepare('UPDATE orders SET status=?,verified_at=? WHERE tenant_id=? AND id=?').run('paid',new Date().toISOString(),tenant,order.id);
      log(tenant,order.id,'payment_verified','PAGO SIMULADO (sin dinero)');
     }else{
      const body=checkedJson(await limited(req));
      if(body.status==='paid')return json(res,403,{error:'Pago solo mediante confirmación verificable'});
      assertTransition(order.status,body.status);
      db.prepare('UPDATE orders SET status=? WHERE tenant_id=? AND id=?').run(body.status,tenant,order.id);
      log(tenant,order.id,'status',`Cambio de estado a ${body.status}`);
     }
     return json(res,200,{order:decodeOrder(readOrder.get(tenant,order.id))});
    }
    return json(res,404,{error:'API no encontrada'});
   }
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido'});
   const session=currentSession(req);
   const file=path==='/'?(session?'index.html':'login.html'):path.slice(1);
   if(!session&&!['login.html','login.js','login.css','favicon.svg'].includes(file))
    return json(res,401,{error:'Acceso privado: inicia sesión'});
   const allowed=/^(?:index\.html|login\.html|login\.js|login\.css|app\.js|crm-ui\.js|crm-ui\.css|styles\.css|premium\.css|theme\.css|theme\.js|favicon\.svg|landing\/(?:index\.html|landing\.css|landing\.js)|assets\/[a-z0-9_-]+\.svg)$/;
   if(!allowed.test(file))return json(res,404,{error:'Archivo no encontrado'});
   const bytes=readFileSync(join(staticDir,file));
   res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-cache'});
   return res.end(req.method==='HEAD'?undefined:bytes);
  } catch(e){
   const status=e.status||(/inválid|cobertura|disponible|vacío|transición|Pago requiere|Cantidad|Empresa/.test(e.message)?400:500);
   if(status===500)console.error('HTTP error',e);
   return json(res,status,{error:status===500?'Error interno':e.message});
  }
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||4173);
 if(host!=='127.0.0.1')throw Error('Seguridad: solo se permite HOST=127.0.0.1');
 if(!localAuthHash)throw Error('Acceso sin configurar. Ejecuta npm run setup:local antes de iniciar el servidor.');
 if(process.env.NODE_ENV==='production')throw Error('MVP no autorizado para producción con pagos reales');
 createServer().listen(port,host,()=>console.log(`Conversation Ops local http://${host}:${port}`));
}

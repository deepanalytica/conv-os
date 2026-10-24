import {createHash, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Autenticación exclusiva para la instalación local de UN propietario.
// No sustituye RBAC, permisos multiusuario ni un servidor de producción.
const COOKIE='convos_local_session';
const SESSION_IDLE_MS=30*60*1000;
const SESSION_ABSOLUTE_MS=8*60*60*1000;
const MAX_FAILURES=5;
const BLOCK_MS=60*1000;
const sessions=new Map();
let failed=0,blockedUntil=0;
const digest=t=>createHash('sha256').update(t).digest('hex');
const safeEqual=(a,b)=>{
 const x=Buffer.from(String(a)),y=Buffer.from(String(b));
 return x.length===y.length&&timingSafeEqual(x,y);
};
export function passwordHash(password,salt=randomBytes(32).toString('hex')){
 if(typeof password!=='string'||password.length<14||password.length>256)throw Error('La clave debe tener entre 14 y 256 caracteres');
 if(!/^[a-f0-9]{64}$/.test(salt))throw Error('Sal inválida');
 const key=scryptSync(password,Buffer.from(salt,'hex'),64,{N:1<<15,r:8,p:1,maxmem:64*1024*1024});
 return 'scrypt-v1$'+salt+'$'+key.toString('hex');
}
export function passwordValid(password,record){
 const match=/^scrypt-v1\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(record||'');
 if(!match||typeof password!=='string'||password.length>256)return false;
 const derived=scryptSync(password,Buffer.from(match[1],'hex'),64,{N:1<<15,r:8,p:1,maxmem:64*1024*1024});
 return timingSafeEqual(derived,Buffer.from(match[2],'hex'));
}
export function getLocalPasswordHash(){
 const override=process.env.CONVOS_AUTH_HASH;
 if(override)return override;
 const file=process.env.CONVOS_AUTH_FILE||resolve('.local','admin-auth.json');
 try{
  const record=JSON.parse(readFileSync(file,'utf8'));
  return typeof record.passwordHash==='string'?record.passwordHash:null;
 }catch{return null}
}
export function isLoopback(ip){
 return ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';
}
export function isLocalHost(host){
 return /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host||'');
}
export function allowedOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return true;
 try{const parsed=new URL(origin);return parsed.protocol==='http:' && isLocalHost(parsed.host)}catch{return false}
}
function parseCookie(header){
 const match=String(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));
 return match?match.slice(COOKIE.length+1):'';
}
function purgeSessions(now=Date.now()){
 for(const [id,s] of sessions){if(now>s.expires||now>s.last+SESSION_IDLE_MS)sessions.delete(id)}
}
export function currentSession(req){
 const now=Date.now();purgeSessions(now);
 const sid=parseCookie(req.headers.cookie);
 if(!/^[a-f0-9]{64}$/.test(sid))return null;
 const record=sessions.get(digest(sid));
 if(!record)return null;
 record.last=now;
 return record;
}
export function makeSessionCookie(token){
 return COOKIE+'='+token+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800';
}
export function clearSessionCookie(){
 return COOKIE+'=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0';
}
export function startSession(password,hash){
 const now=Date.now();
 if(!hash)return {error:'not-configured',status:503};
 if(now<blockedUntil)return {error:'too-many-attempts',status:429};
 let good=false;
 try{good=passwordValid(password,hash)}catch{}
 if(!good){
  failed++;
  if(failed>=MAX_FAILURES){blockedUntil=now+BLOCK_MS;failed=0}
  return {error:'incorrect',status:401};
 }
 failed=0;blockedUntil=0;purgeSessions(now);
 const token=randomBytes(32).toString('hex');
 const csrf=randomBytes(32).toString('hex');
 sessions.set(digest(token),{csrf,created:now,last:now,expires:now+SESSION_ABSOLUTE_MS});
 return {token,csrf,status:200};
}
export function validCsrf(req,session){
 const token=req.headers['x-csrf-token'];
 return typeof token==='string'&&safeEqual(token,session.csrf);
}
export function endSession(req){const sid=parseCookie(req.headers.cookie);if(/^[a-f0-9]{64}$/.test(sid))sessions.delete(digest(sid))}

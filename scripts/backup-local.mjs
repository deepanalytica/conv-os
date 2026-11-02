import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {encryptBackup} from '../src/backup-crypto.js';
import {readSecret} from './secret-input.mjs';

const dbPath=resolve(process.env.DB_PATH||'data/ops.sqlite');
if(!existsSync(dbPath)){console.error('No se encontró la base de datos local.');process.exit(1)}
const pass=await readSecret('Frase de cifrado del respaldo (mínimo 16 caracteres): ');
if(pass.length<16||pass.length>256){console.error('Frase demasiado corta o inválida.');process.exit(1)}
const folder=resolve('backups'),tmpFolder=resolve('.local');
mkdirSync(folder,{recursive:true,mode:0o700});mkdirSync(tmpFolder,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const tmp=join(tmpFolder,'snapshot-'+randomBytes(8).toString('hex')+'.sqlite');
const target=join(folder,'conv-os-'+stamp+'.convbak');
try{
 const db=new DatabaseSync(dbPath);
 try{db.exec("VACUUM INTO '"+tmp.replaceAll("'","''")+"'")}finally{db.close()}
 const plain=readFileSync(tmp);
 const payload=encryptBackup(plain,pass);
 writeFileSync(target,payload,{mode:0o600,flag:'wx'});
 console.log('Respaldo cifrado creado: '+target);
 console.log('Conserva el archivo en un almacenamiento externo protegido y la frase en un gestor de contraseñas.');
}catch(e){console.error('No se creó el respaldo:',e.message);process.exitCode=1}
finally{try{rmSync(tmp,{force:true})}catch{}}

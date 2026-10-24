import {mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {decryptBackup} from '../src/backup-crypto.js';
import {readSecret} from './secret-input.mjs';

// Nunca sustituir la BD principal automáticamente: evitar pérdida de trabajo.
const source=process.argv[2];
if(!source){console.error('Uso: npm run restore:local -- <archivo.convbak>');process.exit(1)}
const folder=resolve('data');mkdirSync(folder,{recursive:true,mode:0o700});
const target=join(folder,'restored-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(4).toString('hex')+'.sqlite');
try{
 const payload=readFileSync(resolve(source));
 const pass=await readSecret('Frase de cifrado del respaldo: ');
 const plain=decryptBackup(payload,pass);
 if(!plain.subarray(0,16).equals(Buffer.from('SQLite format 3\0')))throw Error('El archivo no contiene una base SQLite válida');
 writeFileSync(target,plain,{mode:0o600,flag:'wx'});
 const testDb=new DatabaseSync(target);
 try{
  const integrity=testDb.prepare('PRAGMA integrity_check').get();
  if(!integrity||Object.values(integrity)[0]!=='ok')throw Error('La base restaurada no superó el control de integridad');
 }finally{testDb.close()}
 console.log('Restauración de prueba: '+target);
 console.log('La base original NO fue modificada. Verifica la copia y consulta docs/LOCAL-WINDOWS.md.');
}catch(e){
 try{rmSync(target,{force:true})}catch{}
 console.error('No se restauró el respaldo. Revisa el archivo y contraseña.');
 process.exitCode=1;
}

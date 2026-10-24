import {mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes,scryptSync,createDecipheriv} from 'node:crypto';
import {readSecret} from './secret-input.mjs';

// Nunca sustituir la BD principal automáticamente: evitar pérdida de trabajo.
const source=process.argv[2];
if(!source){console.error('Uso: npm run restore:local -- <archivo.convbak>');process.exit(1)}
const folder=resolve('data');mkdirSync(folder,{recursive:true,mode:0o700});
const target=join(folder,'restored-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(4).toString('hex')+'.sqlite');
try{
 const payload=readFileSync(resolve(source));
 const header=Buffer.from('CONVOS1');
 if(payload.length<7+32+12+16+1||!payload.subarray(0,7).equals(header))throw Error('Formato de respaldo desconocido');
 const salt=payload.subarray(7,39),iv=payload.subarray(39,51),tag=payload.subarray(51,67),ciphertext=payload.subarray(67);
 const pass=await readSecret('Frase de cifrado del respaldo: ');
 const key=scryptSync(pass,salt,32,{N:1<<15,r:8,p:1,maxmem:64*1024*1024});
 const decipher=createDecipheriv('aes-256-gcm',key,iv);
 decipher.setAAD(header);decipher.setAuthTag(tag);
 const plain=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
 if(!plain.subarray(0,16).equals(Buffer.from('SQLite format 3\0')))throw Error('El archivo no contiene una base SQLite válida');
 writeFileSync(target,plain,{mode:0o600,flag:'wx'});
 console.log('Restauración de prueba: '+target);
 console.log('La base original NO fue modificada. Verifica la copia y consulta docs/LOCAL-WINDOWS.md.');
}catch(e){
 try{rmSync(target,{force:true})}catch{}
 console.error('No se restauró el respaldo. Revisa el archivo y contraseña.');
 process.exitCode=1;
}

import {randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';

const HEADER=Buffer.from('CONVOS1');
function derive(password,salt){
 if(typeof password!=='string'||password.length<16||password.length>256)
  throw Error('Frase de respaldo inválida');
 return scryptSync(password,salt,32,{N:1<<15,r:8,p:1,maxmem:64*1024*1024});
}
export function encryptBackup(data,password){
 if(!Buffer.isBuffer(data)||!data.length)throw Error('Base de datos vacía');
 const salt=randomBytes(32),iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',derive(password,salt),iv);
 cipher.setAAD(HEADER);
 return assemble(cipher,data,salt,iv);
}
function assemble(cipher,data,salt,iv){
 const ciphertext=Buffer.concat([cipher.update(data),cipher.final()]);
 return Buffer.concat([HEADER,salt,iv,cipher.getAuthTag(),ciphertext]);
}
export function decryptBackup(payload,password){
 if(!Buffer.isBuffer(payload)||payload.length<68||!payload.subarray(0,7).equals(HEADER))
  throw Error('Formato de respaldo inválido');
 const salt=payload.subarray(7,39),iv=payload.subarray(39,51),tag=payload.subarray(51,67);
 const decipher=createDecipheriv('aes-256-gcm',derive(password,salt),iv);
 decipher.setAAD(HEADER);decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(payload.subarray(67)),decipher.final()]);
}

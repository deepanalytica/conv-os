import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {stdin,stdout} from 'node:process';
import {passwordHash} from '../src/security.js';

const folder=resolve('.local');
const file=resolve(folder,'admin-auth.json');
if(!stdin.isTTY||!stdout.isTTY){
 console.error('Configuración interactiva: ejecuta este comando desde PowerShell/Terminal.');
 process.exit(1);
}
if(existsSync(file)){
 console.error('Ya existe una clave configurada. No se reemplaza automáticamente: revisa docs/LOCAL-WINDOWS.md.');
 process.exit(1);
}
function askSecret(label){
 return new Promise((resolve,reject)=>{
  let password='';
  stdout.write(label);
  stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
  const onData=key=>{
   if(key==='\r'||key==='\n'){cleanup();stdout.write('\n');resolve(password);return}
   if(key==='\u0003'){cleanup();stdout.write('\n');reject(Error('Cancelado'))}
   if(key==='\u007f'||key==='\b'){password=password.slice(0,-1);return}
   if(key.startsWith('\u001b'))return;
   if(password.length<256)password+=key;
  };
  function cleanup(){stdin.off('data',onData);stdin.setRawMode(false);stdin.pause()}
  stdin.on('data',onData);
 });
}
try{
 const first=await askSecret('Nueva contraseña (mínimo 14 caracteres, no se mostrará): ');
 const second=await askSecret('Repetir contraseña: ');
 if(first!==second)throw Error('Las contraseñas no coinciden');
 const hash=passwordHash(first);
 mkdirSync(folder,{recursive:true,mode:0o700});
 writeFileSync(file,JSON.stringify({version:1,passwordHash:hash},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('Cuenta local configurada. Ejecuta npm start y abre http://127.0.0.1:4173');
 console.log('Guarda tu contraseña en un gestor seguro: no existe recuperación automática.');
}catch(err){console.error('No se configuró la cuenta:',err.message);process.exitCode=1}

import {stdin,stdout} from 'node:process';
export function readSecret(label){
 if(!stdin.isTTY||!stdout.isTTY)throw Error('Se necesita PowerShell/Terminal interactiva');
 return new Promise((resolve,reject)=>{
  let value='';
  stdout.write(label);
  stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
  const cleanup=()=>{stdin.off('data',onData);stdin.setRawMode(false);stdin.pause()};
  function onData(key){
   if(key==='\r'||key==='\n'||key==='\r\n'){cleanup();stdout.write('\n');resolve(value);return}
   if(key==='\u0003'){cleanup();stdout.write('\n');reject(Error('Cancelado'));return}
   if(key==='\u007f'||key==='\b'){value=value.slice(0,-1);return}
   if(key.startsWith('\u001b'))return;
   if(value.length<256)value+=key;
  }
  stdin.on('data',onData);
 });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,passwordValid,isLoopback,isLocalHost,allowedOrigin,startSession,validCsrf} from '../src/security.js';
import {encryptBackup,decryptBackup} from '../src/backup-crypto.js';

test('contraseña fuerte y hash resistente a texto plano',()=>{
 const hash=passwordHash('una frase secreta exclusiva de prueba');
 assert.match(hash,/^scrypt-v1\$/);
 assert.ok(!hash.includes('una frase secreta'));
 assert.equal(passwordValid('una frase secreta exclusiva de prueba',hash),true);
 assert.equal(passwordValid('incorrecta',hash),false);
 assert.throws(()=>passwordHash('corta'),/14/);
});
test('origen, host y loopback validan la instalación local',()=>{
 assert.equal(isLocalHost('127.0.0.1:4173'),true);
 assert.equal(isLocalHost('localhost:4173'),true);
 assert.equal(isLocalHost('malicious.localhost'),false);
 assert.equal(isLoopback('::ffff:127.0.0.1'),true);
 assert.equal(isLoopback('192.168.1.20'),false);
 assert.equal(allowedOrigin({headers:{origin:'http://127.0.0.1:4173',host:'127.0.0.1:4173'}}),true);
 assert.equal(allowedOrigin({headers:{origin:'http://localhost:7777',host:'localhost:4173'}}),false);
 assert.equal(allowedOrigin({headers:{origin:'https://example.org',host:'127.0.0.1:4173'}}),false);
});
test('el respaldo usa cifrado autenticado e identifica alteraciones',()=>{
 const original=Buffer.from('SQLite format 3\0ejemplo de base en una prueba');
 const pass='frase cifrado privada para test';
 const backup=encryptBackup(original,pass);
 assert.equal(backup.subarray(0,7).toString(),'CONVOS1');
 assert.equal(backup.includes(original),false);
 assert.deepEqual(decryptBackup(backup,pass),original);
 assert.throws(()=>decryptBackup(backup,'contraseña totalmente equivocada'));
 const tampered=Buffer.from(backup);tampered[tampered.length-1]^=1;
 assert.throws(()=>decryptBackup(tampered,pass));
});
test('el inicio de sesión otorga CSRF separado de la contraseña',()=>{
 const hash=passwordHash('otra contraseña de prueba extensa');
 const wrong=startSession('error',hash);assert.equal(wrong.status,401);
 const created=startSession('otra contraseña de prueba extensa',hash);
 assert.equal(created.status,200);
 assert.match(created.token,/^[a-f0-9]{64}$/);
 assert.match(created.csrf,/^[a-f0-9]{64}$/);
 assert.equal(validCsrf({headers:{'x-csrf-token':created.csrf}},{csrf:created.csrf}),true);
 assert.equal(validCsrf({headers:{'x-csrf-token':'incorrecto'}},{csrf:created.csrf}),false);
});

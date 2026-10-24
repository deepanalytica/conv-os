import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {POLICY_DIGEST,assessStep,requireAllowedReadOrCheck,requirementsFromPRD} from '../src/assurance.js';
import {inspectBaseline} from '../scripts/assurance-check.mjs';

const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const prd=read('docs/foundation/01-PRD.md');
const ids=requirementsFromPRD(prd);
const proposal=(overrides={})=>({
 mission_id:'96b1988f-1271-4b73-9efc-a2ec3f9a0f32',
 step_id:'5869494c-a7a3-4983-ae26-273ea2cb7008',
 idempotency_key:'d6702df6-5dde-4680-bb47-90defb4b95cb',
 revision:1,requirement_ids:['NFR-02'],dependencies:[],
 capability:'local.check',risk:'low',human_approval_required:false,
 budget:{calls:2,cost_usd_max:null},policy_digest:POLICY_DIGEST,...overrides
});
test('traceabilidad PRD descubre FR y NFR',()=>{
 assert.ok(ids.includes('FR-01'));assert.ok(ids.includes('FR-12'));
 assert.ok(ids.includes('NFR-01'));assert.ok(ids.includes('NFR-08'));
});
test('solo lecturas y pruebas locales reciben permiso limitado',()=>{
 const result=assessStep(proposal(),{knownRequirements:ids});
 assert.equal(result.decision,'ALLOW');
 assert.equal(result.may_execute,true);
 assert.ok(result.gates.some(g=>g.id==='G6'&&g.decision==='REVIEW'));
 assert.equal(requireAllowedReadOrCheck(proposal(),{knownRequirements:ids}).decision,'ALLOW');
});
test('escritura de GitHub requiere revisión no falsificable mediante flag humano',()=>{
 for(const capability of ['repo.write.branch','docs.write','github.pr.create']){
  const p=proposal({capability,human_approval_required:false});
  const r=assessStep(p,{knownRequirements:ids});
  assert.equal(r.decision,'REVIEW');
  assert.equal(r.may_execute,false);
  assert.throws(()=>requireAllowedReadOrCheck(p,{knownRequirements:ids}),/blocked/);
 }
});
test('envío, pagos, despliegue, publicidad y número de WhatsApp quedan denegados',()=>{
 const blocked=['meta.message.send','meta.account.connect','payments.capture','advertising.spend',
 'production.deploy','whatsapp.number.migrate','secrets.export'];
 for(const capability of blocked){
  const decision=assessStep(proposal({capability,human_approval_required:true}),{knownRequirements:ids});
  assert.equal(decision.decision,'DENY',capability);
  assert.equal(decision.may_execute,false,capability);
  assert.ok(decision.gates.some(x=>x.id==='G4'&&x.decision==='DENY'));
 }
});
test('denegación estricta ante digest, requisitos, presupuesto o identidad corruptos',()=>{
 const invalid=[
  {policy_digest:'0'.repeat(64)},{requirement_ids:['FR-99']},
  {requirement_ids:['FR-01','FR-01']},{revision:0},{budget:{calls:100000,cost_usd_max:null}},
  {step_id:'arbitrary'},{dependencies:['arbitrary']},{risk:'urgent'},
  {capability:'exec.shell'}, {human_approval_required:'yes'}
 ];
 for(const override of invalid){
  const result=assessStep(proposal(override),{knownRequirements:ids});
  assert.equal(result.decision,'DENY',JSON.stringify(override));
  assert.equal(result.may_execute,false);
 }
});
test('evidencia propia del agente no habilita producción',()=>{
 const forged=proposal({capability:'production.deploy',human_approval_required:true,
  proof:{status:'PASS',verified_by:'LLM',human_approved:true}});
 assert.equal(assessStep(forged,{knownRequirements:ids}).decision,'DENY');
});
function baseline(){
 return {server:read('src/server.js'),security:read('src/security.js'),
 manifest:JSON.parse(read('docs/foundation/status.json')),prd,
 packageJSON:JSON.parse(read('package.json')),agentRules:read('AGENTS.md')};
}
test('control de regresión estática no reclama seguridad de producción',()=>{
 const report=inspectBaseline(baseline());
 assert.equal(report.total,8);
 assert.equal(report.decision,'REVIEW');
 assert.equal(report.passed,8);
 assert.match(report.note,/not a security audit/i);
});
test('regresión local: quitar sesión u abrir puerta de release produce DENY',()=>{
 const safe=baseline();
 const bypass={...safe,server:safe.server.replace('currentSession(req)','bypassSession(req)')};
 const result=inspectBaseline(bypass);
 assert.equal(result.decision,'DENY');
 assert.equal(result.checks.find(x=>x.id==='B2').pass,false);
 const released={...safe,manifest:{...safe.manifest,release_gate:{state:'RELEASED'}}};
 assert.equal(inspectBaseline(released).decision,'DENY');
});

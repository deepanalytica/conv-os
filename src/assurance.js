import {createHash} from 'node:crypto';

// Pure policy evaluator. It NEVER executes a tool or grants runtime credentials.
// An ALLOW is a proposal-level judgement for read-only/local-check capabilities only.
export const POLICY_VERSION='acquisition-os.assurance.v1';
export const POLICY=Object.freeze({
 version:POLICY_VERSION,
 permitted:[ 'repo.read','docs.read','local.check' ],
 review:[ 'repo.write.branch','docs.write','github.pr.create' ],
 blocked:[ 'meta.message.send','meta.account.connect','payments.capture',
  'advertising.spend','production.deploy','whatsapp.number.migrate','secrets.export' ],
 maxCallsPerStep:100
});
export const POLICY_DIGEST=createHash('sha256').update(JSON.stringify(POLICY)).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIREMENT=/^(?:FR|NFR)-\d{2}$/;
const SHA=/^[0-9a-f]{64}$/i;
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const plainObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const gate=(id,decision,reason)=>({id,decision,reason});
/**
 * Proposal assessment is fail-closed. A self-reported "approved" property is NEVER
 * sufficient to authorize effects; a verified external approval provider is absent.
 *
 * Returns:
 *   ALLOW  : only non-external read/local-check actions under intact policy
 *   REVIEW : ordinary writes, evidence/approval still required outside this module
 *   DENY   : invalid schema, unknown capability, or prohibited irreversible effect
 */
export function assessStep(step,{knownRequirements=[]}={}){
 const gates=[];
 const fail=(id,msg)=>gates.push(gate(id,'DENY',msg));
 if(!plainObject(step)){
  fail('G0','StepProposal must be an object');
  return {policy_version:POLICY_VERSION,decision:'DENY',may_execute:false,gates};
 }
 const hasUUIDs=UUID.test(step.mission_id||'')&&UUID.test(step.step_id||'')&&UUID.test(step.idempotency_key||'');
 if(!hasUUIDs||step.mission_id===step.step_id)fail('G0','Invalid unique mission/step/idempotency IDs');
 else gates.push(gate('G0','ALLOW','Traceable proposal identifiers'));
 if(!Number.isSafeInteger(step.revision)||step.revision<1)fail('G1','Invalid revision');
 if(!Array.isArray(step.requirement_ids)||step.requirement_ids.length===0
  ||new Set(step.requirement_ids).size!==step.requirement_ids.length
  ||step.requirement_ids.some(r=>typeof r!=='string'||!REQUIREMENT.test(r)
   ||(knownRequirements.length>0&&!knownRequirements.includes(r))))
  fail('G1','Unknown, missing or duplicated requirement IDs');
 if(!Array.isArray(step.dependencies)||step.dependencies.some(dep=>typeof dep!=='string'||!UUID.test(dep)||dep===step.step_id))
  fail('G1','Invalid dependency IDs');
 if(!plainObject(step.budget)||!Number.isSafeInteger(step.budget.calls)
  ||step.budget.calls<1||step.budget.calls>POLICY.maxCallsPerStep
  ||(step.budget.cost_usd_max!==null&&(!Number.isFinite(step.budget.cost_usd_max)||step.budget.cost_usd_max<0)))
  fail('G1','Invalid or excessive resource budget');
 if(!['low','medium','high'].includes(step.risk))fail('G1','Invalid risk value');
 if(typeof step.human_approval_required!=='boolean')fail('G1','Missing approval declaration');
 if(typeof step.capability!=='string'||![
  ...POLICY.permitted,...POLICY.review,...POLICY.blocked
 ].includes(step.capability))fail('G1','Unrecognized capability');
 if(typeof step.policy_digest!=='string'||!SHA.test(step.policy_digest)||step.policy_digest!==POLICY_DIGEST)
  fail('G4','Missing or stale policy digest');
 if(gates.some(g=>g.decision==='DENY'))return {policy_version:POLICY_VERSION,decision:'DENY',may_execute:false,gates};
 gates.push(gate('G1','ALLOW','Schema and documented requirement references validated'));
 gates.push(gate('G2','REVIEW','Evidence is not independently authenticated by this policy module'));
 gates.push(gate('G3','REVIEW','Code/contract consistency needs CI and reviewer evidence'));
 if(POLICY.blocked.includes(step.capability)){
  gates.push(gate('G4','DENY','External high-risk capability has no connected approval/runtime verifier'));
  gates.push(gate('G6','DENY','Explicit verified human authorization and production controls absent'));
  return {policy_version:POLICY_VERSION,decision:'DENY',may_execute:false,gates};
 }
 if(POLICY.review.includes(step.capability)||step.human_approval_required||step.risk==='high'){
  gates.push(gate('G4','REVIEW','Write or sensitive plan requires independently verified review'));
  gates.push(gate('G5','REVIEW','Regression evidence must be executed and linked externally'));
  gates.push(gate('G6','REVIEW','No delegated write capability or production authorization'));
  return {policy_version:POLICY_VERSION,decision:'REVIEW',may_execute:false,gates};
 }
 gates.push(gate('G4','ALLOW','Read/local-check only; no customer-facing side effects'));
 gates.push(gate('G5','REVIEW','The future execution result must be independently recorded'));
 gates.push(gate('G6','REVIEW','No authority to deploy, send messages or change accounts'));
 return {policy_version:POLICY_VERSION,decision:'ALLOW',may_execute:true,gates};
}
/** A negative/review decision cannot be turned into execution by an LLM claim. */
export function requireAllowedReadOrCheck(step,context){
 const decision=assessStep(step,context);
 if(decision.decision!=='ALLOW'||!decision.may_execute)throw Object.assign(
  new Error('Capability blocked: '+decision.decision),{decision});
 return decision;
}
export function requirementsFromPRD(markdown){
 return [...new Set([...String(markdown).matchAll(/\| ((?:FR|NFR)-\d{2}) \|/g)].map(x=>x[1]))];
}

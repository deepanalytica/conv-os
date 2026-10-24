import {readFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {POLICY_DIGEST,assessStep,requirementsFromPRD} from '../src/assurance.js';

const root=resolve(import.meta.dirname,'..');
const read=relative=>readFileSync(resolve(root,relative),'utf8');
const present=(text,re)=>re.test(text);
export function inspectBaseline({server,security,manifest,prd,packageJSON,agentRules}){
 const checks=[
  {id:'B1',requirement:'NFR-01',label:'Local server checks TCP loopback and Host',pass:present(server,/isLoopback\(req\.socket\.remoteAddress\)/)&&present(server,/isLocalHost\(req\.headers\.host\)/)},
  {id:'B2',requirement:'NFR-02',label:'Authenticated private sessions and CSRF',pass:present(server,/currentSession\(req\)/)&&present(server,/validCsrf\(req,session\)/)&&present(security,/SameSite=Strict/)},
  {id:'B3',requirement:'FR-09',label:'Meta webhook disabled unless explicitly enabled',pass:present(server,/ENABLE_META_WEBHOOKS/)&&present(server,/Integration|Integración Meta deshabilitada/)},
  {id:'B4',requirement:'FR-08',label:'Payments cannot be confirmed from arbitrary order status',pass:present(server,/body\.status==='paid'/)&&present(server,/if\(!demo\)return json\(res,403/)},
  {id:'B5',requirement:'NFR-03',label:'CRM uses tenant scoping',pass:present(server,/tenantRequired\(req\)/)&&present(agentRules,/tenant/)},
  {id:'B6',requirement:'NFR-08',label:'CI tests plus docs policy checker exist',pass:typeof packageJSON.scripts?.check==='string'&&packageJSON.scripts.check.includes('npm test')&&packageJSON.scripts.check.includes('docs:check')},
  {id:'B7',requirement:'NFR-05',label:'Release remains blocked for human approval',pass:manifest.release_gate?.state==='BLOCKED'&&manifest.document_status==='PROPOSED'},
  {id:'B8',requirement:'NFR-07',label:'No delegated external send/spend authority',pass:present(agentRules,/autorización humana|human/i)&&present(agentRules,/mensajes salientes|comunicaciones reales/i)}
 ];
 const requirements=requirementsFromPRD(prd);
 for(const check of checks){
  if(!requirements.includes(check.requirement))check.pass=false;
 }
 return {checks,passed:checks.filter(c=>c.pass).length,total:checks.length,
  decision:checks.every(c=>c.pass)?'REVIEW':'DENY',
  note:'Static drift checks only; not a security audit, runtime integration, Windows E2E or release approval'};
}
function examplePlan(){
 const id1='dcb421f9-9ca5-4b54-a657-6b7ad2cb99dd';
 const id2='038e557e-218e-4777-b6b1-a7f0ee5d1e34';
 const id3='41dcbd09-26d4-40cf-9cb5-2002fc4fe8e3';
 return {mission_id:id1,step_id:id2,revision:1,requirement_ids:['NFR-02'],
  dependencies:[],capability:'local.check',risk:'low',deadline:null,
  budget:{calls:1,cost_usd_max:null},policy_digest:POLICY_DIGEST,
  idempotency_key:id3,human_approval_required:false};
}
export function main(argv=process.argv.slice(2)){
 const prd=read('docs/foundation/01-PRD.md');
 const baseline=inspectBaseline({server:read('src/server.js'),security:read('src/security.js'),
  manifest:JSON.parse(read('docs/foundation/status.json')),
  prd,packageJSON:JSON.parse(read('package.json')),agentRules:read('AGENTS.md')});
 let step=null;
 if(argv.length>0){
  const file=resolve(process.cwd(),argv[0]);
  const rel=relative(root,file);
  if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw Error('Step file must be inside the repository');
  step=JSON.parse(readFileSync(file,'utf8'));
 }else step=examplePlan();
 const assessment=assessStep(step,{knownRequirements:requirementsFromPRD(prd)});
 const result={
  tool:'conv-os-assurance-static-v1',
  timestamp:new Date().toISOString(),
  baseline,
  step_assessment:assessment,
  policy_digest:POLICY_DIGEST,
  release_authorized:false
 };
 console.log(JSON.stringify(result,null,2));
 // REVIEW is expected for a safe baseline: it still lacks manual/target-environment review.
 // A sensitive/invalid proposal never succeeds merely because baseline CI passes.
 return baseline.decision==='DENY'||assessment.decision==='DENY'||assessment.decision==='REVIEW'?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.exitCode=main()}catch(error){console.error('Assurance denied:',error.message);process.exitCode=1}
}

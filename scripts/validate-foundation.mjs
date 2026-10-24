import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const manifestPath=resolve(root,'docs/foundation/status.json');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const errors=[];
const docStates=new Set(['DRAFT','PROPOSED','ACCEPTED','SUPERSEDED','REJECTED']);
const taskStates=new Set(['NOT_STARTED','IN_PROGRESS','CODE_COMPLETE','TESTED','VALIDATED','RELEASED','BLOCKED']);
if(manifest.schema_version!=='1.0')errors.push('Unsupported manifest schema');
if(!docStates.has(manifest.document_status))errors.push('Invalid document status');
if(!Array.isArray(manifest.foundations)||manifest.foundations.length<12)errors.push('Missing foundation inventory');
if(!Array.isArray(manifest.deliverables))errors.push('Missing deliverable inventory');
const paths=new Set();
for(const doc of manifest.foundations||[]){
 if(paths.has(doc.path))errors.push('Duplicate foundation: '+doc.path);
 paths.add(doc.path);
 if(!docStates.has(doc.status))errors.push('Invalid document state: '+doc.path);
 if(typeof doc.path!=='string'||!doc.path.startsWith('docs/foundation/')){errors.push('Invalid foundation path');continue}
 const full=resolve(root,doc.path);
 if(!existsSync(full)){errors.push('Missing foundation file: '+doc.path);continue}
 const source=readFileSync(full,'utf8');
 if(source.length<100)errors.push('Suspiciously empty foundation: '+doc.path);
 const links=source.matchAll(/\]\(([^)]+)\)/g);
 for(const m of links){
  const link=m[1].split('#')[0];
  if(!link||link.startsWith('https://')||link.startsWith('http://')||link.startsWith('mailto:'))continue;
  if(!existsSync(resolve(dirname(full),link)))errors.push('Broken relative link: '+doc.path+' -> '+link);
 }
}
const ids=new Set();
for(const item of manifest.deliverables||[]){
 if(ids.has(item.id))errors.push('Duplicate work ID: '+item.id);
 ids.add(item.id);
 if(!taskStates.has(item.state))errors.push('Invalid task state: '+item.id);
 if(item.state==='RELEASED'&&!item.evidence?.length)errors.push('Released task has no evidence: '+item.id);
}
if(manifest.release_gate?.state!=='BLOCKED')errors.push('Release gate cannot open without explicit verified approval');
if(errors.length){
 for(const error of errors)console.error('Foundation ERROR:',error);
 process.exit(1);
}
console.log('Foundation manifest valid: '+manifest.foundations.length+' documents, '+manifest.deliverables.length+' tracked deliverables. No claim of deployment or runtime integration.');

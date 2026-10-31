import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../public/radar/ganador/',import.meta.url);
const core=fs.readFileSync(new URL('winner-core.js',base),'utf8');
const app=fs.readFileSync(new URL('app.js',base),'utf8');
const html=fs.readFileSync(new URL('index.html',base),'utf8');
const css=fs.readFileSync(new URL('style.css',base),'utf8');
const ctx={URL,Date};
vm.createContext(ctx);
vm.runInContext(core,ctx);
const C=ctx.WinnerCore;
const product={price:15500,cost:5700,shipping:3500,fee:600,cpa:4000,rejectRate:10,rejectCost:3000,taxReserve:0};

test('Motor de diez señales con pesos que suman 100',()=>{
 assert.equal(C.SIGNALS.length,10);
 assert.equal(C.SIGNALS.reduce((s,x)=>s+x.weight,0),100);
 assert.equal(new Set(C.SIGNALS.map(x=>x.id)).size,10);
});
test('Economía unitaria cuenta rechazos y no equipara ingreso con beneficio',()=>{
 const e=C.financial(product,{targetContribution:5000});
 assert.equal(e.expectedRejectCost,300);
 assert.equal(e.preAds,5400);
 assert.equal(e.contribution,1400);
 assert.equal(e.maxCpa,5400);
 assert.equal(e.targetCpa,400);
 assert.equal(e.scenarios[2].contribution,200);
});
test('Sin pruebas, puntajes altos no se certifican como ganadores',()=>{
 const ev=C.freshEvaluation();
 for(const s of C.SIGNALS)ev.signals[s.id].rating=5;
 const a=C.assessment({...product,price:35000},ev,{targetContribution:5000});
 assert.equal(a.potential,100);
 assert.equal(a.adjusted,55);
 assert.equal(a.coveragePct,0);
 assert.equal(a.verdict,'Investigar');
});
test('Documentación completa y control conforme permite un piloto, nunca ventas garantizadas',()=>{
 const ev=C.freshEvaluation();
 for(const s of C.SIGNALS)ev.signals[s.id]={rating:5,note:'Observación documentada con limitaciones',url:'https://example.org/dato',observedAt:'2026-10-31',source:'Observación'};
 ev.controls={regulatory:'approved',safety:'approved',supplier:'approved'};
 const a=C.assessment({...product,price:35000},ev,{targetContribution:5000});
 assert.equal(a.coveragePct,100);
 assert.equal(a.adjusted,100);
 assert.equal(a.verdict,'Apto para piloto');
 ev.controls.regulatory='blocked';
 assert.equal(C.assessment({...product,price:35000},ev,{targetContribution:5000}).verdict,'Descartar / corregir');
});
test('Un saldo negativo se descarta incluso con gran interés de mercado',()=>{
 assert.equal(C.assessment({...product,cpa:15000},C.freshEvaluation(),{}).verdict,'Descartar / corregir');
});
test('Evidencias con javascript: no se aceptan y hay formularios reales',()=>{
 assert.equal(C.safeUrl('javascript:alert(1)'),'');
 assert.match(html,/id="workspace"/);
 assert.match(html,/id="productDialog"/);
 assert.match(app,/localStorage.setItem\(DB_KEY/);
 assert.match(app,/data-evidence/);
 assert.match(app,/data-control/);
 assert.match(css,/@media\(max-width:700px\)/);
 new vm.Script(app);
});

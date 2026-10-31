/* Radar Ganador Deep — motor determinista, sin fuentes automáticas ni promesas de ventas */
(function(root){
'use strict';
const SIGNALS=[
{id:'pain',group:'DEMANDA',label:'Dolor que duele',weight:15,question:'¿Qué pierde el comprador si no resuelve el problema?',tip:'Quejas concretas, costo de no actuar y urgencia real.'},
{id:'chile',group:'DEMANDA',label:'Problema masivo en Chile',weight:12,question:'¿Existe suficiente público comprador en Chile?',tip:'Búsquedas, comunidades, compradores y tamaño defendible.'},
{id:'abroad',group:'DEMANDA',label:'Demanda validada afuera',weight:10,question:'¿Hay señales documentadas de compras en otros mercados?',tip:'Ventas contrastables. Un anuncio activo NO prueba ventas.'},
{id:'angles',group:'MARKETING',label:'Más de un ángulo',weight:8,question:'¿Se puede vender por varias motivaciones reales?',tip:'Ej.: comodidad, ahorro de tiempo y seguridad (sin inventar efectos).'},
{id:'creative',group:'MARKETING',label:'Diversidad creativa',weight:8,question:'¿Podemos crear distintas piezas originales?',tip:'Demostración, historia, comparación y testimonial verificable.'},
{id:'visual',group:'MARKETING',label:'Demostrable en 3 segundos',weight:9,question:'¿Se entiende el valor con una demostración breve?',tip:'Antes/después auténtico, uso directo, beneficio observable.'},
{id:'margin',group:'OPERACIÓN',label:'Margen que aguanta rechazos',weight:16,question:'¿Los números resisten publicidad, rechazos y devoluciones?',tip:'Usa los costos del simulador; no confundas margen bruto con utilidad.'},
{id:'logistics',group:'OPERACIÓN',label:'Logística amigable',weight:8,question:'¿Fácil de despachar, entregar y devolver?',tip:'Tamaño, fragilidad, baterías, proveedores y regiones.'},
{id:'scarcity',group:'OPERACIÓN',label:'No lo encuentras en la esquina',weight:6,question:'¿La oferta tiene diferenciación real?',tip:'Revisa tiendas físicas y marketplace antes de asignar puntaje alto.'},
{id:'ticket',group:'OPERACIÓN',label:'Ticket alto o recompra',weight:8,question:'¿Eleva el valor del cliente sin depender de promesas?',tip:'Pack, accesorios, consumibles o nueva compra genuina.'}
];
const SUM=SIGNALS.reduce((a,x)=>a+x.weight,0);
if(SUM!==100)throw Error('Los pesos deben sumar 100.');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
const money=x=>Math.max(0,Math.round(Number(x)||0));
const safeUrl=value=>{try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
function financial(p,settings={}){
const price=money(p.price),cost=money(p.cost),shipping=money(p.shipping),fee=money(p.fee),cpa=money(p.cpa),taxReserve=money(p.taxReserve);
const rejectRate=clamp(p.rejectRate,0,100),rejectCost=money(p.rejectCost);
const expectedRejectCost=rejectCost*rejectRate/100;
const preAds=price-cost-shipping-fee-taxReserve-expectedRejectCost;
const contribution=preAds-cpa;
const goal=money(settings.targetContribution??5000);
return {price,cost,shipping,fee,cpa,taxReserve,rejectRate,rejectCost,expectedRejectCost,preAds,contribution,marginPct:price>0?contribution/price*100:0,maxCpa:preAds,targetCpa:preAds-goal,goal,
scenarios:[{name:'CPA -25%',cpa:Math.round(cpa*.75),contribution:preAds-cpa*.75},{name:'Base',cpa,contribution},{name:'CPA +30%',cpa:Math.round(cpa*1.3),contribution:preAds-cpa*1.3}]};
}
function cleanEvidence(raw={}){
return Object.fromEntries(SIGNALS.map(s=>{
const e=(raw&&raw[s.id])||{};
return [s.id,{rating:clamp(e.rating,0,5),note:String(e.note||'').slice(0,1600),url:safeUrl(e.url),observedAt:/^\d{4}-\d{2}-\d{2}$/.test(e.observedAt||'')?e.observedAt:'',source:String(e.source||'').slice(0,150)}];
}));
}
function assessment(product,evaluation={},settings={}){
const signals=cleanEvidence(evaluation.signals);
let potential=0,weightedCoverage=0;
const details=SIGNALS.map(s=>{
const v=signals[s.id];
const hasUrl=Boolean(v.url),hasNote=v.note.trim().length>=12,hasDate=Boolean(v.observedAt);
const quality=hasUrl&&hasNote&&hasDate?1:hasUrl&&hasNote?.8:hasUrl||hasNote?.4:0;
const points=s.weight*v.rating/5;
potential+=points;
weightedCoverage+=s.weight*quality;
return {...s,...v,points,quality};
});
const coverage=weightedCoverage/100;
const adjusted=Math.round(potential*(.55+.45*coverage));
const econ=financial(product,settings);
const controls=evaluation.controls||{};
const blocked=['regulatory','safety','supplier'].filter(k=>controls[k]==='blocked');
const pending=['regulatory','safety','supplier'].filter(k=>controls[k]!=='approved'&&controls[k]!=='blocked');
const problems=[];
if(!econ.price||!econ.cost)problems.push('Faltan precio o costo del proveedor.');
if(econ.contribution<=0)problems.push('La contribución estimada no es positiva.');
if(econ.contribution>0&&econ.contribution<econ.goal)problems.push('No alcanza el saldo objetivo por venta.');
if(coverage<.7)problems.push('Evidencia insuficiente: menos del 70% de cobertura ponderada.');
if(adjusted<75)problems.push('El puntaje ajustado está bajo 75/100.');
if(pending.length)problems.push('Hay controles pendientes: '+pending.join(', ')+'.');
if(blocked.length)problems.push('Hay bloqueos: '+blocked.join(', ')+'.');
let verdict='Investigar';
if(blocked.length||econ.price>0&&econ.cost>0&&econ.contribution<=0)verdict='Descartar / corregir';
else if(!econ.price||!econ.cost)verdict='Datos insuficientes';
else if(!pending.length&&coverage>=.7&&adjusted>=75&&econ.contribution>=econ.goal)verdict='Apto para piloto';
return {potential:Math.round(potential),adjusted,coveragePct:Math.round(coverage*100),details,econ,verdict,problems,blocked,pending,qualified:verdict==='Apto para piloto'};
}
function freshEvaluation(){return {signals:cleanEvidence(),controls:{regulatory:'pending',safety:'pending',supplier:'pending'},controlNotes:'',updatedAt:new Date().toISOString().slice(0,10)};}
root.WinnerCore={SIGNALS,financial,assessment,freshEvaluation,cleanEvidence,money,clamp,safeUrl};
})(typeof window!=='undefined'?window:globalThis);

/* Radar Ganador Deep — UI estática integrada con deep-radar-v1 */
(function(){
'use strict';
const C=window.WinnerCore;
if(!C)throw Error('No se pudo cargar el motor WinnerCore');
const $=q=>document.querySelector(q),h=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const CLP=n=>'$'+Math.round(Number(n)||0).toLocaleString('es-CL');
const DB_KEY='deep-radar-v1', EVAL_KEY='deep-radar-ganador-v1';
const today=()=>new Date().toISOString().slice(0,10);
const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x&&typeof x==='object'?x:fallback;}catch{return fallback;}};
let db=read(DB_KEY,{products:[],settings:{budget:20000,targetContribution:5000}});
if(!Array.isArray(db.products))db.products=[];
if(!db.settings||typeof db.settings!=='object')db.settings={budget:20000,targetContribution:5000};
let entries=read(EVAL_KEY,{version:1,evaluations:{}});
if(!entries.evaluations||typeof entries.evaluations!=='object')entries={version:1,evaluations:{}};
let selected=new URLSearchParams(location.search).get('producto')||db.products[0]?.id||null;
let query='';
let notificationTimer;
function persist(){
try{localStorage.setItem(DB_KEY,JSON.stringify(db));localStorage.setItem(EVAL_KEY,JSON.stringify(entries));}
catch(e){notice('No se pudo guardar localmente. Comprueba la cuota del navegador y exporta un respaldo.');}
}
function notice(s){const t=$('#toast');t.textContent=s;t.style.display='block';clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>t.style.display='none',3500);}
function product(){return db.products.find(p=>p.id===selected);}
function entry(){if(!entries.evaluations[selected])entries.evaluations[selected]=C.freshEvaluation();return entries.evaluations[selected];}
function report(){const p=product();return p?C.assessment(p,entry(),db.settings):null;}
function renderList(){
const rows=db.products.filter(p=>(p.name+' '+(p.sku||'')).toLowerCase().includes(query.toLowerCase()));
$('#productList').innerHTML=rows.map(p=>{const a=C.assessment(p,entries.evaluations[p.id]||C.freshEvaluation(),db.settings);return '<button class="prod '+(p.id===selected?'active':'')+'" data-pick="'+h(p.id)+'"><b>'+h(p.name||'Sin nombre')+'</b><small>'+h(p.sku||p.category||'Producto manual')+' · '+a.adjusted+'/100 '+(p.isDemo?'· DEMO':'')+'</small></button>';}).join('')||'<p class="footnote">Sin coincidencias.</p>';
}
function field(label,key,value,placeholder='',type='number',help=''){
const max=key==='rejectRate'?' max="100"':'';
return '<div class="field"><label for="p-'+key+'">'+label+'</label><input id="p-'+key+'" data-product-field="'+key+'" type="'+type+'" min="0"'+max+' step="1" value="'+h(value??0)+'" placeholder="'+h(placeholder)+'">'+(help?'<span class="footnote">'+h(help)+'</span>':'')+'</div>';
}
function evidenceBlock(s,i){
const proof=entries.evaluations[selected]?.signals?.[s.id]||{};
const rating=C.clamp(proof.rating,0,5);
const quality=s.quality===1?'Fuente registrada con nota y fecha':s.quality>0?'Evidencia parcial':'Sin evidencia registrada';
return '<article class="signal-card"><div class="signal-heading"><div><span class="signal-num">'+String(i+1).padStart(2,'0')+' / 10</span><h3>'+h(s.label)+'</h3></div><span class="weight">PESO '+s.weight+'%</span></div><p>'+h(s.question)+'</p><p class="tip">'+h(s.tip)+'</p>'+
'<div class="rate" role="group" aria-label="Calificar '+h(s.label)+' de cero a cinco">'+Array.from({length:6},(_,n)=>'<button type="button" data-rate="'+s.id+'" data-score="'+n+'" class="'+(rating===n?'on':'')+'" aria-pressed="'+(rating===n)+'">'+n+'</button>').join('')+'</div>'+
'<div class="proof-grid"><input data-evidence="'+s.id+'" data-key="url" type="url" maxlength="500" aria-label="URL de evidencia para '+h(s.label)+'" placeholder="URL de evidencia verificable" value="'+h(proof.url||'')+'">'+
'<input data-evidence="'+s.id+'" data-key="observedAt" type="date" aria-label="Fecha de evidencia para '+h(s.label)+'" value="'+h(proof.observedAt||'')+'" max="'+today()+'">'+
'<input data-evidence="'+s.id+'" data-key="source" type="text" maxlength="150" aria-label="Fuente para '+h(s.label)+'" placeholder="Fuente: reseña, pedido, anuncio…" value="'+h(proof.source||'')+'">'+
'<textarea data-evidence="'+s.id+'" data-key="note" maxlength="1600" aria-label="Nota de evidencia para '+h(s.label)+'" placeholder="¿Qué observaste? Registra cifras, contexto, supuestos y limitaciones.">'+h(proof.note||'')+'</textarea></div>'+
'<div class="proof-status">'+quality+' · '+s.points.toFixed(1)+' puntos potenciales</div></article>';
}
function renderWorkspace(){
const p=product();if(!p){$('#workspace').innerHTML='<div class="empty"><div class="micro">ESPECIAL CHILE</div><h2>El radar está listo para evaluar</h2><p>Registra un producto o incorpora un ejemplo. Si ya usas el radar principal, sus productos aparecerán aquí en este mismo navegador.</p><button class="btn primary" data-add>+ Crear primer producto</button><p class="footnote">No hay ventas reales ni acceso automático a Dropi o Meta Ads.</p></div>';return;}
const a=report(), DEMO=p.isDemo?'<span class="badge demo">DATOS DEMO / SIN VALIDAR</span>':'<span class="badge">INGRESO MANUAL</span>';
let sections='';
for(const g of ['DEMANDA','MARKETING','OPERACIÓN']){const items=a.details.filter(s=>s.group===g);sections+='<div class="signal-section-title '+(g==='MARKETING'?'b':g==='OPERACIÓN'?'c':'a')+'"><span></span>'+h(g)+' · '+items.reduce((sum,x)=>sum+x.weight,0)+'% DEL SCORE</div>'+items.map(s=>evidenceBlock(s,C.SIGNALS.findIndex(x=>x.id===s.id))).join('');}
$('#workspace').innerHTML='<header class="hero"><div><div class="micro">MÓDULO 01 · MÉTODO DE VALIDACIÓN</div><h1>Las 10 señales de un<br>producto ganador</h1><p>Evalúa la demanda, la capacidad de crear anuncios y la operación. La puntuación es una heurística de priorización, <strong>no una predicción de ventas</strong>.</p><div class="row">'+DEMO+'<span class="subtle">Guardado local · '+h(entry().updatedAt||today())+'</span></div></div></header>'+
'<section class="panel"><div class="panel-head"><div><h2>'+h(p.name)+'</h2><div class="subtle">'+h(p.sku||p.category||'Sin SKU')+' · '+h(p.source||'Origen no informado')+'</div></div><a href="../" class="link">Ver radar general ↗</a></div>'+
'<div class="panel-body"><div class="form-grid"><div class="field wide"><label for="p-problem">Problema / usuario / situación de compra</label><textarea id="p-problem" data-product-field="problem" maxlength="1000" placeholder="¿Quién lo necesita, cuándo y por qué?">'+h(p.problem||'')+'</textarea></div>'+
field('Precio de venta CLP','price',p.price)+field('Costo proveedor CLP','cost',p.cost)+field('Flete por venta CLP','shipping',p.shipping)+field('Comisión pasarela CLP','fee',p.fee)+field('CPA por venta entregada CLP','cpa',p.cpa)+field('Reserva tributaria CLP','taxReserve',p.taxReserve)+field('Pedidos rechazados (%)','rejectRate',p.rejectRate)+field('Costo por rechazo CLP','rejectCost',p.rejectCost)+
'<div class="field"><label for="goal">Contribución objetivo CLP</label><input id="goal" data-setting="targetContribution" type="number" min="0" step="500" value="'+h(db.settings.targetContribution??5000)+'"></div></div><p class="footnote">Los fletes, impuestos, tarifas, rechazos y CPA son supuestos que debes verificar en Dropi, Shopify y tu operación. Un cero puede significar costo faltante, no costo gratuito.</p></div></section>'+
'<div class="micro" style="margin-top:28px">CALIFICA DEL 0 AL 5 · DOCUMENTA TUS PRUEBAS</div>'+sections+
'<div class="alert">Los enlaces y las notas son evidencia aportada por el usuario, no verificaciones automáticas. La calificación no equivale a ventas comprobadas. Respalda tus datos antes de cambiar de dispositivo.</div>';
}
function renderResult(){
const a=report();
if(!a){$('#result').innerHTML='<div class="result-panel"><div class="result-kicker">ESCÁNER DE VIABILIDAD</div><h2>Sin producto seleccionado</h2><p class="muted">Añade un candidato para ver puntuaciones, riesgos y economía unitaria.</p></div>';return;}
const e=a.econ;const kind=a.verdict==='Apto para piloto'?'':a.verdict==='Descartar / corregir'?' stop':' warn';
const ctrl=entry().controls||{};
const control=(k,label)=>'<div class="control"><label for="ctrl-'+k+'">'+h(label)+'</label><select id="ctrl-'+k+'" data-control="'+k+'">'+[['pending','Pendiente / no comprobado'],['approved','Revisado y conforme'],['blocked','Bloqueo / incumplimiento']].map(([v,t])=>'<option value="'+v+'" '+(ctrl[k]===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div>';
$('#result').innerHTML='<div class="result-panel"><div class="result-kicker">ESCÁNER · RESULTADO ACTUAL</div><div class="score">'+a.adjusted+'<small> / 100</small></div><div class="bar"><span style="width:'+a.adjusted+'%"></span></div><div class="scores"><div class="score-tile"><small>POTENCIAL TEÓRICO</small><strong>'+a.potential+'/100</strong></div><div class="score-tile"><small>COBERTURA DOCUMENTAL</small><strong>'+a.coveragePct+'%</strong></div></div><div class="verdict'+kind+'">'+h(a.verdict)+'</div><p class="footnote">Score ajustado = potencial × (55% + 45% × cobertura). Mide prioridad de investigación, no probabilidad de éxito.</p>'+
'<div class="eco"><h2>Economía por venta entregada</h2>'+
[['Ingreso',e.price],['Proveedor',-e.cost],['Despacho',-e.shipping],['Pasarela',-e.fee],['Reserva tributaria',-e.taxReserve],['Rechazos esperados',-e.expectedRejectCost],['Publicidad / CPA',-e.cpa]].map(([n,v])=>'<div class="eco-row"><span>'+n+'</span><strong>'+CLP(v)+'</strong></div>').join('')+
'<div class="eco-row total"><span>Contribución estimada</span><strong style="'+(e.contribution<0?'color:var(--red)':'')+'">'+CLP(e.contribution)+'</strong></div><div class="eco-row"><span>Margen de contribución</span><strong>'+e.marginPct.toFixed(1)+'%</strong></div><div class="eco-row"><span>CPA de equilibrio</span><strong>'+CLP(e.maxCpa)+'</strong></div><div class="eco-row"><span>CPA para objetivo</span><strong>'+CLP(e.targetCpa)+'</strong></div></div>'+
'<div class="eco"><h2>Sensibilidad al CPA</h2>'+e.scenarios.map(s=>'<div class="scenario"><span>'+h(s.name)+' · CPA '+CLP(s.cpa)+'</span><b class="'+(s.contribution<0?'negative':'positive')+'">'+CLP(s.contribution)+'</b></div>').join('')+'</div>'+
'<div class="eco"><h2>Controles obligatorios</h2><p class="footnote">Son revisiones declaradas manualmente, no certificados automáticos.</p><div class="controls">'+control('regulatory','Cumplimiento regulatorio / ISP / etiquetado')+control('safety','Seguridad, claims y garantías')+control('supplier','Proveedor, stock y entregas')+'</div></div>'+
'<div class="eco"><h2>Por resolver antes del piloto</h2>'+(a.problems.length?'<ul class="issues">'+a.problems.map(x=>'<li>'+h(x)+'</li>').join('')+'</ul>':'<p class="footnote">Sin bloqueos registrados según los datos ingresados; aún debes verificar evidencia y resultados reales.</p>')+
'<div class="row"><button class="btn primary" id="copySummary">Copiar dictamen</button><button class="btn flat" id="exportInline">↓ JSON</button></div></div>'+
'<div class="alert">Modelo simplificado: supone CPA por venta entregada y pérdidas esperadas por rechazo. No sustituye flujo de caja, contabilidad, cálculo de impuestos ni tasas de conversión reales.</div></div>';
}
function render(){renderList();renderWorkspace();renderResult();}
function pick(id){if(!db.products.some(p=>p.id===id))return;selected=id;history.replaceState(null,'','?producto='+encodeURIComponent(id));render();window.scrollTo({top:0,behavior:'instant'});}
function updateEvidence(node){
const id=node.dataset.evidence,key=node.dataset.key;if(!id||!key||!C.SIGNALS.some(x=>x.id===id))return;
const e=entry();if(!e.signals)e.signals=C.cleanEvidence();if(!e.signals[id])e.signals[id]={};
const raw=node.value;e.signals[id][key]=key==='url'?C.safeUrl(raw):key==='observedAt'?raw:raw.slice(0,key==='note'?1600:150);
e.updatedAt=today();persist();renderResult();
}
function updateProduct(node){
const p=product();if(!p)return;const key=node.dataset.productField;
if(!['price','cost','shipping','fee','cpa','rejectRate','rejectCost','taxReserve','problem'].includes(key))return;
p[key]=key==='problem'?node.value.slice(0,1000):key==='rejectRate'?C.clamp(node.value,0,100):C.money(node.value);
p.updatedAt=today();persist();renderResult();
}
function newProduct(data){
const p={id:'p-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),name:String(data.name||'').trim().slice(0,140),problem:String(data.problem||'').slice(0,1000),category:'Otro',source:String(data.source||'Ingreso manual').slice(0,150),sku:String(data.sku||'').slice(0,80),price:C.money(data.price),cost:C.money(data.cost),shipping:0,fee:0,cpa:0,taxReserve:0,rejectRate:0,rejectCost:0,status:'investigacion',notes:'',demand:0,pain:0,competition:0,logistics:0,evidence:0,isDemo:Boolean(data.isDemo),updatedAt:today()};
if(!p.name)return null;db.products.unshift(p);entries.evaluations[p.id]=C.freshEvaluation();persist();pick(p.id);return p;
}
function sample(){
const existing=db.products.find(p=>p.id==='demo-batana-captura-20261031');
if(existing){pick(existing.id);return;}
const sample={id:'demo-batana-captura-20261031',name:'Aceite de batana — ejemplo de captura',category:'Belleza',source:'Captura Dropi (no consultada en vivo)',sku:'',problem:'Cuidado cosmético capilar. NO prometer crecimiento del cabello sin evidencia.',price:15500,cost:5700,shipping:3500,fee:600,cpa:4000,rejectRate:10,rejectCost:3000,taxReserve:0,status:'investigacion',isDemo:true,notes:'Precio y costo observados en captura 31-10-2026; despacho, CPA, comisiones y rechazos son supuestos de simulación. Exige revisar ISP y claims.',updatedAt:today()};
db.products.unshift(sample);entries.evaluations[sample.id]=C.freshEvaluation();persist();pick(sample.id);notice('Ejemplo creado: no son ventas ni costos verificados.');
}
function summary(){
const p=product(),a=report();if(!p||!a)return '';
return ['RADAR GANADOR DEEP',p.name,p.isDemo?'PRODUCTO DEMO / SIN VALIDAR':'Producto ingresado manualmente','Score ajustado: '+a.adjusted+'/100','Potencial: '+a.potential+'/100','Cobertura documental: '+a.coveragePct+'%','Dictamen: '+a.verdict,'Contribución simulada: '+CLP(a.econ.contribution),'CPA equilibrio: '+CLP(a.econ.maxCpa),'Objetivo CPA: '+CLP(a.econ.targetCpa),'Pendientes: '+(a.problems.join(' | ')||'Ninguno registrado'),'Advertencia: sin validación automática ni garantía de ventas'].join('\n');
}
function exportOne(){
const p=product();if(!p){notice('Registra un producto primero.');return;}
const exportObj={format:'deep-radar-ganador-v1',exportedAt:new Date().toISOString(),product:p,evaluation:entry(),assessment:report(),disclaimer:'Evaluación manual; fuentes no verificadas automáticamente; no es predicción de ventas.'};
const blob=new Blob([JSON.stringify(exportObj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='deep-ganador-'+String(p.id).replace(/[^\w-]/g,'')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
notice('Evaluación exportada.');
}
document.addEventListener('click',event=>{
const pickEl=event.target.closest('[data-pick]');if(pickEl){pick(pickEl.dataset.pick);return;}
if(event.target.closest('[data-add]')){$('#productDialog').showModal();return;}
const button=event.target.closest('[data-rate]');
if(button){const e=entry(),k=button.dataset.rate;const num=Number(button.dataset.score);if(!C.SIGNALS.some(x=>x.id===k))return;e.signals=e.signals||C.cleanEvidence();e.signals[k]={...(e.signals[k]||{}),rating:C.clamp(num,0,5)};e.updatedAt=today();persist();render();return;}
if(event.target.closest('#copySummary')){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(summary()).then(()=>notice('Dictamen copiado.')).catch(()=>notice('El navegador no permitió copiar.'));}else notice('El navegador no permite copiar desde este contexto.');return;}
if(event.target.closest('#exportInline'))exportOne();
});
document.addEventListener('input',ev=>{
const t=ev.target;
if(t.id==='search'){query=t.value;renderList();}
else if(t.matches('[data-evidence]'))updateEvidence(t);
else if(t.matches('[data-product-field]'))updateProduct(t);
else if(t.matches('[data-setting]')){db.settings.targetContribution=C.money(t.value);persist();renderResult();}
});
document.addEventListener('change',ev=>{
const t=ev.target;
if(t.matches('[data-control]')){const k=t.dataset.control;if(!['regulatory','safety','supplier'].includes(k))return;entry().controls[k]=t.value;entry().updatedAt=today();persist();renderResult();}
if(t.matches('[data-evidence]')){updateEvidence(t);renderWorkspace();}
if(t.matches('[data-product-field]')){updateProduct(t);renderList();}
});
$('#addBtn').addEventListener('click',()=>$('#productDialog').showModal());
$('#closeDialog').addEventListener('click',()=>$('#productDialog').close());
$('#cancelDialog').addEventListener('click',()=>$('#productDialog').close());
$('#newProductForm').addEventListener('submit',e=>{
e.preventDefault();const form=new FormData(e.target),p=newProduct(Object.fromEntries(form));if(p){$('#productDialog').close();e.target.reset();notice('Producto añadido a ambos radares.');}
});
$('#loadExample').addEventListener('click',sample);
$('#exportBtn').addEventListener('click',exportOne);
window.addEventListener('storage',event=>{if(event.key===DB_KEY){db=read(DB_KEY,db);if(!product())selected=db.products[0]?.id||null;render();}});
render();
})();

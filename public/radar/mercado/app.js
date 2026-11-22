/* Deep Radar Market Intel UI — datos 100% locales, ninguna llamada a APIs externas. */
(function(){
'use strict';
const E=window.MarketIntel,KEY='deep-radar-market-v2',SCENARIOS_KEY='deep-radar-market-economics-v2';
const $=id=>document.getElementById(id);
const clp=n=>'$'+Math.round(n).toLocaleString('es-CL');
let store={version:2,source:'',items:[]},ranking=[],selected=null,scenarios={};
try{
 const s=JSON.parse(localStorage.getItem(KEY)||'null');
 if(s&&s.version===2&&Array.isArray(s.items)&&s.items.length<=40000)store=s;
 const c=JSON.parse(localStorage.getItem(SCENARIOS_KEY)||'null');
 if(c&&typeof c==='object'&&!Array.isArray(c))scenarios=c;
}catch{}
function say(s){$('message').textContent=s;}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(store));return true;}
 catch{say('El almacenamiento local está lleno. Exporta y respalda datos; no se guardó este cambio.');return false;}
}
function persistScenarios(){
 try{localStorage.setItem(SCENARIOS_KEY,JSON.stringify(scenarios));}
 catch{say('No se pudo guardar el escenario.');}
}
function addCell(row,text){
 const td=document.createElement('td');td.textContent=text;row.appendChild(td);return td;
}
function label(text,variant=''){
 const span=document.createElement('span');span.className='tag '+variant;span.textContent=text;return span;
}
function rowClick(key){selected=key;render();}
function barChart(changes){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 380 150');svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Descensos diarios de inventario en los últimos 14 días; no equivalen a ventas.');
 svg.classList.add('chart');
 const values=changes.filter(x=>x.age>=0&&x.age<14).sort((a,b)=>a.date.localeCompare(b.date));
 const max=Math.max(1,...values.map(x=>x.movement));
 for(let i=0;i<14;i++){
   const d=new Date(Date.parse(ranking.find(x=>x.key===selected).lastDate+'T00:00:00Z')-(13-i)*86400000).toISOString().slice(0,10);
   const x=values.find(x=>x.date===d);
   const v=x?.movement||0;
   const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
   rect.setAttribute('x',String(13+i*26));rect.setAttribute('y',String(129-v/max*108));
   rect.setAttribute('width','17');rect.setAttribute('height',String(Math.max(v?3:0,v/max*108)));
   rect.setAttribute('rx','3');rect.setAttribute('fill',x?'#65c8be':'#354455');
   const title=document.createElementNS('http://www.w3.org/2000/svg','title');
   title.textContent=d+': '+(x?String(v)+' unidades de descenso observable':'sin par diario comparable');rect.appendChild(title);svg.appendChild(rect);
 }
 return svg;
}
function details(){
 const p=ranking.find(x=>x.key===selected),target=$('details');target.replaceChildren();
 const title=document.createElement('h2');title.className='section-title';title.textContent='Ficha de inventario';target.appendChild(title);
 if(!p){const empty=document.createElement('p');empty.className='empty';empty.textContent='Elige un candidato del ranking.';target.appendChild(empty);return;}
 const name=document.createElement('h3');name.className='detailname';name.textContent=p.name;target.appendChild(name);
 const id=document.createElement('div');id.className='small muted';id.textContent='ID '+p.product_id+' · Proveedor '+p.supplier_id+' · Último registro '+p.lastDate;target.appendChild(id);
 target.appendChild(barChart(p.changes));
 const lines=[
  ['Descenso observado últimos 7 días',p.movement7+' uds'],
  ['Descenso observado 7 días anteriores',p.movementPrevious7+' uds'],
  ['Días con descenso / 14d',String(p.activeDays)],
  ['Pares diarios sin incidencias',String(p.analyzedPairs)],
  ['Concentración en un día',Math.round(p.peakConcentration*100)+'%'],
  ['Cobertura / confianza',p.confidence+'%'],
  ['Último stock declarado',p.lastStock+' uds']
 ];
 for(const [k,v] of lines){
   const row=document.createElement('div');row.className='minirow';
   const a=document.createElement('span');a.className='muted';a.textContent=k;
   const b=document.createElement('strong');b.textContent=v;row.append(a,b);target.appendChild(row);
 }
 const v=document.createElement('p');v.className='small';
 v.appendChild(label(p.status,p.oneDayFlag?'warn':p.status==='Vigilar aceleración'?'good':''));
 target.appendChild(v);
 const growth=document.createElement('p');growth.className='small muted';
 growth.textContent=p.growth===null?'Aceleración: sin base anterior comparable.':('Cambio entre semanas: '+(p.growth*100).toFixed(1)+'%. Es variación de inventario, no crecimiento de ventas.');
 target.appendChild(growth);
 if(p.flags.length){const flag=document.createElement('p');flag.className='small risk';flag.textContent='Revisar: '+p.flags.join(' · ');target.appendChild(flag);}
 const sources=document.createElement('div');sources.id='sourceList';
 if(p.sources.length){
  const labelEl=document.createElement('p');labelEl.className='small muted';labelEl.textContent='Fuentes declaradas (no verificadas automáticamente):';sources.appendChild(labelEl);
  p.sources.slice(0,4).forEach(url=>{
   const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=url.slice(0,110);
   const line=document.createElement('p');line.className='small';line.appendChild(a);sources.appendChild(line);
  });
 }else{const note=document.createElement('p');note.className='small risk';note.textContent='Sin URL de procedencia. La confianza se penaliza.';sources.appendChild(note);}
 target.appendChild(sources);
 const link=document.createElement('a');link.target='_blank';link.rel='noopener noreferrer';
 link.href='https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&q='+encodeURIComponent(p.name);
 link.textContent='Investigar anuncios relacionados en Meta Ads Library';link.className='small';target.appendChild(link);
}
function render(){
 ranking=E.analyze(store.items);
 if(!ranking.some(x=>x.key===selected))selected=ranking[0]?.key||null;
 $('countProducts').textContent=ranking.length?String(ranking.length):'—';
 $('countObservations').textContent=store.items.length?String(store.items.length):'—';
 $('countEvaluable').textContent=String(ranking.filter(x=>x.analyzedPairs>=7).length);
 $('datasetType').textContent=store.source==='DEMO'?'DEMO':store.source==='CSV'?'CSV manual':'Sin datos';
 const tbody=$('rows');tbody.replaceChildren();
 if(!ranking.length){const tr=document.createElement('tr'),td=addCell(tr,'Importa un CSV de registros diarios; también puedes probar el DEMO.');td.colSpan=6;td.className='empty';tbody.appendChild(tr);}
 for(const p of ranking){
   const tr=document.createElement('tr');tr.setAttribute('role','button');tr.tabIndex=0;tr.className=selected===p.key?'selected':'';
   addCell(tr,p.name+' · '+p.supplier_id);
   addCell(tr,String(p.movement7));addCell(tr,String(p.movement14));
   addCell(tr,p.confidence+'%');addCell(tr,p.score+'/100');
   const td=document.createElement('td');td.appendChild(label(p.status,p.oneDayFlag?'warn':p.status==='Vigilar aceleración'?'good':''));tr.appendChild(td);
   tr.addEventListener('click',()=>rowClick(p.key));tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();rowClick(p.key);}});
   tbody.appendChild(tr);
 }
 details();
 const form=$('calcForm');
 const saved=scenarios[selected]||null;
 if(saved){for(const [key,value] of Object.entries(saved)){const input=form.elements.namedItem(key);if(input&&'value'in input)input.value=value;}}
 $('calcResult').replaceChildren();
}
function download(text,filename,type){
 const url=URL.createObjectURL(new Blob([text],{type:type||'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('fileInput').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>3_000_000)throw Error('Archivo mayor a 3 MB.');
  const parsed=E.parseCSV(await file.text());
  if(!confirm('Se reemplazarán las '+store.items.length+' observaciones locales existentes por '+parsed.count+' filas. ¿Continuar?'))return;
  store={version:2,source:'CSV',items:parsed.items};selected=null;
  persist();render();
  say('Importadas '+parsed.count+' observaciones; '+parsed.errors.length+' filas descartadas. Recuerda comprobar la fuente y las fechas.');
  if(parsed.errors.length)say($('message').textContent+' Primer error: línea '+parsed.errors[0].line+' ('+parsed.errors[0].error+').');
 }catch(err){say('Importación rechazada: '+err.message);}
 finally{e.target.value='';}
});
$('templateBtn').addEventListener('click',()=>download('date,product_id,supplier_id,stock,name,source_url\n','plantilla_inventario_dropi_cl.csv','text/csv;charset=utf-8'));
$('demoBtn').addEventListener('click',()=>{
 if(store.items.length&&!confirm('Reemplazar los registros actuales por un ejemplo ficticio claramente marcado DEMO?'))return;
 const start=Date.now()-16*86400000;
 const products=[
  {id:'DEMO-A',supplier:'DEMO-01',name:'Cepillo eléctrico · EJEMPLO',stocks:[140,139,137,134,132,130,127,125,120,116,110,108,102,95,90,85,79]},
  {id:'DEMO-B',supplier:'DEMO-02',name:'Aspiradora portátil · EJEMPLO',stocks:[110,110,109,110,110,109,108,108,108,108,40,40,40,40,40,40,40]}
 ];
 const items=[];
 products.forEach(p=>p.stocks.forEach((s,i)=>items.push({date:new Date(start+i*86400000).toISOString().slice(0,10),product_id:p.id,supplier_id:p.supplier,stock:s,name:p.name,source_url:''})));
 store={version:2,source:'DEMO',items};selected=null;persist();render();
 say('DEMOSTRACIÓN: series de inventario ficticias. No representan ventas de Dropi ni productos verificados.');
});
$('exportBtn').addEventListener('click',()=>{
 if(!store.items.length){say('No hay observaciones que exportar.');return;}
 const esc=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'$&")+'"';
 const lines=['date,product_id,supplier_id,stock,name,source_url',...store.items.map(x=>[x.date,x.product_id,x.supplier_id,x.stock,x.name,x.source_url].map(esc).join(','))];
 download(lines.join('\n')+'\n','radar_observaciones_'+new Date().toISOString().slice(0,10)+(store.source==='DEMO'?'_DEMO':'')+'.csv','text/csv;charset=utf-8');
});
$('clearBtn').addEventListener('click',()=>{
 if(!confirm('¿Eliminar las observaciones y escenarios guardados en ESTE navegador? La operación no se puede deshacer sin respaldo.'))return;
 store={version:2,source:'',items:[]};scenarios={};selected=null;localStorage.removeItem(KEY);localStorage.removeItem(SCENARIOS_KEY);render();say('Datos locales eliminados.');
});
$('calcForm').addEventListener('submit',e=>{
 e.preventDefault();
 const values=Object.fromEntries(new FormData(e.currentTarget).entries());
 const input={...values,deliveryRate:Number(values.deliveryPct)/100};
 const result=E.economics(input),out=$('calcResult');out.replaceChildren();
 if(!result.valid){say(result.message);return;}
 if(selected){scenarios[selected]=values;persistScenarios();}
 const card=document.createElement('div');card.className='result '+(result.passes?'':'bad');
 const subtitle=document.createElement('p');subtitle.className='muted small';subtitle.textContent='Contribución esperada por pedido efectivamente entregado (modelo de supuestos)';
 const value=document.createElement('strong');value.textContent=clp(result.perDelivered);
 const status=document.createElement('p');status.textContent=result.passes?'Meta de contribución alcanzada en este escenario.':'No alcanza la meta de contribución: ajustar precio, costos, entrega o CPA.';
 const cpa=document.createElement('p');cpa.className='small';cpa.textContent='CPA máximo por pedido captado para alcanzar la meta: '+clp(result.maxCpaPerOrder)+' (negativo = no viable aun con CPA cero).';
 const cases=document.createElement('p');cases.className='small muted';cases.textContent='Sensibilidad de entregas: '+result.scenarios.map(s=>Math.round(s.rate*100)+'% → '+clp(s.perDelivered)).join(' · ');
 const caveat=document.createElement('p');caveat.className='small muted';caveat.textContent='Modelo antes de ajustes contables e impuestos no incluidos. No supone ni garantiza que la tasa de entrega introducida sea real.';
 card.append(subtitle,value,status,cpa,cases,caveat);out.appendChild(card);
});
render();
})();
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/radar/mercado/',import.meta.url);
const engine=fs.readFileSync(new URL('engine.js',root),'utf8');
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const app=fs.readFileSync(new URL('app.js',root),'utf8');
const ctx={URL,Date};vm.createContext(ctx);vm.runInContext(engine,ctx);
const M=ctx.MarketIntel;
const mk=(date,stock,supplier_id='prov-1')=>({product_id:'SKU01',supplier_id,date,stock,name:'Prueba',source_url:'https://ejemplo.cl/producto'});
const days=(n,stockFn,initial='2026-11-01')=>Array.from({length:n},(_,i)=>mk(new Date(Date.parse(initial+'T00:00:00Z')+i*86400000).toISOString().slice(0,10),stockFn(i)));
test('Importa CSV con nombres español/inglés, BOM, comillas y ;',()=>{
 const data=M.parseCSV('\ufefffecha;id_producto;proveedor;stock;nombre;fuente\n2026-11-19;P1;S2;12;"Peine, especial";https://example.com/p1\n',{today:'2026-11-22'});
 assert.equal(data.count,1);assert.equal(data.items[0].name,'Peine, especial');
});
test('No acepta columnas esenciales ausentes ni fechas futuras',()=>{
 assert.throws(()=>M.parseCSV('fecha,stock\n2026-11-20,2\n',{today:'2026-11-22'}),/columna/);
 assert.throws(()=>M.parseCSV('fecha,product_id,supplier_id,stock\n2026-12-01,x,y,20\n',{today:'2026-11-22'}),/No hay observaciones válidas/);
});
test('Duplicados y stocks inválidos se excluyen',()=>{
 const csv='date,product_id,supplier_id,stock\n2026-11-19,x,y,30\n2026-11-19,x,y,10\n2026-11-20,x,y,-4\n';
 const x=M.parseCSV(csv,{today:'2026-11-22'});
 assert.equal(x.items.length,1);assert.equal(x.errors.length,2);
});
test('Sin día anterior comparable no calcula caída como movimiento',()=>{
 const data=[mk('2026-11-10',100),mk('2026-11-13',30)];
 const a=M.analyze(data)[0];assert.equal(a.movement14,0);
 assert.ok(a.flags.some(x=>x.includes('Saltos')));
});
test('Reposiciones no se computan como ventas',()=>{
 const data=[mk('2026-11-18',100),mk('2026-11-19',180),mk('2026-11-20',176)];
 const x=M.analyze(data)[0];assert.equal(x.movement14,4);
 assert.ok(x.flags.some(t=>t.includes('Reposición')));
});
test('Detecta salto anómalo >= 80% del stock sin inferir venta',()=>{
 const data=[mk('2026-11-18',100),mk('2026-11-19',10),mk('2026-11-20',8)];
 const x=M.analyze(data)[0];assert.equal(x.movement14,2);
 assert.ok(x.changes.some(y=>y.type==='anomalia'));
});
test('La concentración de un solo día bloquea un score alto',()=>{
 const stock=[100,100,100,100,100,100,100,100,100,100,100,100,100,75,75,75];
 const x=M.analyze(days(stock.length,i=>stock[i]))[0];
 assert.equal(x.oneDayFlag,true);assert.ok(x.score<=49);
});
test('Cobertura de 2 muestras no genera candidato listo para escalar',()=>{
 const x=M.analyze([mk('2026-11-20',40),mk('2026-11-21',39)])[0];
 assert.equal(x.status,'Muestra insuficiente');assert.ok(x.confidence<30);
});
test('Costos y devoluciones se amortizan entre entregas reales',()=>{
 const x=M.economics({price:29990,cost:9000,shipping:4000,fee:500,reserve:0,cpaPerOrder:3500,rejectCost:3000,deliveryRate:.75,target:10000});
 assert.equal(x.valid,true);
 assert.equal(x.preAds,16490);assert.ok(Math.abs(x.perDelivered-10823.333333)<.01);
 assert.equal(x.maxCpaPerOrder,4117.5);assert.equal(x.passes,true);
});
test('Sin costos verdaderos o tasa de entrega no crea margen ficticio',()=>{
 assert.equal(M.economics({price:'',cost:4000,shipping:0,fee:0,reserve:0,cpaPerOrder:0,rejectCost:0,deliveryRate:.75}).valid,false);
 assert.equal(M.economics({price:20000,cost:5000,shipping:0,fee:0,reserve:0,cpaPerOrder:0,rejectCost:0,deliveryRate:0}).valid,false);
});
test('La interfaz conserva advertencias, formato español y no ejecuta scraping',()=>{
 assert.match(html,/caída de inventario ≠ venta confirmada/);
 assert.match(html,/Importar CSV/);
 assert.match(html,/Simulador COD/);
 assert.match(app,/textContent/);
 assert.doesNotMatch(app,/fetch\(|XMLHttpRequest|sendBeacon/);
});

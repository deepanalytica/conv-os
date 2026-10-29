import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/radar/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function core(){assert.ok(script);const prefix=script.slice(0,script.indexOf('const $=q=>'));const context={URL,URLSearchParams};vm.createContext(context);vm.runInContext(prefix+ '\nglobalThis.tests = {economics,scoreProduct,parseCSV,importCSV,exportCSV,SEED_PRODUCTS,safeUrl};',context);return context.tests;}
test('Standalone radar has live DOM and inline application',()=>{assert.match(html,/id="view"/);assert.match(html,/id="productForm"/);assert.match(html,/Tu ventaja empieza con los datos/);assert.ok(script.length>15000);});
test('Unit economics includes risk reserve',()=>{const {economics}=core();const e=economics({price:22990,cost:6100,shipping:5000,fee:1000,cpa:3000,rejectRate:10,rejectCost:3000,taxReserve:1000});assert.equal(e.contribution,6590);assert.equal(e.limitCPA,9590);});
test('Evidence penalizes unverifiable opportunities',()=>{const {scoreProduct,SEED_PRODUCTS}=core();const p={...SEED_PRODUCTS[0]};const low=scoreProduct(p).score;p.evidence=5;assert.ok(scoreProduct(p).score>low);});
test('CSV safely quotes data',()=>{const {importCSV,exportCSV,SEED_PRODUCTS}=core();const a=importCSV('nombre,costo,precio\n"Bolso, magnético",6100,22990');assert.equal(a[0].name,'Bolso, magnético');assert.ok(exportCSV([{...SEED_PRODUCTS[0],name:'=HYPERLINK(1)'}]).includes("'=HYPERLINK(1)"));});
test('Javascript URLs are not accepted',()=>{const {safeUrl}=core();assert.equal(safeUrl('javascript:alert(1)'),'');});
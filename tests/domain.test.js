import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTransition,totalInCents,deliveryFee} from '../src/domain.js';
import {assertCrmTransition,amountInCents} from '../src/crm.js';
test('totales calculados en centavos, nunca por IA',()=>{
 assert.equal(totalInCents([{productId:'a',qty:2}],[{id:'a',priceCents:19900,available:1}]),39800);
 assert.throws(()=>totalInCents([{productId:'a',qty:0}],[{id:'a',priceCents:19900,available:1}]),/Cantidad/);
 assert.throws(()=>totalInCents([{productId:'a',qty:1}],[]),/disponible/);
});
test('pagos requieren verificación',()=>{
 assert.throws(()=>assertTransition('awaiting_payment','paid'),/confirmación/);
 assert.equal(assertTransition('awaiting_payment','paid',{paymentVerified:true}),true);
 assert.throws(()=>assertTransition('awaiting_payment','completed'),/Transición/);
});
test('reparto exige distancia válida y cobertura',()=>{
 assert.equal(deliveryFee(2),120000);
 assert.equal(deliveryFee(4),190000);
 assert.throws(()=>deliveryFee(22),/cobertura/);
});

test('el embudo comercial valida etapas y estimaciones',()=>{
 assert.equal(assertCrmTransition('new','qualified'),true);
 assert.equal(assertCrmTransition('proposal','won'),true);
 assert.throws(()=>assertCrmTransition('new','won'),/Transición comercial/);
 assert.throws(()=>assertCrmTransition('won','qualified'),/Transición comercial/);
 assert.equal(amountInCents(1999000),1999000);
 assert.throws(()=>amountInCents(-1),/Importe estimado/);
 assert.throws(()=>amountInCents(19.99),/Importe estimado/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../public/bolso-magnetico/index.html',import.meta.url),'utf8');
const svg=readFileSync(new URL('../public/bolso-magnetico/assets/producto-conceptual.svg',import.meta.url),'utf8');
test('Producto mono-producto, CTA y FAQ están en HTML',()=>{
 for(const v of ['id="hero-title"','id="producto"','id="buy-button"','id="order-dialog"','id="qty-plus"','id="shipping-region"','id="preguntas"'])assert.ok(html.includes(v),`Falta ${v}`);
 assert.ok((html.match(/<details>/g)||[]).length>=4);
});
test('La vista previa no habilita venta ficticia ni indexación',()=>{
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/whatsappE164:''/);
 assert.match(html,/priceConfirmed:false,stockConfirmed:false/);
 assert.match(html,/PRECIO REFERENCIAL/);
 assert.match(html,/No cobramos en esta página/);
 assert.doesNotMatch(html,/\b(?:stripe\.com|checkout\.mercadopago|payment-intent)\b/i);
});
test('Ilustración conceptual disponible y explícita',()=>{
 assert.ok(svg.includes('Ilustración conceptual'));
 assert.match(svg,/<svg/);
 assert.match(html,/assets\/producto-conceptual\.svg/);
});
test('Flujo de consulta no usa fake checkout ni envía datos sin contacto',()=>{
 assert.match(html,/function orderMessage\(\)/);
 assert.match(html,/function updateOrderLink\(\)/);
 assert.match(html,/const checkPhone/);
 assert.match(html,/function openDialog\(\)/);
 assert.match(html,/id="copy-order"/);
});
export const STATES=['draft','awaiting_payment','paid','in_progress','ready','out_for_delivery','completed','cancelled'];
const transitions={
 draft:['awaiting_payment','cancelled'],
 awaiting_payment:['paid','cancelled'],
 paid:['in_progress','cancelled'],
 in_progress:['ready','cancelled'],
 ready:['out_for_delivery','completed'],
 out_for_delivery:['completed'],
 completed:[],cancelled:[]
};
export function assertTransition(previous,next,{paymentVerified=false}={}){
 if(!STATES.includes(next)||!transitions[previous]?.includes(next))throw Error('Transición de estado no permitida');
 if(next==='paid'&&!paymentVerified)throw Error('Pago requiere confirmación verificable del proveedor');
 return true;
}
export function totalInCents(items,catalog){
 if(!Array.isArray(items)||!items.length)throw Error('Pedido vacío');
 return items.reduce((total,item)=>{
  const p=catalog.find(x=>x.id===item.productId);
  if(!p||!p.available)throw Error('Producto no disponible');
  if(!Number.isInteger(item.qty)||item.qty<1||item.qty>99)throw Error('Cantidad inválida');
  return total+p.priceCents*item.qty;
 },0);
}
export function deliveryFee(distanceKm,{includedKm=2,baseCents=120000,additionalCents=35000,maxKm=8}={}){
 if(!Number.isFinite(distanceKm)||distanceKm<0||distanceKm>maxKm)throw Error('Fuera de cobertura o distancia inválida');
 return baseCents+Math.ceil(Math.max(0,distanceKm-includedKm))*additionalCents;
}

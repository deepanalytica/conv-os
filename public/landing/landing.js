const cases={
food:{tag:"GASTRONOMÍA / PEDIDOS",title:"Viernes por la noche.<br>Que ningún pedido se pierda.",description:"Recibe solicitudes, confirma cantidades, registra el pago y organiza preparación y despacho.",message:"“Hola, quiero dos promociones con delivery.”",operation:"Pedido con dos productos",state:"Pago pendiente · Cocina por confirmar"},
services:{tag:"SERVICIOS TÉCNICOS / COTIZACIONES",title:"De la consulta<br>al trabajo confirmado.",description:"Registra solicitudes, identifica qué falta para cotizar y acompaña al cliente durante la ejecución.",message:"“Necesito una visita técnica. ¿Tienen horas esta semana?”",operation:"Solicitud de visita técnica",state:"Cotización pendiente · Agenda por confirmar"},
wholesale:{tag:"DISTRIBUCIÓN / PEDIDOS",title:"Reposiciones sin<br>trabajo duplicado.",description:"Estructura solicitudes recurrentes, valida productos y organiza cobros y despachos.",message:"“Mándame tres cajas más, como la semana pasada.”",operation:"Orden de reposición",state:"Productos por validar · Orden pendiente"}
};
const one=s=>document.querySelector(s);
document.querySelectorAll(".sector-tab").forEach(btn=>btn.addEventListener("click",()=>{
 const item=cases[btn.dataset.sector];if(!item)return;
 document.querySelectorAll(".sector-tab").forEach(x=>{x.classList.toggle("active",x===btn);x.setAttribute("aria-selected",String(x===btn))});
 one("#sectorTag").textContent=item.tag;
 one("#sectorTitle").innerHTML=item.title;
 one("#sectorDescription").textContent=item.description;
 one("#sectorMessage").textContent=item.message;
 one("#sectorOperation").textContent=item.operation;
 one("#sectorState").textContent=item.state;
}));
one("#menuButton")?.addEventListener("click",()=>{
 const menu=one("#menuMobile"),next=menu.hidden;
 menu.hidden=!next;
 one("#menuButton").setAttribute("aria-expanded",String(next));
 one("#menuButton").textContent=next?"×":"☰";
});
document.querySelectorAll("#menuMobile a").forEach(a=>a.addEventListener("click",()=>{
 one("#menuMobile").hidden=true;one("#menuButton").setAttribute("aria-expanded","false");one("#menuButton").textContent="☰";
}));

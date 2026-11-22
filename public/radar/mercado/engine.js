/* Deep Radar — Motor de inteligencia de inventario. Implementación propia.
   IMPORTANTE: una caída de stock NO demuestra una venta. No usa endpoints privados. */
(function (root) {
  'use strict';
  const DAY=86400000;
  const COLS={
    fecha:'date',date:'date',dia:'date',
    id_producto:'product_id',producto_id:'product_id',product_id:'product_id',sku:'product_id',
    proveedor:'supplier_id',id_proveedor:'supplier_id',supplier_id:'supplier_id',
    nombre:'name',producto:'name',product_name:'name',name:'name',
    stock:'stock',existencias:'stock',inventario:'stock',
    fuente:'source_url',source_url:'source_url',url:'source_url'
  };
  const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_');
  const num=x=>Number(x);
  const money=x=>Number.isFinite(num(x))&&num(x)>=0?num(x):NaN;
  function utc(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
    const n=Date.parse(date+'T00:00:00Z');
    return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date?n:NaN;
  }
  function safeUrl(s){
    if(!s)return '';
    try{const u=new URL(String(s));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
  }
  function parseRows(csv){
    const raw=String(csv||'').replace(/^\uFEFF/,'');
    if(raw.length>3_000_000)throw Error('Archivo demasiado grande (máximo 3 MB).');
    const first=raw.split(/\r?\n/,1)[0]||'';
    const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
    const out=[];let row=[],value='',quoted=false;
    for(let i=0;i<raw.length;i++){
      const c=raw[i],next=raw[i+1];
      if(c==='"'){if(quoted&&next==='"'){value+='"';i++;}else quoted=!quoted;}
      else if(c===sep&&!quoted){row.push(value);value='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i++;row.push(value);value='';if(row.some(x=>x.trim()))out.push(row);row=[];}
      else value+=c;
    }
    if(quoted)throw Error('CSV con comillas sin cerrar.');
    row.push(value);if(row.some(x=>x.trim()))out.push(row);
    if(out.length>40001)throw Error('Máximo 40.000 filas por importación.');
    return out;
  }
  function parseCSV(csv,options={}){
    const rows=parseRows(csv);
    if(rows.length<2)throw Error('El CSV debe tener encabezado y al menos una observación.');
    const headers=rows.shift().map(x=>COLS[norm(x)]||'');
    for(const field of ['date','product_id','supplier_id','stock']){
      if(!headers.includes(field))throw Error('Falta la columna '+field+'.');
    }
    if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('Columnas repetidas.');
    const maxDate=utc(options.today||new Date().toISOString().slice(0,10));
    if(!Number.isFinite(maxDate))throw Error('Fecha de referencia inválida.');
    const items=[],errors=[],seen=new Set();
    rows.forEach((row,i)=>{
      try{
        const item={};
        for(let j=0;j<headers.length;j++)if(headers[j])item[headers[j]]=String(row[j]||'').trim();
        const date=utc(item.date),stock=num(item.stock);
        if(!Number.isFinite(date)||date>maxDate)throw Error('Fecha imposible o futura');
        if(!item.product_id||!item.supplier_id||item.product_id.length>120||item.supplier_id.length>120)throw Error('ID faltante o muy largo');
        if(!Number.isSafeInteger(stock)||stock<0||stock>1_000_000_000)throw Error('Stock inválido');
        const key=JSON.stringify([item.product_id,item.supplier_id,item.date]);
        if(seen.has(key))throw Error('Observación duplicada');
        seen.add(key);
        if(item.source_url&&!safeUrl(item.source_url))throw Error('URL no permitida');
        items.push({date:item.date,product_id:item.product_id,supplier_id:item.supplier_id,stock,name:(item.name||item.product_id).slice(0,140),source_url:safeUrl(item.source_url)});
      }catch(e){errors.push({line:i+2,error:e.message});}
    });
    if(!items.length)throw Error('No hay observaciones válidas. '+(errors[0]?.error||''));
    return {items,errors,count:items.length};
  }
  function analyze(items){
    if(!Array.isArray(items))throw Error('Se requiere un historial.');
    const buckets=new Map();
    for(const x of items){
      if(!x||!Number.isSafeInteger(x.stock)||x.stock<0||!Number.isFinite(utc(x.date))||!x.product_id||!x.supplier_id)continue;
      const key=JSON.stringify([x.product_id,x.supplier_id]);
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(x);
    }
    const ranked=[];
    for(const [key,list] of buckets){
      const data=new Map();
      for(const x of list)data.set(x.date,x);
      const s=[...data.values()].sort((a,b)=>a.date.localeCompare(b.date));
      const last=utc(s[s.length-1].date);
      const changes=[],flags=[];
      for(let i=1;i<s.length;i++){
        const prev=s[i-1],cur=s[i],gap=(utc(cur.date)-utc(prev.date))/DAY;
        if(gap!==1){flags.push('Saltos en las fechas: no se infiere movimiento entre días separados.');continue;}
        const diff=prev.stock-cur.stock;
        const age=(last-utc(cur.date))/DAY;
        let movement=0,type='sin_cambio';
        if(diff<0){type='reposicion';flags.push('Reposición o corrección de stock detectada.');}
        else if(diff>0){
          if(prev.stock>=20&&diff/prev.stock>=.8){type='anomalia';flags.push('Caída brusca de inventario: requiere revisión.');}
          else{type='descenso';movement=diff;}
        }
        changes.push({date:cur.date,age,movement,type,from:prev.stock,to:cur.stock});
      }
      const recent=changes.filter(x=>x.age>=0&&x.age<7);
      const previous=changes.filter(x=>x.age>=7&&x.age<14);
      const fortnight=changes.filter(x=>x.age>=0&&x.age<14);
      const total=a=>a.reduce((n,x)=>n+x.movement,0);
      const current=total(recent),prior=total(previous),total14=total(fortnight);
      const active=fortnight.filter(x=>x.movement>0).length;
      const peak=total14?Math.max(...fortnight.map(x=>x.movement))/total14:0;
      const reliablePairs=fortnight.filter(x=>x.type!=='anomalia'&&x.type!=='reposicion').length;
      const coverage=Math.min(1,reliablePairs/14);
      const sources=new Set(s.filter(x=>x.source_url).map(x=>x.source_url));
      const provenance=sources.size?1:.65;
      const confidence=Math.round(coverage*provenance*100);
      const growth=prior>0?(current-prior)/prior:current>0?null:0;
      const consistency=fortnight.length?active/fortnight.length:0;
      const volume=Math.min(100,Math.log1p(total14)/Math.log1p(100)*100);
      const trend=prior>0?Math.min(100,Math.max(0,50+50*growth)):current>0?45:0;
      const oneDayFlag=total14>=20&&peak>=.6;
      const provisional=Math.round((.25*volume+.3*consistency*100+.25*trend+.2*(1-peak)*100)*coverage*provenance);
      const score=oneDayFlag?Math.min(provisional,49):provisional;
      const status=reliablePairs<7?'Muestra insuficiente':oneDayFlag?'Pico aislado':active<3?'Demanda por verificar':score>=60?'Vigilar aceleración':'Investigar';
      ranked.push({key,product_id:s[0].product_id,supplier_id:s[0].supplier_id,name:s[s.length-1].name||s[0].name,
        observations:s.length,lastDate:s[s.length-1].date,lastStock:s[s.length-1].stock,dates:s.map(x=>x.date),
        movement7:current,movementPrevious7:prior,movement14:total14,activeDays:active,
        analyzedPairs:reliablePairs,peakConcentration:peak,oneDayFlag,growth,confidence,score,status,
        flags:[...new Set(flags)],sources:[...sources],changes});
    }
    return ranked.sort((a,b)=>b.score-a.score||b.movement14-a.movement14);
  }
  function economics(p={}){
    const price=money(p.price),cost=money(p.cost),shipping=money(p.shipping),
          fee=money(p.fee),reserve=money(p.reserve),
          cpa=money(p.cpaPerOrder),rejectCost=money(p.rejectCost),
          target=money(p.target??10000),deliveryRate=num(p.deliveryRate);
    if([price,cost,shipping,fee,reserve,cpa,rejectCost,target].some(x=>!Number.isFinite(x))||
       price<=0||cost<=0||!Number.isFinite(deliveryRate)||deliveryRate<=0||deliveryRate>1)
      return {valid:false,message:'Completa costos reales y tasa de entrega (entre 1 y 100%).'};
    const preAds=price-cost-shipping-fee-reserve;
    const expectedPerOrder=deliveryRate*preAds-(1-deliveryRate)*rejectCost-cpa;
    const perDelivered=expectedPerOrder/deliveryRate;
    const maxCpaPerOrder=deliveryRate*(preAds-target)-(1-deliveryRate)*rejectCost;
    return {valid:true,preAds,expectedPerOrder,perDelivered,maxCpaPerOrder,
      marginPerDelivered:perDelivered/price*100,target,passes:perDelivered>=target,deliveryRate,
      scenarios:[.6,.7,.8,.9].map(rate=>({rate,perDelivered:(rate*preAds-(1-rate)*rejectCost-cpa)/rate}))};
  }
  root.MarketIntel={parseCSV,analyze,economics,parseRows,safeUrl};
})(typeof window!=='undefined'?window:globalThis);

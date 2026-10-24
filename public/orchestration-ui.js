// PRAXIOS-inspired local deterministic operations console.
// "Execute" here means evaluate local rules, never perform external side effects.
function getDemoRecords(tenant){
 try{const d=JSON.parse(localStorage.getItem('conv-os-crm-v1')||'{}');
  if(!Array.isArray(d.opportunities))return {opportunities:[],contacts:[],followups:[]};
  return {opportunities:d.opportunities.filter(o=>o.tenant_id===tenant),
   contacts:(d.contacts||[]).filter(c=>c.tenant_id===tenant),
   followups:(d.followups||[]).filter(f=>f.tenant_id===tenant)};
 }catch{return {opportunities:[],contacts:[],followups:[]}}
}
function demoQueue(tenant){
 const key='acquisition-os-rule-review-v1';
 let stored;
 try{stored=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(stored))stored=[]}catch{stored=[]}
 return {stored,save(next){try{localStorage.setItem(key,JSON.stringify(next))}catch{}}}
}
function rulesPreview(d){
 const byContact=new Map(d.contacts.map(c=>[c.id,c]));
 const open=d.opportunities.filter(o=>!['won','lost'].includes(o.stage));
 const rows=[];
 const now=Date.now();
 for(const opp of open){
  const tasks=d.followups.filter(t=>t.opportunity_id===opp.id&&t.status==='open');
  const contact=byContact.get(opp.contact_id);
  for(const task of tasks){
   if(Date.parse(task.due_at)>=now)continue;
   rows.push({rule_id:'OVERDUE_FOLLOWUP',subject_id:task.id,opportunity_id:opp.id,
    title:'Seguimiento vencido: '+(contact?.name||'Contacto'),severity:'critical',explanation:'Revisar seguimiento y nueva fecha'});
  }
  if(!tasks.length)rows.push({rule_id:'OPEN_WITHOUT_FOLLOWUP',subject_id:opp.id,opportunity_id:opp.id,
   title:'Sin próxima acción: '+(contact?.name||'Contacto'),severity:'attention',explanation:'Crear seguimiento manual'});
  if(now-Date.parse(opp.updated_at)>=7*86400000)rows.push({rule_id:'STALLED_OPPORTUNITY',subject_id:opp.id,opportunity_id:opp.id,
   title:'Oportunidad detenida: '+(contact?.name||'Contacto'),severity:'attention',explanation:'Sin cambio en siete días'});
 }
 return rows;
}
export async function activateOrchestration({tenant,api,staticDemo,notify,escape,onNavigate}){
 const root=document.getElementById('orchestration-workspace');if(!root)return;
 const active=()=>root.isConnected&&document.getElementById('orchestration-workspace')===root;
 let queue=[],rules=null,run=null;
 async function load(){
  if(staticDemo){
   const {stored}=demoQueue(tenant);
   queue=stored.filter(q=>q.tenant_id===tenant);
   rules={entities:['Contact','Opportunity','Followup','Quote','Recommendation','RuleRun'],
    ontology_version:'acquisition-os.ontology.v1'};
  }else{
   const [q,o]=await Promise.all([api('/os/recommendations'),api('/os/ontology')]);
   queue=q.recommendations;rules=o;
  }
 }
 function render(){
  if(!active())return;
  const pending=queue.filter(q=>q.status==='pending_review');
  const critical=pending.filter(q=>q.severity==='critical');
  root.innerHTML=`<div class="prism-dashboard prism-orchestration">
    <section class="prism-banner prism-os-banner"><div class="prism-banner-orb orb-one"></div>
     <div class="prism-banner-copy">
      <span class="prism-eyebrow">GOBERNANZA / PRAXIOS + META-HARNESS</span>
      <h2>Una operación <em>bajo control.</em></h2>
      <p>El motor identifica riesgos comerciales, propone próximas acciones y conserva evidencia. Tú decides; el sistema no escribe ni envía mensajes a clientes.</p>
      <div class="prism-banner-chips"><span>✓ Reglas deterministas</span><span>✓ Revisión humana</span><span>✓ Aislamiento por empresa</span></div>
     </div><div class="prism-crystal" aria-hidden="true"><span class="prism-crystal-core"></span></div>
    </section>
    <div class="prism-command-row"><div><div class="prism-eyebrow">ORQUESTADOR LOCAL</div>
     <h3>Recomendaciones y decisiones</h3><p>Versión ${escape(rules.ontology_version||rules.ontologyVersion||'v1')} · sin capacidades externas</p></div>
     <button class="prism-action" id="prism-run-rules">◈ Evaluar oportunidades</button></div>
    <div class="prism-kpis">
     ${[['Pendientes',pending.length,'violet'],['Críticas',critical.length,'pink'],
      ['Revisadas',queue.length-pending.length,'green'],['Acciones externas',0,'sky']]
      .map(([label,value,tone])=>`<div class="prism-kpi prism-kpi-${tone}">
        <div class="prism-kpi-head"><span>${label}</span><span class="prism-kpi-icon">◇</span></div>
        <strong>${value}</strong><div class="prism-kpi-foot">Estado local documentado</div></div>`).join('')}
    </div>
    <div class="prism-analysis-grid">
     <section class="prism-panel prism-run-list"><div class="prism-panel-head"><div><span class="prism-eyebrow">COLA DE REVISIÓN</span>
       <h3>Decisiones propuestas</h3></div><button class="prism-text-link" type="button" data-os-nav="crm">Volver al CRM ↗</button></div>
       ${pending.length?pending.map(rec=>`<article class="prism-reco">
        <div><span class="prism-reco-level ${rec.severity}">${rec.severity==='critical'?'ALTA PRIORIDAD':'ATENCIÓN'}</span>
        <strong>${escape(rec.title)}</strong><p>${escape(rec.explanation)}</p>
        <span class="prism-reco-rule">${escape(rec.rule_id)}</span></div>
        <div class="prism-reco-actions"><button type="button" data-review="acknowledged" data-id="${escape(rec.id)}">Entendido</button>
         <button type="button" data-review="dismissed" data-id="${escape(rec.id)}">Descartar</button></div>
       </article>`).join(''):'<div class="prism-empty"><span>◈</span><strong>Sin decisiones pendientes</strong><p>Evalúa las reglas para detectar seguimientos y oportunidades que necesitan atención.</p></div>'}
       ${run?`<div class="prism-run-result">Última evaluación: ${run.created} nuevas recomendaciones, ${run.candidates} condiciones detectadas. ${run.replayed?'Ejecución repetida sin duplicación.':''}</div>`:''}
     </section>
     <section class="prism-panel prism-rules"><div class="prism-panel-head"><div><span class="prism-eyebrow">ONTOLOGÍA Y CONTROL</span>
      <h3>Reglas activas</h3></div><span class="prism-subchip">Sin IA autónoma</span></div>
      ${[
       ['OVERDUE_FOLLOWUP','Seguimiento vencido','Alta prioridad'],
       ['OPEN_WITHOUT_FOLLOWUP','Oportunidad sin próxima acción','Revisar'],
       ['STALLED_OPPORTUNITY','Sin cambios durante 7 días','Revisar']
      ].map(([id,title,label])=>`<div class="prism-rule">
       <span class="prism-rule-icon">◇</span><div><strong>${escape(title)}</strong><small>${escape(id)}</small></div>
       <span class="prism-rule-tag">${escape(label)}</span></div>`).join('')}
      <div class="prism-note">El orquestador no confirma pagos, modifica etapas, envía mensajes ni ejecuta campañas.</div>
     </section>
    </div>
    <div class="prism-panel prism-governance"><span class="prism-eyebrow">GATES</span>
     <h3>Autonomía responsable</h3>
     <div class="prism-governance-steps">
       <div><span>01</span><strong>Observar</strong><p>Leer solo registros del tenant activo.</p></div>
       <div><span>02</span><strong>Evaluar</strong><p>Aplicar reglas deterministas comprobables.</p></div>
       <div><span>03</span><strong>Proponer</strong><p>Guardar recomendaciones y auditoría.</p></div>
       <div><span>04</span><strong>Validar</strong><p>Revisión humana; sin efectos externos.</p></div>
     </div>
    </div>
   </div>`;
 }
 async function refresh(){try{await load();render()}catch(e){if(active())root.textContent='No se pudo cargar: '+e.message}}
 root.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn)return;
  const nav=btn.dataset.osNav;if(nav){onNavigate(nav);return}
  if(btn.id==='prism-run-rules'){
   btn.disabled=true;
   try{
    if(staticDemo){
     const d=demoQueue(tenant),old=d.stored.filter(x=>x.tenant_id===tenant);
     const candidate=rulesPreview(getDemoRecords(tenant));
     let created=0;
     for(const item of candidate){
      if(old.some(x=>x.rule_id===item.rule_id&&x.subject_id===item.subject_id))continue;
      d.stored.push({...item,id:crypto.randomUUID(),tenant_id:tenant,status:'pending_review',
       first_detected_at:new Date().toISOString()});created++;
     }
     d.save(d.stored);run={candidates:candidate.length,created,replayed:false};
    }else{
     const response=await api('/os/orchestrate','POST',{idempotency_key:crypto.randomUUID()});
     run=response.run;
    }
    await refresh();notify('Evaluación local terminada; ninguna acción externa');
   }catch(err){notify(err.message);btn.disabled=false}
  }
  if(btn.dataset.review){
   const id=btn.dataset.id,decision=btn.dataset.review;btn.disabled=true;
   try{
    if(staticDemo){
     const d=demoQueue(tenant),rec=d.stored.find(x=>x.id===id&&x.tenant_id===tenant&&x.status==='pending_review');
     if(!rec)throw Error('Revisión inexistente');rec.status=decision;d.save(d.stored);
    }else await api('/os/recommendations/'+encodeURIComponent(id)+'/review','POST',{decision});
    await refresh();notify('Decisión guardada en el registro local');
   }catch(err){notify(err.message);btn.disabled=false}
  }
 });
 await refresh();
}

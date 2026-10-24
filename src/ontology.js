// Acquisition OS ontology v1: one canonical vocabulary for API, workflows and UI.
// This is a deterministic domain contract, not an AI classifier or authorization grant.
export const ONTOLOGY_VERSION='acquisition-os.ontology.v1';
export const DOMAIN={
 Organization:{identity:['tenant_id'],scope:'strict',description:'Isolated commercial workspace'},
 Contact:{identity:['tenant_id','contact_id'],scope:'strict',relationship:'Organization -> Contact'},
 Opportunity:{identity:['tenant_id','opportunity_id'],relationship:'Contact -> Opportunity',states:['new','qualified','proposal','negotiation','won','lost']},
 Followup:{identity:['tenant_id','followup_id'],relationship:'Opportunity -> Followup',states:['open','completed']},
 Quote:{identity:['tenant_id','quote_id'],relationship:'Opportunity -> Quote',states:['draft']},
 ChannelEvent:{identity:['tenant_id','event_hash'],relationship:'ChannelAccount -> ChannelEvent',content:'metadata_only'},
 ConsentReceipt:{identity:['tenant_id','receipt_id'],relationship:'Contact -> ConsentReceipt',verified:false},
 Recommendation:{identity:['tenant_id','recommendation_id'],relationship:'Opportunity -> Recommendation',states:['pending_review','acknowledged','dismissed']},
 RuleRun:{identity:['tenant_id','run_id'],relationship:'Organization -> RuleRun',states:['completed','failed']}
};
export const RULES=Object.freeze({
 OVERDUE_FOLLOWUP:{id:'OVERDUE_FOLLOWUP',severity:'critical',entity:'Followup',
  explanation:'Seguimiento abierto cuyo vencimiento ya pasó',action:'review_followup'},
 OPEN_WITHOUT_FOLLOWUP:{id:'OPEN_WITHOUT_FOLLOWUP',severity:'attention',entity:'Opportunity',
  explanation:'Oportunidad activa sin tarea abierta',action:'schedule_followup'},
 STALLED_OPPORTUNITY:{id:'STALLED_OPPORTUNITY',severity:'attention',entity:'Opportunity',
  explanation:'Oportunidad activa sin cambios por 7 días o más',action:'review_opportunity'}
});
export const OPERATING_CAPABILITIES=Object.freeze({
 'read.analytics':{mode:'local_read',approval:false,effects:[]},
 'run.deterministic_rules':{mode:'local_write',approval:true,effects:['recommendation','audit']},
 'review.recommendation':{mode:'local_write',approval:true,effects:['recommendation_status','audit']},
 'send.message':{mode:'unavailable',approval:true,effects:[]},
 'spend.advertising':{mode:'unavailable',approval:true,effects:[]},
 'verify.payment':{mode:'unavailable',approval:true,effects:[]},
 'move.whatsapp_number':{mode:'unavailable',approval:true,effects:[]}
});
export const EXTERNAL_STATUSES=Object.freeze({NOT_CONNECTED:'NOT_CONNECTED',CONNECTED:'VERIFIED_PROVIDER_REQUIRED'});
export function commercialKnowledge(){
 return {
  ontology_version:ONTOLOGY_VERSION,entities:DOMAIN,rule_catalog:RULES,
  capabilities:OPERATING_CAPABILITIES,
  invariants:[
   'tenant required for all reads and mutations',
   'opportunity won is not a verified payment',
   'a draft quote is not realized revenue',
   'no inferred consent, provider identities or attribution',
   'missing marketing spend means CAC and ROAS unknown',
   'an autonomous rule never sends, pays, publishes or deploys',
   'all external capabilities require separate authenticated integrations'
  ]
 };
}

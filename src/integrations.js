// Connection readiness, not OAuth. No local credentials and no forged CONNECTED status.
// Meta authorization belongs to a future verified HTTPS OAuth flow with owner consent.
export const CHANNELS=Object.freeze([
 {id:'instagram',name:'Instagram Direct',platform:'Meta',permissions:['instagram_business_basic','instagram_business_manage_messages'],account:'Instagram professional account',onboarding:'Instagram Login'},
 {id:'messenger',name:'Facebook Messenger',platform:'Meta',permissions:['pages_show_list','pages_messaging','pages_manage_metadata'],account:'Facebook Page',onboarding:'Facebook Login'},
 {id:'whatsapp',name:'WhatsApp Business',platform:'Meta',permissions:['whatsapp_business_management','whatsapp_business_messaging'],account:'WhatsApp Business Account',onboarding:'Embedded Signup with coexistence evaluation'}
]);
export function connectionStatus(env={}){
 const configured={
  metaApp:typeof env.META_APP_ID==='string'&&env.META_APP_ID.length>0,
  gateway:typeof env.META_WEBHOOK_GATEWAY_URL==='string'&&/^https:\/\//.test(env.META_WEBHOOK_GATEWAY_URL),
  appReview:env.META_APP_REVIEW_APPROVED==='true',
  coexistenceEligibility:'NOT_VERIFIED'
 };
 return {
  mode:'LABORATORY',
  server:'LOCAL_ONLY',
  outbound_enabled:false,
  inbound_enabled:false,
  real_accounts_connected:0,
  configured,
  channels:CHANNELS.map(c=>({
   id:c.id,name:c.name,onboarding:c.onboarding,account:c.account,
   permissions:c.permissions,status:'NOT_CONNECTED',can_connect_from_localhost:false,
   last_verified_at:null,detail:'No OAuth authorization or signed account binding has been validated.'
  }))
 };
}
export async function handleIntegrations({req,res,path,json}){
 if(req.method==='GET'&&path==='/api/integrations/status'){
  json(res,200,connectionStatus(process.env));return true;
 }
 return false;
}

/* Shared light/dark appearance controller for static landing and dynamic workspace. */
(()=>{const key="conversation-ops-theme-v1";let stored=null;try{stored=localStorage.getItem(key)}catch{}
 document.documentElement.dataset.theme=stored==="light"?"light":"dark";
 const update=()=>document.querySelectorAll("[data-theme-toggle]").forEach(btn=>{const light=document.documentElement.dataset.theme==="light";btn.innerHTML=light?'◐ <span>Modo oscuro</span>':'☼ <span>Modo claro</span>';btn.setAttribute("aria-label",light?"Activar modo oscuro":"Activar modo claro");btn.setAttribute("aria-pressed",String(light))});
 document.addEventListener("click",e=>{const btn=e.target.closest("[data-theme-toggle]");if(!btn)return;const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem(key,next)}catch{}update()});
 new MutationObserver(update).observe(document.body||document.documentElement,{subtree:true,childList:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",update);else update();
})();
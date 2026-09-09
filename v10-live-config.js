/* JLG Project Lab 360 — live service defaults */
(()=>{
  const API='https://jlg-project-lab-360-api.jmercadier19.workers.dev';
  const sync=API+'/sync',ai=API+'/ai';
  try{
    if(!localStorage.getItem('jlg360_sync_endpoint'))localStorage.setItem('jlg360_sync_endpoint',sync);
    if(!localStorage.getItem('jlg360_ai_endpoint'))localStorage.setItem('jlg360_ai_endpoint',ai);
    if(typeof state!=='undefined'&&state.final){
      state.final.sync=state.final.sync||{};
      if(!state.final.sync.endpoint)state.final.sync.endpoint=sync;
      state.final.ai=state.final.ai||{};
      if(!state.final.ai.endpoint)state.final.ai.endpoint=ai;
    }
  }catch{}
  async function health(){try{const r=await fetch(API+'/health',{cache:'no-store'});if(!r.ok)throw new Error();const j=await r.json();window.__jlgLiveServices=j;const s=document.querySelector('#syncHealth');if(s&&j.sync){s.className='status ok';s.textContent='EN LIGNE'}const a=document.querySelector('#aiGatewayHealth');if(a&&j.ai){a.className='status ok';a.textContent='EN LIGNE'}}catch{window.__jlgLiveServices={ok:false}}}
  window.addEventListener('load',()=>setTimeout(health,900));
})();

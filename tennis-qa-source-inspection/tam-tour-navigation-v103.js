(()=>{'use strict';
const $=s=>document.querySelector(s);
let root=null,market=null,nativeRecruit=null,tourPanel=null,guard=false,watcher=null;
function repair(){
 if(guard)return;guard=true;
 try{
 const home=$('#tdAcademyView'),director=$('#td5Director'),tabs=director?.querySelector('.td5-tabs');
 if(!home||!director||!tabs)return;
 // Conserver les objets DOM originaux et leurs écouteurs lors des reconstructions V5.
 if(!market)market=$('#tamRecruit10');
 if(market&&!market.isConnected)home.append(market);
 if(!tourPanel)tourPanel=$('#tour103Panel');
 if(tourPanel&&!tourPanel.isConnected)director.append(tourPanel);
 if(!nativeRecruit)nativeRecruit=$('#tamRecruit10Tab');
 if(nativeRecruit&&!nativeRecruit.isConnected)tabs.append(nativeRecruit);
 if(!tabs.querySelector('#tour103Tab')&&window.TAM103?.open){
  const b=document.createElement('button');b.id='tour103Tab';b.type='button';b.textContent='Tournois internationaux';
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.TAM103.open()});tabs.append(b);
 }
 if(!tabs.querySelector('#tam101Recruit')&&window.TAM101?.open){
  const b=document.createElement('button');b.id='tam101Recruit';b.type='button';b.textContent='Recrutements';tabs.append(b);
 }
 tabs.querySelector('#tamRecruit10Tab')?.classList.add('tam101-hidden');
 for(const b of tabs.querySelectorAll('[data-tab="scout"],[data-tab="recruit"]'))b.classList.add('tam101-hidden');
 }finally{guard=false}
}
function recruit(){
 repair();
 let portal=$('#tamRecruit10'),trigger=$('#tamRecruit10Tab')||nativeRecruit;
 if(!portal&&market&&$('#tdAcademyView')){$('#tdAcademyView').append(market);portal=market;}
 if(portal?.hidden&&trigger)trigger.click();
 portal=$('#tamRecruit10');
 if(portal?.hidden)trigger?.click();
 portal?.querySelector('[data-screen="staff"]')?.click();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='tam101Recruit'){
  e.preventDefault();e.stopImmediatePropagation();recruit();return;
 }
 if(b.matches('#tour103Panel [data-exit]'))queueMicrotask(repair);
},true);
function watch(){
 if(document.body&&!watcher){
  watcher=new MutationObserver(repair);
  watcher.observe(document.body,{childList:true,subtree:true});
 }
 repair();
}
watch();
let attempts=0;const poll=setInterval(()=>{watch();if(++attempts>=45)clearInterval(poll)},360);
window.TAM103Navigation={status:()=>({tour:!!$('#tour103Tab'),staff:!!$('#tam101Recruit'),market:!!$('#tamRecruit10'),marketStaff:!!$('#tamRecruit10 #recJob'),restoredMarket:!!market?.isConnected})};
})();
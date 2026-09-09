/* JLG Project Lab 360 — V10.2 display + update repair */
(()=>{
  const VERSION='10.2.0';
  const LOGO192='./project-lab-logo-v10-192.png?v='+VERSION;
  const LOGO512='./project-lab-logo-v10-512.png?v='+VERSION;
  let refreshing=false;

  function notify(msg){try{if(typeof window.toast==='function')window.toast(msg);else console.info(msg)}catch{}}

  function setImage(img,src){
    if(!img)return;
    img.removeAttribute('srcset');
    img.src=src;
    img.style.objectFit='contain';
    img.style.objectPosition='center';
    img.style.display='block';
  }

  function repairBranding(){
    document.title='JLG Project Lab 360 — V10.2 Autonome';
    document.documentElement.dataset.projectLabVersion=VERSION;
    document.querySelectorAll('.brand-logo').forEach(i=>setImage(i,LOGO192));
    document.querySelectorAll('.hero-logo,.splash-card img,.logo-stage-media img,.brand-ribbon img,.dossier-brand img').forEach(i=>setImage(i,LOGO512));

    const vp=document.querySelector('.version-pill');
    if(vp)vp.textContent='V10.2';
    const small=document.querySelector('.brand small');
    if(small)small.textContent='V10.2 Autonome · sans compte, sans backend';
    const stage=document.querySelector('.logo-stage .eyebrow');
    if(stage)stage.textContent='JLG PROJECT LAB 360 · AUTONOME';
    const heroTest=document.querySelector('#heroTestBtn');
    if(heroTest)heroTest.textContent='Charger le projet test';
    document.querySelectorAll('.dossier-brand span').forEach(s=>s.textContent='Dossier d’ingénierie · V10.2');

    let favicon=document.querySelector('link[rel="icon"]');
    if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
    favicon.type='image/png';favicon.href=LOGO192;
    let apple=document.querySelector('link[rel="apple-touch-icon"]');
    if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';document.head.appendChild(apple)}
    apple.href=LOGO192;
    const manifest=document.querySelector('link[rel="manifest"]');
    if(manifest)manifest.href='./manifest.webmanifest?v='+VERSION;
  }

  async function hardUpdate(btn){
    if(refreshing)return;
    refreshing=true;
    if(btn){btn.disabled=true;btn.textContent='Mise à jour…'}
    if(!navigator.onLine){refreshing=false;if(btn){btn.disabled=false;btn.textContent='Actualiser'};notify('Connexion nécessaire pour actualiser');return}
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const reg of regs){
          try{await reg.update()}catch{}
          try{await reg.unregister()}catch{}
        }
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/jlg-project-lab-360/i.test(k)).map(k=>caches.delete(k)));
      }
    }catch(e){console.warn('JLG hard update',e)}
    const u=new URL(location.href);
    u.searchParams.set('v',VERSION);
    u.searchParams.set('_maj',Date.now().toString());
    location.replace(u.toString());
  }

  function wireUpdateBanner(){
    const banner=document.querySelector('#updateBanner');
    if(banner){
      banner.querySelectorAll('button').forEach(btn=>{
        if(/actualiser|mettre à jour|mise à jour/i.test(btn.textContent||'')){
          btn.onclick=e=>{e.preventDefault();hardUpdate(btn)};
        }
      });
      if(new URL(location.href).searchParams.get('v')===VERSION){
        setTimeout(()=>banner.classList.add('hidden'),900);
      }
    }
    document.addEventListener('click',e=>{
      const btn=e.target.closest?.('button,a');
      if(!btn)return;
      const label=(btn.textContent||'').trim();
      const inBanner=btn.closest?.('#updateBanner')||/nouvelle version/i.test(btn.parentElement?.parentElement?.textContent||'');
      if(inBanner&&/actualiser|mettre à jour/i.test(label)){
        e.preventDefault();e.stopImmediatePropagation();hardUpdate(btn);
      }
    },true);
  }

  async function refreshRegistration(){
    if(!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js?v='+VERSION);
      await reg.update();
    }catch(e){console.warn('JLG SW update',e)}
  }

  function init(){
    repairBranding();
    wireUpdateBanner();
    refreshRegistration();
    setTimeout(repairBranding,250);
    setTimeout(repairBranding,900);
  }
  init();
})();

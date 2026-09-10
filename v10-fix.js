/* JLG Project Lab 360 — V10.9 shell stabilization */
(()=>{
  const VERSION='10.9.0';
  const SVG='./project-lab-logo-v10.svg?v='+VERSION;
  const $=s=>document.querySelector(s);
  const nativeAndroid=/JLGProjectLabAndroid/i.test(navigator.userAgent||'') || new URLSearchParams(location.search).get('source')==='android-app';
  function branding(){
    document.title='JLG Project Lab 360 — V10.9';
    document.documentElement.dataset.projectLabVersion=VERSION;
    if(nativeAndroid)document.documentElement.classList.add('native-android');
    const v=$('.version-pill');if(v)v.textContent='V10.9';
    const small=$('.brand small');if(small)small.textContent=nativeAndroid?'V10.9 Android · interactions & PDF':'V10.9 Autonome · interactions & PDF';
    const eye=$('.logo-stage .eyebrow');if(eye&&eye.textContent!=='JLG PROJECT LAB 360 · V10.9')eye.textContent='JLG PROJECT LAB 360 · V10.9';
    document.querySelectorAll('.brand-logo,.hero-logo,.splash-card img,.logo-stage-media img,.brand-ribbon img,.dossier-brand img').forEach(img=>{if(img.getAttribute('src')!==SVG)img.setAttribute('src',SVG);img.removeAttribute('srcset');img.style.objectFit='contain';img.style.objectPosition='center';img.style.display='block'});
    const favicon=document.querySelector('link[rel="icon"]');if(favicon){favicon.type='image/svg+xml';favicon.href=SVG}
    const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+VERSION;
  }
  function unlockUi(){
    document.documentElement.style.overflow='';document.documentElement.style.touchAction='';
    document.body.style.overflow='';document.body.style.touchAction='pan-y';document.body.style.pointerEvents='auto';
    document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
    const splash=$('#splash');if(splash){splash.style.pointerEvents='none';splash.classList.add('hide');setTimeout(()=>splash.remove(),550)}
  }
  branding();unlockUi();setTimeout(()=>{branding();unlockUi()},300);setTimeout(()=>{branding();unlockUi()},1100);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v='+VERSION).then(r=>r.update()).catch(()=>{});
})();

/* V10.6 Standalone loader — stable shell + validated V5→V10 core. */
(()=>{
  const VERSION='10.6.0';
  const SVG='./project-lab-logo-v10.svg?v='+VERSION;
  const $=s=>document.querySelector(s);

  // Fail-safe first: never allow a visual layer or stale style to freeze the app.
  document.documentElement.style.overflow='';
  document.documentElement.style.touchAction='';
  document.body.style.overflow='';
  document.body.style.touchAction='pan-y';
  document.body.style.pointerEvents='auto';
  document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
  const splash=$('#splash');
  if(splash){
    splash.style.pointerEvents='none';
    setTimeout(()=>{splash.classList.add('hide');setTimeout(()=>splash.remove(),500)},850);
  }

  document.querySelectorAll('.brand-logo,.hero-logo,.splash-card img').forEach(img=>{
    img.src=SVG;img.style.objectFit='contain';img.style.display='block';
  });
  const version=$('.version-pill');if(version)version.textContent='V10.6';
  const small=$('.brand small');if(small)small.textContent='V10.6 Autonome · sans compte, sans backend';

  const load=src=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;
    document.head.appendChild(s);
  });

  load('./v5-2-core.js?v='+VERSION)
    .then(()=>load('./v6.js?v='+VERSION))
    .then(()=>load('./v7.js?v='+VERSION))
    .then(()=>load('./v8-1.js?v='+VERSION))
    .then(()=>load('./v8-2.js?v='+VERSION))
    .then(()=>load('./v8-3.js?v='+VERSION))
    .then(()=>load('./v9-1.js?v='+VERSION))
    .then(()=>load('./v9-2.js?v='+VERSION))
    .then(()=>load('./v10-1.js?v='+VERSION))
    .then(()=>load('./v10-2.js?v='+VERSION))
    .then(()=>load('./v10-standalone.js?v='+VERSION))
    .then(()=>load('./v10-fix.js?v='+VERSION))
    .then(()=>load('./v10-4-install.js?v='+VERSION))
    .catch(err=>{
      console.error('Project Lab V10.6 loader',err);
      document.documentElement.style.overflow='';
      document.body.style.overflow='';
      document.body.style.touchAction='pan-y';
      document.body.style.pointerEvents='auto';
      const s=document.querySelector('#splash');
      if(s){s.style.pointerEvents='none';s.classList.add('hide')}
    });
})();

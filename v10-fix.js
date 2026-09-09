/* JLG Project Lab 360 — V10.5 branding/update stabilization */
(()=>{
 const VERSION='10.5.0';
 const SVG='./project-lab-logo-v10.svg?v='+VERSION;
 const $=s=>document.querySelector(s);
 function branding(){
   document.title='JLG Project Lab 360 — V10.5 Autonome';
   document.documentElement.dataset.projectLabVersion=VERSION;
   const v=$('.version-pill');if(v)v.textContent='V10.5';
   const small=$('.brand small');if(small)small.textContent='V10.5 Autonome · sans compte, sans backend';
   const eye=$('.logo-stage .eyebrow');if(eye)eye.textContent='JLG PROJECT LAB 360 · V10.5';
   document.querySelectorAll('.brand-logo,.hero-logo,.splash-card img,.logo-stage-media img,.brand-ribbon img,.dossier-brand img').forEach(img=>{
     img.removeAttribute('srcset');img.src=SVG;img.style.objectFit='contain';img.style.objectPosition='center';img.style.display='block';
   });
   let favicon=document.querySelector('link[rel="icon"]');if(favicon){favicon.type='image/svg+xml';favicon.href=SVG}
   const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+VERSION;
 }
 function removeUpdate(){document.querySelectorAll('#updateBanner').forEach(x=>x.remove())}
 const mo=new MutationObserver(()=>{removeUpdate();branding()});mo.observe(document.body,{childList:true,subtree:true});
 branding();removeUpdate();
 setTimeout(()=>{branding();removeUpdate()},250);
 setTimeout(()=>{branding();removeUpdate()},900);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v='+VERSION).then(r=>r.update()).catch(()=>{});
})();

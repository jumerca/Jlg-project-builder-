/* V10.5 Standalone loader — immediate install control + validated V5→V10 core. */
(()=>{
 const VERSION='10.5.0';
 const svg='./project-lab-logo-v10.svg?v='+VERSION;
 const $=s=>document.querySelector(s);
 // Critical UI is mounted immediately, before the long module chain.
 document.querySelectorAll('.brand-logo,.hero-logo,.splash-card img').forEach(img=>{img.src=svg;img.style.objectFit='contain';img.style.display='block'});
 const version=$('.version-pill');if(version)version.textContent='V10.5';
 const small=$('.brand small');if(small)small.textContent='V10.5 Autonome · sans compte, sans backend';
 let bar=$('#jlgInstallStaticBar');
 if(!bar){
   bar=document.createElement('div');bar.id='jlgInstallStaticBar';bar.className='no-print';
   bar.style.cssText='display:flex!important;justify-content:center;padding:8px 0 12px;position:relative;z-index:25';
   bar.innerHTML='<button id="jlgInstallHeaderBtn" class="btn primary" type="button" style="min-height:46px;border-radius:999px;padding:11px 20px">⬇ Installer l’application</button>';
   $('#tabs')?.insertAdjacentElement('afterend',bar);
 }
 let earlyPrompt=null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();earlyPrompt=e;window.__jlgInstallPrompt=e;window.dispatchEvent(new Event('jlginstallready'))});
 $('#jlgInstallHeaderBtn')?.addEventListener('click',async()=>{
   const p=window.__jlgInstallPrompt||earlyPrompt;
   if(p){try{p.prompt();await p.userChoice;earlyPrompt=null;window.__jlgInstallPrompt=null;return}catch{}}
   const ua=navigator.userAgent||'';
   if(/Android/i.test(ua)){
     const target='jumerca.github.io/Jlg-project-builder-/?v='+VERSION+'&install=1';
     const fallback=encodeURIComponent('https://'+target);
     location.href='intent://'+target+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+fallback+';end';
     return;
   }
   alert('Dans le menu du navigateur, choisis « Installer l’application » ou « Sur l’écran d’accueil ».');
 });
 const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
 load('./v5-2-core.js?v='+VERSION)
 .then(()=>load('./v6.js?v='+VERSION))
 .then(()=>load('./v6-preflight.js?v='+VERSION))
 .then(()=>load('./v7.js?v='+VERSION))
 .then(()=>load('./v8-1.js?v='+VERSION))
 .then(()=>load('./v8-2.js?v='+VERSION))
 .then(()=>load('./v8-3.js?v='+VERSION))
 .then(()=>load('./v9-1.js?v='+VERSION))
 .then(()=>load('./v9-2.js?v='+VERSION))
 .then(()=>load('./v9-preflight.js?v='+VERSION))
 .then(()=>load('./v10-1.js?v='+VERSION))
 .then(()=>load('./v10-2.js?v='+VERSION))
 .then(()=>load('./v10-preflight.js?v='+VERSION))
 .then(()=>load('./v10-standalone.js?v='+VERSION))
 .then(()=>load('./v10-fix.js?v='+VERSION))
 .then(()=>load('./v10-4-install.js?v='+VERSION))
 .catch(err=>console.error('Project Lab V10.5 loader',err));
})();
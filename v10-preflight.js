/* JLG Project Lab 360 — V10.5 preflight */
(()=>{
 const version='10.5.0';
 window.__jlgInstallPrompt=window.__jlgInstallPrompt||null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__jlgInstallPrompt=e;window.dispatchEvent(new Event('jlginstallready'))});
 document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
 const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+version;
 document.documentElement.dataset.projectLabVersion=version;
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v='+version).then(r=>r.update()).catch(()=>{});
})();

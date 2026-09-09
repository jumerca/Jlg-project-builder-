/* JLG Project Lab 360 — V10.4 install preflight */
(()=>{
 const version='10.4.0';
 const legacy=document.querySelector('#installAppBtn');
 if(legacy&&typeof legacy.onclick==='function')window.__jlgLegacyInstallClick=legacy.onclick.bind(legacy);
 window.__jlgInstallPrompt=window.__jlgInstallPrompt||null;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__jlgInstallPrompt=e;window.dispatchEvent(new Event('jlginstallready'))});
 document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
 const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+version;
 document.documentElement.dataset.projectLabVersion=version;
 const s=document.createElement('script');s.src='./v10-4-install.js?v='+version;s.async=false;document.head.appendChild(s);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v='+version).then(r=>r.update()).catch(()=>{});
})();
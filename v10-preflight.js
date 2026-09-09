/* JLG Project Lab 360 — V10.3 standalone preflight */
(()=>{
 const version='10.3.0',mark='jlg360_update_applied';
 const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+version;
 const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href='./project-lab-logo-v10-192.png?v='+version;
 const apple=document.querySelector('link[rel="apple-touch-icon"]');if(apple)apple.href='./project-lab-logo-v10-192.png?v='+version;
 document.documentElement.dataset.projectLabVersion=version;
 const old=document.querySelector('.version-pill');if(old)old.textContent='V10.3';
 if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js?v='+version).then(reg=>{reg.update();if(reg.waiting&&localStorage.getItem(mark)!==version){const banner=document.querySelector('#updateBanner');if(banner)banner.classList.remove('hidden')}}).catch(()=>{})}
})();
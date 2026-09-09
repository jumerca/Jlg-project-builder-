/* JLG Project Lab 360 — V10.1 standalone preflight */
(()=>{
  const version='10.1.0';
  const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v='+version;
  const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href='./project-lab-360-v6-192.png?v='+version;
  const apple=document.querySelector('link[rel="apple-touch-icon"]');if(apple)apple.href='./project-lab-360-v6-192.png?v='+version;
  document.documentElement.dataset.projectLabVersion=version;
  const old=$('.version-pill');if(old)old.textContent='V10.1';
  if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js?v='+version).then(reg=>{reg.update();if(reg.waiting){const banner=$('#updateBanner');if(banner)banner.classList.remove('hidden')}}).catch(()=>{})}
})();

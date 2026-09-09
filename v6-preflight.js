/* V6 PWA preflight */
(()=>{
  const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v=6.0.0';
  const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href='./project-lab-360-v6-192.png?v=6.0.0';
  const apple=document.querySelector('link[rel="apple-touch-icon"]');if(apple)apple.href='./project-lab-360-v6-192.png?v=6.0.0';
  document.querySelectorAll('.hero-logo,.brand-logo,.splash-card img').forEach(img=>{img.src=img.classList.contains('brand-logo')?'./project-lab-360-v6-192.png?v=6.0.0':'./project-lab-360-v6-512.png?v=6.0.0'});
  if(document.querySelector('#autoTestBtn')&&window.autoTestsV5)document.querySelector('#autoTestBtn').onclick=window.autoTestsV5;
  if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.update())).catch(()=>{});}
})();

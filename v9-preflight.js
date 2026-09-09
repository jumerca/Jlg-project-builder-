/* V9 Premium PWA preflight */
(()=>{
  const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href='./manifest.webmanifest?v=9.0.0';
  const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href='./project-lab-360-v6-192.png?v=9.0.0';
  const apple=document.querySelector('link[rel="apple-touch-icon"]');if(apple)apple.href='./project-lab-360-v6-192.png?v=9.0.0';
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js?v=9.0.0').then(r=>r.update()).catch(()=>{});}
})();

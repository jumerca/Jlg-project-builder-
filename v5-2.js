/* V7 loader — preserves validated V5 core, then applies V6 workflow and V7 execution. */
(()=>{
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./v5-2-core.js?v=7.0.0')
    .then(()=>load('./v6.js?v=7.0.0'))
    .then(()=>load('./v6-preflight.js?v=7.0.0'))
    .then(()=>load('./v7.js?v=7.0.0'))
    .catch(err=>{console.error('Project Lab V7 loader',err);});
})();
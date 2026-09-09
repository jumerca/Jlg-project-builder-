/* V6 loader — preserves the validated V5 core, then applies the V6 workflow layer. */
(()=>{
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./v5-2-core.js?v=6.0.0')
    .then(()=>load('./v6.js?v=6.0.0'))
    .then(()=>load('./v6-preflight.js?v=6.0.0'))
    .catch(err=>{console.error('Project Lab V6 loader',err);});
})();

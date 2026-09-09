/* V8 loader — preserves V5 core, V6 workflow, V7 execution, then adds live territory intelligence and real deliverables. */
(()=>{
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./v5-2-core.js?v=8.0.0')
    .then(()=>load('./v6.js?v=8.0.0'))
    .then(()=>load('./v6-preflight.js?v=8.0.0'))
    .then(()=>load('./v7.js?v=8.0.0'))
    .then(()=>load('./v8-1.js?v=8.0.0'))
    .then(()=>load('./v8-2.js?v=8.0.0'))
    .then(()=>load('./v8-3.js?v=8.0.0'))
    .catch(err=>{console.error('Project Lab V8 loader',err);});
})();
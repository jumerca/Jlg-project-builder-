/* V9 Premium loader — preserves validated V5 core, V6 workflow, V7 execution, V8 territory, then adds premium official intelligence and finish. */
(()=>{
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./v5-2-core.js?v=9.0.0')
    .then(()=>load('./v6.js?v=9.0.0'))
    .then(()=>load('./v6-preflight.js?v=9.0.0'))
    .then(()=>load('./v7.js?v=9.0.0'))
    .then(()=>load('./v8-1.js?v=9.0.0'))
    .then(()=>load('./v8-2.js?v=9.0.0'))
    .then(()=>load('./v8-3.js?v=9.0.0'))
    .then(()=>load('./v9-1.js?v=9.0.0'))
    .then(()=>load('./v9-2.js?v=9.0.0'))
    .then(()=>load('./v9-preflight.js?v=9.0.0'))
    .catch(err=>{console.error('Project Lab V9 loader',err);});
})();
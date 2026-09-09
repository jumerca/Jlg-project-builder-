/* V10 Final loader — preserves validated V5 core, V6 workflow, V7 execution, V8 territory, V9 premium, then adds encrypted sync and AI Studio. */
(()=>{
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  load('./v5-2-core.js?v=10.0.1')
    .then(()=>load('./v6.js?v=10.0.1'))
    .then(()=>load('./v6-preflight.js?v=10.0.1'))
    .then(()=>load('./v7.js?v=10.0.1'))
    .then(()=>load('./v8-1.js?v=10.0.1'))
    .then(()=>load('./v8-2.js?v=10.0.1'))
    .then(()=>load('./v8-3.js?v=10.0.1'))
    .then(()=>load('./v9-1.js?v=10.0.1'))
    .then(()=>load('./v9-2.js?v=10.0.1'))
    .then(()=>load('./v9-preflight.js?v=10.0.1'))
    .then(()=>load('./v10-1.js?v=10.0.1'))
    .then(()=>load('./v10-2.js?v=10.0.1'))
    .then(()=>load('./v10-preflight.js?v=10.0.1'))
    .then(()=>load('./v10-live-config.js?v=10.0.1'))
    .catch(err=>{console.error('Project Lab V10 loader',err);});
})();
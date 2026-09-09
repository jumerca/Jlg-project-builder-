const CACHE='jlg-project-lab-360-v5-20260909-1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./v4-1.js','./v4-2.js','./v4-3.js','./v4-4.js','./v4-5.js'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const req=event.request;
  event.respondWith(
    fetch(req,{cache:'no-store'}).then(resp=>{
      if(resp&&resp.ok){
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return resp;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
  );
});

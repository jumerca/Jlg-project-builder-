const CACHE='national-glory-2d-rc-v2';
const ASSETS=['./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('national-glory-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const req=event.request;
  const isPage=req.mode==='navigate'||new URL(req.url).pathname.endsWith('/index.html')||new URL(req.url).pathname.endsWith('/national-glory/');
  if(isPage){
    event.respondWith(fetch(req).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return resp}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return resp})));
});
/* TV Network Tycoon Studio Edition V1.3 — cache de l'application, sans stockage des sauvegardes */
const CACHE='tvnetwork-studio-v130-render';
const CORE=['/','/index.html','/manifest.webmanifest','/icons/icon-192.svg','/icons/icon-512.svg','/icons/icon-maskable.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tvnetwork-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/',clone)));}return response;}).catch(async()=>await caches.match('/')||await caches.match('/index.html')||Response.error()));return;}
event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,clone)));}return response;})));
});
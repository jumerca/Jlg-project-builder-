/* TV Network Tycoon V1.7 — cache d'interface, sauvegardes laissées au navigateur */
const CACHE='tvnetwork-studio-v180-prod-recruit-season';
const CORE=['/','/index.html','/manifest.webmanifest','/icons/icon-192-v172.svg','/icons/icon-512-v172.svg','/icons/icon-maskable-v172.svg','/icons/logo-v172.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tvnetwork-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/',clone)));}return response;}).catch(async()=>await caches.match('/')||await caches.match('/index.html')||Response.error()));return;}
event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,clone)));}return response;})));
});
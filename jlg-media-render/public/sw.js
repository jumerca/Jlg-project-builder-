'use strict';
const VERSION='jlg-media-assets-v12';
const ASSETS=['/icon.svg','/icon-192.png','/icon-512.png','/style.css?v=012','/frontpage.css?v=012','/site-rebrand.css?v=012'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('jlg-media-assets-')&&x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;if(!['/icon.svg','/icon-192.png','/icon-512.png','/style.css','/frontpage.css','/site-rebrand.css'].includes(url.pathname))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(event.request)));});

/* Camping Tycoon — cache hors ligne */
const CACHE = 'camping-tycoon-v1.3.0';
const FILES = ['./', './index.html', './style.css', './manifest.webmanifest', './src/data.js', './src/sim.js', './src/save.js', './src/audio.js', './src/render.js', './src/ui.js',
  './assets/logo.svg', './assets/logo-mark.svg', './assets/icon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png', './assets/favicon-32.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});

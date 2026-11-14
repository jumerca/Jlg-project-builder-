/* Musée & Expéditions — service worker : le jeu fonctionne hors ligne une fois installé. */
const CACHE = 'musee-expeditions-v3';
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/core.js",
  "js/data.js",
  "js/objects.js",
  "js/state.js",
  "js/expeditions.js",
  "js/conservation.js",
  "js/exhibitions.js",
  "js/visitors.js",
  "js/finances.js",
  "js/sim.js",
  "js/art.js",
  "js/render.js",
  "js/gl3d.js",
  "js/scene3d.js",
  "js/ui.js",
  "js/main.js",
  "icons/logo.svg",
  "icons/logotype.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    // polices Google : réseau d'abord, copie de secours
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // fichiers du jeu : cache d'abord, puis mise à jour en arrière-plan
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});

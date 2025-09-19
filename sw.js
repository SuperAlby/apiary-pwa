// Cambia il numero di versione ad ogni deploy
const CACHE_VERSION = 'v2'; // <--- incrementa quando vuoi forzare update
const CACHE_NAME = `apiary-pwa-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/db.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precarica asset
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: elimina le vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first con fallback cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req).then(networkRes => {
      // aggiorna la cache in background
      const copy = networkRes.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return networkRes;
    }).catch(() => caches.match(req))
  );
});

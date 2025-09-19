const CACHE = 'apiary-pwa-v1';
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

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

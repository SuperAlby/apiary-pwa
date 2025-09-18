const CACHE = 'apiary-pwa-v2'; // Ho incrementato la versione della cache
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/db.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Rimuovi le vecchie cache
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});


self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  // Strategia: Cache first, poi network
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).then(networkResponse => {
          // Opzionale: aggiungi la nuova risorsa alla cache
          const copy = networkResponse.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return networkResponse;
      });
    })
  );
});

/**
 * Service Worker pour le support hors-ligne de CNED Sven
 */

const CACHE_NAME = 'cned-sven-cache-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/vendor/chart.umd.min.js',
  './js/data.js',
  './js/charts.js',
  './js/firebase-config.js',
  './js/auth.js',
  './js/sync.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes Firebase / Google gstatic pour les laisser en réseau
  if (event.request.url.includes('firestore') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retourner le cache et mettre à jour en arrière-plan (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

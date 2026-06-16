// Service Worker — Piscine Cuvier PWA
const CACHE_NAME = 'piscine-cuvier-v1';
const URLS_TO_CACHE = [
  './piscine.html',
  './manifest.json'
];

// Installation — mise en cache des fichiers
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache first pour les fichiers locaux, network first pour l'API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API Anthropic et Open-Meteo → toujours réseau
  if (url.hostname.includes('anthropic.com') || url.hostname.includes('open-meteo.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Fichiers locaux → cache first, puis réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Met en cache les nouvelles ressources locales
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Hors ligne', { status: 503 }));
    })
  );
});

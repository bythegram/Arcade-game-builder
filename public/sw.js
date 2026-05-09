const CACHE_NAME = 'dragons-twilight-v2';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './images/pwa-192.png', './images/pwa-512.png'];

async function collectBuildAssets() {
  const response = await fetch('./index.html', {cache: 'no-store'});
  const html = await response.text();
  const matches = [...html.matchAll(/(?:src|href)="([^"]+)"/g)];

  return matches
    .map((match) => match[1])
    .filter((asset) => !asset.startsWith('http') && !asset.startsWith('data:'))
    .map((asset) => new URL(asset, self.registration.scope).pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const buildAssets = await collectBuildAssets().catch(() => []);
      const assetsToCache = [...new Set([...CORE_ASSETS, ...buildAssets])];
      await cache.addAll(assetsToCache);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});

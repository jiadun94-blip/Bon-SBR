const CACHE_NAME = 'sbr-monitoring-shell-v2';
const APP_URL = new URL('./monitoring_kendaraan.html', self.location.href).href;
const APP_ASSETS = [
  APP_URL,
  new URL('./manifest-monitoring.json', self.location.href).href,
  new URL('./icon-monitoring-192.png', self.location.href).href,
  new URL('./icon-monitoring-512.png', self.location.href).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('sbr-monitoring-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Hanya tangani halaman aplikasi dan aset PWA; jangan meng-cache API pihak ketiga.
  const isAppAsset = APP_ASSETS.includes(url.href);
  if (!isAppAsset) return;

  if (request.mode === 'navigate' || url.href === APP_URL) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(APP_URL, copy));
        }
        return response;
      }).catch(() => caches.match(APP_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});

const CACHE_NAME = 'sbr-monitoring-shell-v3';
const APP_URL = new URL('./monitoring_kendaraan.html', self.location.href).href;
const APP_BASE_URL = APP_URL.split('?')[0].split('#')[0];
const APP_ASSETS = [
  APP_URL,
  new URL('./manifest-monitoring.json', self.location.href).href,
  new URL('./icon-monitoring-192.png', self.location.href).href,
  new URL('./icon-monitoring-512.png', self.location.href).href
];
const APP_ASSET_SET = new Set(APP_ASSETS.map(u => u.split('?')[0].split('#')[0]));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        APP_ASSETS.map(async assetUrl => {
          const response = await fetch(new Request(assetUrl, { cache: 'reload' }));
          if (response && response.ok) {
            await cache.put(assetUrl, response);
          }
        })
      ))
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

  // Biarkan pengecekan versi (autoCheckAppBuild) langsung ke jaringan tanpa cache SW.
  if (url.searchParams.has('__build_check')) return;

  // Hanya tangani halaman aplikasi dan aset PWA; jangan meng-cache API pihak ketiga.
  const normalizedUrl = url.origin + url.pathname;
  if (!APP_ASSET_SET.has(normalizedUrl)) return;

  if (request.mode === 'navigate' || normalizedUrl === APP_BASE_URL) {
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME)
                .then(cache => cache.put(APP_URL, copy))
                .catch(() => {})
            );
          }
          return response;
        })
        .catch(() => caches.match(APP_URL).then(cached => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(normalizedUrl).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.put(normalizedUrl, copy))
            .catch(() => {})
        );
      }
      return response;
    }))
  );
});

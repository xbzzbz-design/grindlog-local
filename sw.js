const CACHE = 'thegrind-v3';

const LOCAL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// CDN scripts the app needs to run — cached at install so the app works offline
const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Local files — always works
    await cache.addAll(LOCAL);

    // CDN files — fetch with CORS so responses aren't opaque and can be reused
    await Promise.all(CDN.map(url =>
      fetch(new Request(url, { mode: 'cors', credentials: 'omit' }))
        .then(res => { if (res.ok) return cache.put(url, res); })
        .catch(() => {}) // don't abort install if offline during first install
    ));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Remove old caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith((async () => {
    // 1. Cache hit — return immediately (works offline)
    const cached = await caches.match(e.request, { ignoreSearch: false });
    if (cached) return cached;

    // 2. Network — fetch, cache for next time, return
    try {
      const res = await fetch(e.request.clone());
      if (res && res.status === 200) {
        const cache = await caches.open(CACHE);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch {
      // 3. Offline and not cached — fall back to app shell for navigation
      if (e.request.destination === 'document') {
        return caches.match('./index.html');
      }
    }
  })());
});

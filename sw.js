const CACHE = 'thegrind-v20';

const LOCAL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL);
    await Promise.all(CDN.map(url =>
      fetch(new Request(url, { mode: 'cors', credentials: 'omit' }))
        .then(res => { if (res.ok) return cache.put(url, res); })
        .catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isHTML = e.request.destination === 'document'
    || url.pathname === '/'
    || url.pathname.endsWith('.html');

  // Network-first for local HTML — ได้ code ใหม่ทันทีทุกครั้งที่ deploy
  if (isLocal && isHTML) {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(e.request, res.clone());
        }
        return res;
      } catch {
        return caches.match(e.request) || caches.match('./index.html');
      }
    })());
    return;
  }

  // Cache-first สำหรับ CDN scripts และ assets อื่นๆ
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: false });
    if (cached) return cached;

    try {
      const res = await fetch(e.request.clone());
      if (res && res.status === 200) {
        const cache = await caches.open(CACHE);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch {
      if (e.request.destination === 'document') {
        return caches.match('./index.html');
      }
    }
  })());
});

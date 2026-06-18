const VERSION = "2026.06.18.3";
const APP_SCOPE = "/grindlog-local/";
const CACHE_MARKERS = [APP_SCOPE, "grindlog"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => CACHE_MARKERS.some((marker) => key.toLowerCase().includes(marker)))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(clients.map((client) => {
      if (!client.url.includes(APP_SCOPE)) return undefined;
      return client.navigate(client.url).catch(() => undefined);
    }));
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});

// Service worker for Saverly — offline-first via stale-while-revalidate.
// Bump the cache version when you ship breaking changes to assets.
const CACHE_NAME = "saverly-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./app.html",
  "./landing.css",
  "./privacy.html",
  "./styles.css",
  "./app.js",
  "./i18n.js",
  "./manifest.webmanifest",
  "./logo-light.png",
  "./logo-dark.png",
  "./icon.svg",
  "./favicon-32.png",
  "./favicon-16.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Network-first: try to fetch fresh, fall back to cache when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./app.html")))
  );
});

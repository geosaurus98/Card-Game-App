/* Service worker for Card Game Rulebook.
 *
 * Bump CACHE_VERSION whenever you change ANY file (including games.json)
 * so installed copies pick up the new content on their next visit.
 */
const CACHE_VERSION = 'v1.2.1';
const CACHE_NAME = `card-rules-${CACHE_VERSION}`;

// Every file the app needs to run offline. Paths are relative to this file,
// so the app works from a GitHub Pages subpath (https://user.github.io/repo/).
const PRECACHE = [
  './',
  './index.html',
  './games.json',
  './manifest.webmanifest',
  './css/styles.css',
  './js/storage.js',
  './js/data.js',
  './js/scorekeeper.js',
  './js/picker.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' bypasses the browser HTTP cache so a new version
      // never precaches stale files (GitHub Pages sets max-age=600).
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Do not skipWaiting automatically: the page shows an "Update available"
  // banner and asks us to activate (see SKIP_WAITING below).
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('card-rules-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App-shell navigation. Routing happens in the URL hash, so the app root
  // (and index.html) are served from the cache. Any other page inside the
  // scope is tried on the network and, when offline, redirected to the root
  // so relative asset paths still resolve.
  if (req.mode === 'navigate') {
    const scopePath = new URL(self.registration.scope).pathname;
    const isShell = url.pathname === scopePath || url.pathname === scopePath + 'index.html';
    event.respondWith(
      isShell
        ? caches.match('./index.html').then((cached) => cached || fetch(req))
        : fetch(req).catch(() => Response.redirect(self.registration.scope, 302))
    );
    return;
  }

  // Cache-first for everything else, falling back to the network and
  // caching any same-origin extras we did not precache.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

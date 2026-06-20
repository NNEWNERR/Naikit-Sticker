/*
 * Self-destroying service worker.
 *
 * The previous v1 app (Ionic / Angular PWA) registered a service worker on this
 * origin. v2 ships NO service worker, but the old one stays active in browsers
 * that visited v1 — serving a stale, cached app shell + CSS over the v2 build
 * (the "login looks broken on production" symptom).
 *
 * This script is deployed at every common SW path so the zombie worker, on its
 * next update check, fetches THIS file, installs it, then deletes all caches
 * and unregisters itself — reloading any open tab onto the live v2 build.
 * Browsers that never registered a SW never fetch this and are unaffected.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    } catch (e) {
      // best-effort cleanup; nothing actionable on failure
    }
  })());
});

// Service worker til Kørselsregnskab
// - Cacher kun appens egne filer (skallen), så appen kan åbne uden net.
// - Rører ALDRIG kald til andre adresser (Apps Script, vejr): de går altid direkte på nettet.
// - Network-first: du får altid den nyeste version, når der er net.
// Ændr CACHE-navnet, hvis du vil tvinge en ren start.
var CACHE = 'kr-v1';
var SKAL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SKAL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (navne) {
      return Promise.all(navne.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Apps Script, vejr m.m.: ikke vores sag
  e.respondWith(
    fetch(req).then(function (svar) {
      if (svar && svar.ok) {
        var kopi = svar.clone();
        caches.open(CACHE).then(function (c) { c.put(req, kopi); });
      }
      return svar;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
      });
    })
  );
});

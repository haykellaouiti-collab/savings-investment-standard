/* service worker : reseau d'abord pour les pages, cache pour les ressources statiques */
var V = 'epargne-v2';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('/api/') === 0 || u.pathname.indexOf('/members') === 0) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(function (res) { var c = res.clone(); caches.open(V).then(function (ca) { ca.put(r, c); }); return res; }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('/'); }); })); return; }
  e.respondWith(caches.match(r).then(function (m) { var n = fetch(r).then(function (res) { var c = res.clone(); caches.open(V).then(function (ca) { ca.put(r, c); }); return res; }).catch(function () { return m; }); return m || n; }));
});

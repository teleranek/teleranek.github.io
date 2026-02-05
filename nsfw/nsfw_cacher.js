var cacheName = 'nsfw_cache';
var filesToCache = [
/*  '/index.js', <= cache this only in prod*/
  '/model/model.json',
  '/model/group1-shard1of6',
  '/model/group1-shard2of6',
  '/model/group1-shard3of6',
  '/model/group1-shard4of6',
  '/model/group1-shard5of6',
  '/model/group1-shard6of6'
];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});
self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(response => {
      return response || fetch(event.request);
    })
  );
});
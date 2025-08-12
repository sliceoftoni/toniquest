self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('tq-v3').then(c => c.addAll(['./','./index.html','./style.css','./app.js','./data/stops.json'])));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});

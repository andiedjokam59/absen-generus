const CACHE_NAME = 'presensi-iq-v2';
const assets = [
  './',
  './index.html',
  './manifest.json',
  './logo-baru.jpg'
];

// Pasang Service Worker dan simpan aset ke memori cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Aktifkan Service Worker dan hapus cache versi lama jika ada
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Strategi Fetch: Ambil dari internet dulu, jika offline ambil dari cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

const CACHE_NAME = 'absensi-generus-v1';
const ASSETS = [
  './',
  './index.html',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Pasang aplikasi di penyimpanan lokal HP (cache)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Menampilkan halaman web dari cache ketika tidak ada sinyal internet
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});